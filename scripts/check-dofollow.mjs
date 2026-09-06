#!/usr/bin/env node
/**
 * Determines whether a directory's outbound links to listed products are
 * dofollow or nofollow.
 *
 * This is the number buyers most need and never get: a DR 74 directory that
 * puts rel="nofollow" on every listing passes no link equity at all, so the
 * only thing your $39 buys is referral traffic. DR alone can't tell you that.
 *
 * Method (deliberately conservative):
 *   1. Fetch the directory homepage.
 *   2. Find same-host URLs that look like individual listing pages.
 *   3. Fetch a few, and inspect anchors pointing at third-party domains.
 *   4. Classify by the rel attribute; social/infra domains are ignored.
 *
 * Anything inconclusive is reported as "unknown" rather than guessed at. Many
 * of these sites render listings client-side, so unknown is a common and
 * honest answer. Every verdict carries the page it was derived from so a
 * reader can check the claim.
 *
 * Usage: node scripts/check-dofollow.mjs [--json out.json] [--only "Name"]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { directories } = JSON.parse(readFileSync(join(root, 'data', 'directories.json'), 'utf8'));

const TIMEOUT_MS = 25_000;
const MAX_LISTING_PAGES = 8; // per directory - small samples flip verdicts between runs
const UA = 'Mozilla/5.0 (compatible; launch-directories-audit/1.0; +https://github.com/mukund1158/awesome-startup-launch-directories)';

/** Paths that typically identify a single product/listing page. */
const LISTING_PATH = /\/(products?|tools?|projects?|startups?|apps?|launch(es)?|items?|posts?|listings?|p|s|t)\/[\w%-]{2,}/i;

/** Links to these are never the "listed product" link, so they can't be evidence. */
const IGNORED_HOSTS = [
  'twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'youtube.com',
  'github.com', 'discord.com', 'discord.gg', 'reddit.com', 'producthunt.com', 't.me',
  'google.com', 'gstatic.com', 'googleapis.com', 'gravatar.com', 'cloudflare.com',
  'vercel.com', 'netlify.com', 'stripe.com', 'paypal.com', 'buymeacoffee.com',
  'mailto', 'medium.com', 'substack.com', 'bsky.app', 'threads.net',
];

const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return null; } };
const isIgnored = (host) => IGNORED_HOSTS.some((h) => host === h || host.endsWith('.' + h));

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) return { error: `non-HTML (${ct.split(';')[0]})` };
    return { html: await res.text(), finalUrl: res.url };
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract `<a>` tags as {href, rel, text}. Regex is adequate here and keeps
 * this dependency-free; the inner text is what lets us pick out the CTA.
 */
function anchors(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = m[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith('#')) continue;
    const rel = (attrs.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] ?? '').toLowerCase();
    const text = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    let abs;
    try { abs = new URL(href, baseUrl).toString(); } catch { continue; }
    if (!abs.startsWith('http')) continue;
    out.push({ href: abs, rel, text });
  }
  return out;
}

/**
 * The "visit the product" call-to-action on a listing page. Only this link's
 * rel attribute answers the question people actually care about - averaging
 * every outbound link on the page mixes in footer sponsors, ads and the site's
 * own social links, which is how you end up publishing a confident wrong
 * answer. Anchor text that is a bare domain counts too: plenty of directories
 * render the product link as "example.com".
 */
const CTA_TEXT = /^(visit|open|try|launch|go to|view|check(\s+it)?\s*out|get\s+started|website|homepage|site|link)\b/i;
const looksLikeDomain = (t) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/?$/i.test(t);
const isCta = (a) => CTA_TEXT.test(a.text) || looksLikeDomain(a.text) || /\b(visit|website|external|cta)\b/i.test(a.rel);

