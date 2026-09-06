#!/usr/bin/env node
/**
 * Liveness check for every URL in the dataset.
 *
 * Every stale launch list dies the same way: half the links 404 and nobody
 * notices. This runs weekly in CI and opens an issue when something breaks.
 *
 * Usage:
 *   node scripts/check-links.mjs              # human-readable report
 *   node scripts/check-links.mjs --markdown   # markdown, for an issue body
 *
 * Exit code is 1 if any URL is broken, so CI can gate on it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { directories } = JSON.parse(readFileSync(join(root, 'data', 'directories.json'), 'utf8'));

const TIMEOUT_MS = 20_000;
const CONCURRENCY = 6; // Polite: these are small indie sites, not CDNs.
const UA = 'awesome-startup-launch-directories-linkcheck/1.0 (+https://github.com/mukund1158/awesome-startup-launch-directories)';

/**
 * Some hosts reject HEAD outright, so a failed HEAD is retried as a ranged GET
 * before the URL is called broken. Redirects are followed and reported, since a
 * directory that now redirects elsewhere usually means it was acquired or died.
 */
async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': UA, ...(method === 'GET' ? { range: 'bytes=0-2048' } : {}) },
      });
      clearTimeout(timer);
      if (!res.ok && method === 'HEAD') continue; // retry as GET
      return {
        ok: res.ok,
        status: res.status,
        finalUrl: res.url,
        redirected: new URL(res.url).host.replace(/^www\./, '') !== new URL(url).host.replace(/^www\./, ''),
      };
    } catch (err) {
      clearTimeout(timer);
      if (method === 'GET') {
        return { ok: false, status: 0, error: err.name === 'AbortError' ? 'timeout' : err.message };
      }
    }
  }
  return { ok: false, status: 0, error: 'unreachable' };
}

/** Run tasks with a fixed worker pool so we never hammer a host. */
async function pool(items, limit, fn) {
  const results = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const targets = directories.filter((d) => d.url);
const results = await pool(targets, CONCURRENCY, async (d) => ({ ...d, ...(await probe(d.url)) }));

/**
 * 403/429/503 mean a bot shield answered, not that the site is gone — several
 * of these directories sit behind Cloudflare. Counting those as broken would
 * make the weekly job cry wolf until people ignore it, so they are reported
 * separately and never fail the build.
 */
const BOT_SHIELD = new Set([401, 403, 429, 503]);
const blocked = results.filter((r) => !r.ok && BOT_SHIELD.has(r.status));
const broken = results.filter((r) => !r.ok && !BOT_SHIELD.has(r.status));
const moved = results.filter((r) => r.ok && r.redirected);

if (process.argv.includes('--markdown')) {
  const lines = [`Automated weekly check of ${targets.length} URLs on ${new Date().toISOString().slice(0, 10)}.`, ''];
  if (broken.length) {
    lines.push(`### Broken (${broken.length})`, '', '| Directory | URL | Result |', '|---|---|---|');
    for (const r of broken) lines.push(`| ${r.name} | ${r.url} | ${r.error ?? `HTTP ${r.status}`} |`);
    lines.push('');
  }
  if (blocked.length) {
    lines.push(
      `### Blocked by bot protection (${blocked.length})`,
      '',
      'Not necessarily broken — verify by hand in a browser.',
      '',
      '| Directory | URL | Result |',
      '|---|---|---|',
    );
    for (const r of blocked) lines.push(`| ${r.name} | ${r.url} | HTTP ${r.status} |`);
    lines.push('');
  }
  if (moved.length) {
    lines.push(`### Redirecting to another domain (${moved.length})`, '', '| Directory | From | Now resolves to |', '|---|---|---|');
    for (const r of moved) lines.push(`| ${r.name} | ${r.url} | ${r.finalUrl} |`);
    lines.push('', 'A cross-domain redirect usually means the site was sold, rebranded, or parked. Worth a look before anyone pays for a listing.');
  }
  lines.push('', '---', '', 'Opened automatically by `.github/workflows/link-check.yml`. Close it once the dataset is corrected.');
  const body = lines.join('\n');
  writeFileSync(join(root, 'link-report.md'), body);
  console.log(body);
} else {
  for (const r of results) {
    const mark = r.ok ? (r.redirected ? '~' : '✓') : BOT_SHIELD.has(r.status) ? '?' : '✗';
    console.log(`${mark} ${String(r.status || '---').padEnd(3)} ${r.name}${r.redirected ? ` → ${r.finalUrl}` : ''}${r.error ? ` (${r.error})` : ''}`);
  }
  console.log(
    `\n${results.length - broken.length - blocked.length}/${results.length} reachable · ` +
      `${broken.length} broken · ${blocked.length} bot-shielded · ${moved.length} redirecting off-domain`,
  );
}

process.exit(broken.length ? 1 : 0);
