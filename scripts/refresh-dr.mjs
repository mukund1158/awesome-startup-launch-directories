#!/usr/bin/env node
/**
 * Refreshes every entry's Domain Rating from Ahrefs' free DR endpoint:
 *   GET https://api.ahrefs.com/v3/public/domain-rating-free?target=<domain>
 * https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free
 *
 * Requests are free but need an APIv3 key from a (free) Ahrefs account. The
 * key is read from the AHREFS_API_KEY environment variable and is never
 * printed or written anywhere.
 *
 * The data is under Ahrefs' Domain Rating License, which requires the
 * attribution "Domain Rating by Ahrefs" linked to https://ahrefs.com/. The
 * README carries it; keep it there if you publish these numbers elsewhere.
 *
 * Usage:
 *   AHREFS_API_KEY=... node scripts/refresh-dr.mjs          # dry run: print old -> new
 *   AHREFS_API_KEY=... node scripts/refresh-dr.mjs --write  # update data/directories.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data', 'directories.json');

const ENDPOINT = 'https://api.ahrefs.com/v3/public/domain-rating-free';
const TIMEOUT_MS = 20_000;
// Rate limits are not documented, so go one at a time with a pause, and back
// off on 429 rather than hammering a free endpoint.
const DELAY_MS = 1_000;
const MAX_RETRIES = 3;

const key = process.env.AHREFS_API_KEY?.trim();
if (!key) {
  console.error('AHREFS_API_KEY is not set. Generate a free key in Ahrefs: Account settings > API keys.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ahrefs takes a bare domain; strip scheme, "www." and path. */
const domainOf = (url) => new URL(url).host.replace(/^www\./, '');

async function fetchDr(domain) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${ENDPOINT}?target=${encodeURIComponent(domain)}`, {
        signal: controller.signal,
        headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      });
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const wait = Number(res.headers.get('retry-after')) * 1000 || 2 ** attempt * 5_000;
        console.error(`  429 on ${domain}, retrying in ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      // Auth failures apply to every request, so stop instead of failing 25 times.
      if (res.status === 401 || res.status === 403) {
        console.error(`Ahrefs rejected the API key (HTTP ${res.status}). Check AHREFS_API_KEY.`);
        process.exit(2);
      }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const body = await res.json();
      const dr = body?.domain_rating?.domain_rating;
      if (typeof dr !== 'number' || !Number.isFinite(dr)) return { error: 'unexpected response shape' };
      return { dr };
    } catch (err) {
      if (attempt === MAX_RETRIES) return { error: err.name === 'AbortError' ? 'timeout' : err.message };
      await sleep(2 ** attempt * 2_000);
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: 'gave up after retries' };
}

const doc = JSON.parse(readFileSync(dataPath, 'utf8'));
const results = [];

for (const d of doc.directories) {
  if (!d.url) {
    results.push({ name: d.name, skip: 'no url' });
    continue;
  }
  const domain = domainOf(d.url);
  const r = await fetchDr(domain);
  // The dataset stores DR as an integer, matching how Ahrefs displays it.
  results.push({ name: d.name, domain, old: d.dr, ...(r.error ? r : { dr: Math.round(r.dr), raw: r.dr }) });
  await sleep(DELAY_MS);
}

for (const r of results) {
  if (r.skip) { console.log(`-   ${r.name.padEnd(24)} skipped (${r.skip})`); continue; }
  if (r.error) { console.log(`!   ${r.name.padEnd(24)} ${r.domain}: ${r.error}`); continue; }
  const delta = r.old == null ? 'new' : r.dr - r.old;
  const mark = delta === 0 ? '=' : '*';
  console.log(`${mark}   ${r.name.padEnd(24)} ${String(r.old ?? '-').padStart(3)} -> ${String(r.dr).padStart(3)}  (${delta === 0 ? 'same' : delta === 'new' ? 'new' : (delta > 0 ? '+' : '') + delta}, raw ${r.raw})`);
}

const failed = results.filter((r) => r.error);
const changed = results.filter((r) => r.dr != null && r.dr !== r.old);
console.log(`\n${results.length} entries · ${changed.length} changed · ${failed.length} failed`);

if (process.argv.includes('--write')) {
  // Only write when every lookup succeeded: a partial refresh would stamp
  // lastUpdated on numbers that were never actually refreshed.
  if (failed.length) {
    console.error('Not writing: some lookups failed. Re-run once they succeed.');
    process.exit(1);
  }
  for (const r of results) {
    if (r.dr == null) continue;
    doc.directories.find((d) => d.name === r.name).dr = r.dr;
  }
  doc.meta.lastUpdated = new Date().toISOString().slice(0, 10);
  doc.meta.drSource = 'Ahrefs Domain Rating via the free domain-rating-free API (point-in-time snapshot)';
  writeFileSync(dataPath, JSON.stringify(doc, null, 2) + '\n');
  console.log('Wrote data/directories.json. Now run: node scripts/generate.mjs');
}