async function audit(dir) {
  const home = await get(dir.url);
  if (home.error) return { name: dir.name, verdict: 'unknown', reason: `homepage ${home.error}` };

  const selfHost = hostOf(home.finalUrl);
  const all = anchors(home.html, home.finalUrl);

  // Candidate listing pages, most-specific paths first.
  const candidates = [...new Set(
    all.map((a) => a.href).filter((h) => hostOf(h) === selfHost && LISTING_PATH.test(new URL(h).pathname)),
  )].slice(0, MAX_LISTING_PAGES);

  if (!candidates.length) {
    return {
      name: dir.name,
      verdict: 'unknown',
      reason: 'no individual listing pages found in the served HTML (likely client-rendered)',
    };
  }

  // One sample per listing page: the CTA that points at the listed product.
  const samples = [];
  for (const page of candidates) {
    const res = await get(page);
    if (res.error) continue;
    const outbound = anchors(res.html, res.finalUrl ?? page).filter((a) => {
      const h = hostOf(a.href);
      return h && h !== selfHost && !isIgnored(h);
    });
    const cta = outbound.find(isCta);
    if (!cta) continue;
    samples.push({
      page,
      target: cta.href,
      anchorText: cta.text,
      rel: cta.rel || '(none)',
      nofollowed: /\b(nofollow|ugc|sponsored)\b/.test(cta.rel),
    });
  }

  if (!samples.length) {
    return {
      name: dir.name,
      verdict: 'unknown',
      reason: 'listing pages found, but no product CTA link in the served HTML (likely client-rendered)',
    };
  }

  const nofollowed = samples.filter((s) => s.nofollowed).length;
  const verdict = nofollowed === 0 ? 'dofollow' : nofollowed === samples.length ? 'nofollow' : 'mixed';
  const evidence = samples.find((s) => (verdict === 'nofollow' ? s.nofollowed : !s.nofollowed)) ?? samples[0];

  return {
    name: dir.name,
    verdict,
    sampled: samples.length,
    nofollowed,
    evidencePage: evidence.page,
    exampleTarget: evidence.target,
    exampleAnchor: evidence.anchorText,
    exampleRel: evidence.rel,
  };
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const targets = directories.filter((d) => d.url && d.status === 'active' && (!only || d.name === only));

const results = [];
for (const d of targets) {
  const r = await audit(d);
  results.push(r);
  const detail = r.verdict === 'unknown' ? r.reason : `${r.nofollowed}/${r.sampled} CTAs nofollowed · rel="${r.exampleRel}" · "${r.exampleAnchor}"`;
  console.log(`${r.verdict.padEnd(8)} ${d.name.padEnd(22)} ${detail}`);
}

const tally = results.reduce((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});
console.log(`\n${targets.length} audited -`, tally);

const jsonFlag = process.argv.indexOf('--json');
if (jsonFlag !== -1) {
  writeFileSync(process.argv[jsonFlag + 1], JSON.stringify(results, null, 2));
}

/**
 * `--write` folds the verdicts back into the dataset. Only conclusive results
 * are written; an inconclusive run leaves any existing verdict alone rather
 * than overwriting a hand-verified value with a null.
 */
if (process.argv.includes('--write')) {
  const dataPath = join(root, 'data', 'directories.json');
  const doc = JSON.parse(readFileSync(dataPath, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  let written = 0;

  for (const r of results) {
    if (r.verdict === 'unknown') continue;
    const entry = doc.directories.find((d) => d.name === r.name);
    if (!entry) continue;
    entry.linkPolicy = r.verdict;
    // The ratio matters for "mixed": 6/8 nofollowed reads very differently
    // from 1/8, and it hints at a free-vs-paid tier split.
    entry.linkPolicySample = `${r.nofollowed}/${r.sampled}`;
    entry.linkPolicyEvidence = r.evidencePage;
    entry.linkPolicyCheckedOn = today;
    written++;
  }

  doc.meta.linkPolicyCheckedOn = today;
  writeFileSync(dataPath, JSON.stringify(doc, null, 2) + '\n');
  console.log(`Wrote ${written} link-policy verdicts into data/directories.json.`);
}
