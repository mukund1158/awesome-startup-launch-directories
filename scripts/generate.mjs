#!/usr/bin/env node
/**
 * Regenerates the tables + stats in README.md from data/directories.json.
 *
 * The README is the human-facing artifact, but data/directories.json is the
 * source of truth. Contributors only ever edit the JSON; CI (and this script)
 * keeps the README in sync so the two can never drift.
 *
 * Usage:
 *   node scripts/generate.mjs           # rewrite README.md in place
 *   node scripts/generate.mjs --check   # exit 1 if README is stale (used in CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data', 'directories.json');
const readmePath = join(root, 'README.md');

const { meta, directories } = JSON.parse(readFileSync(dataPath, 'utf8'));

/** Format a USD amount the way the directory itself advertises it. */
const price = (d) => (d.priceUsd === 0 ? 'Free' : `$${d.priceUsd.toFixed(2).replace(/\.00$/, '')}`);

/**
 * "DR per dollar" - a rough cost-efficiency score so you can spend a small
 * budget on the highest-authority placements first. Free listings have no
 * meaningful ratio, so they are marked separately rather than as Infinity.
 */
const value = (d) => {
  if (d.dr == null) return '-';
  if (d.priceUsd === 0) return '∞';
  return (d.dr / d.priceUsd).toFixed(1);
};

const link = (d) => (d.url ? `[${d.name}](${d.url})` : d.name);

/**
 * How the directory marks up its outbound link to the listed product.
 * `mixed` carries its ratio because 6/8 nofollowed and 1/8 nofollowed are
 * completely different purchases. Measured by scripts/check-dofollow.mjs.
 */
const linkPolicy = (d) => {
  if (!d.linkPolicy) return '-';
  if (d.linkPolicy === 'mixed') return `mixed (${d.linkPolicySample})`;
  return d.linkPolicy;
};

const byDr = (a, b) => (b.dr ?? -1) - (a.dr ?? -1);

const active = directories.filter((d) => d.status === 'active').sort(byDr);
const skipped = directories.filter((d) => d.status === 'skipped').sort(byDr);

const row = (d, i) =>
  `| ${i + 1} | ${link(d)} | ${d.dr ?? '-'} | ${price(d)} | ${value(d)} | ${linkPolicy(d)} | ${d.notes ?? ''} |`;

const activeTable = [
  '| # | Directory | DR | Price | DR / $ | Links | Notes |',
  '|---|-----------|---:|------:|-------:|-------|-------|',
  ...active.map(row),
].join('\n');

const skippedTable = [
  '| Directory | DR | Price | Why it was skipped |',
  '|-----------|---:|------:|--------------------|',
  ...skipped.map((d) => `| ${link(d)} | ${d.dr ?? '-'} | ${price(d)} | ${d.notes ?? ''} |`),
].join('\n');

const paid = active.filter((d) => d.priceUsd > 0);
const free = active.filter((d) => d.priceUsd === 0);
const totalCost = paid.reduce((sum, d) => sum + d.priceUsd, 0);
const highDr = active.filter((d) => (d.dr ?? 0) >= 70);
// Free listings are trivially the cheapest, so this highlights the best paid buy.
const cheapestHighDr = highDr.filter((d) => d.priceUsd > 0).sort((a, b) => a.priceUsd - b.priceUsd)[0];

const measured = active.filter((d) => d.linkPolicy);
const doFollow = measured.filter((d) => d.linkPolicy === 'dofollow');
const noFollow = measured.filter((d) => d.linkPolicy === 'nofollow');

const stats = [
  `- **${active.length}** directories listed (**${free.length}** free, **${paid.length}** paid)`,
  `- **${highDr.length}** of them are **DR 70+**`,
  `- Submitting to every paid listing here costs **$${totalCost.toFixed(2)}** total`,
  cheapestHighDr
    ? `- Cheapest **paid** DR 70+ placement: ${link(cheapestHighDr)} at **${price(cheapestHighDr)}** (DR ${cheapestHighDr.dr})`
    : null,
  `- Outbound link policy measured on **${measured.length}** of them: **${doFollow.length} dofollow**, **${noFollow.length} nofollow**, **${measured.length - doFollow.length - noFollow.length} mixed**`,
  `- DR figures last refreshed **${meta.lastUpdated}**${meta.linkPolicyCheckedOn ? `; link policy **${meta.linkPolicyCheckedOn}**` : ''}`,
].filter(Boolean).join('\n');

/**
 * Replace the content between `<!-- BEGIN:x -->` and `<!-- END:x -->`.
 * A function replacer is required: the generated body contains `$` (prices),
 * which a string replacement would treat as regex backreferences.
 */
function fill(md, key, body) {
  const begin = `<!-- BEGIN:${key} -->`;
  const end = `<!-- END:${key} -->`;
  const re = new RegExp(`${begin}[\\s\\S]*?${end}`);
  if (!re.test(md)) throw new Error(`README.md is missing the ${key} markers`);
  return md.replace(re, () => `${begin}\n${body}\n${end}`);
}

/**
 * The submission tracker is a fork-and-fill CSV of every active directory.
 * Generated rather than hand-maintained so it can't drift from the list.
 */
const trackerPath = join(root, 'templates', 'tracker.csv');
const trackerCsv = [
  'directory,url,price_usd,submitted_on,status,live_listing_url,approved_on,referrals_30d,notes',
  ...active.map((d) => `"${d.name}","${d.url ?? ''}",${d.priceUsd},,,,,,`),
].join('\n') + '\n';

const original = readFileSync(readmePath, 'utf8');
let out = original;
out = fill(out, 'STATS', stats);
out = fill(out, 'TABLE', activeTable);
out = fill(out, 'SKIPPED', skippedTable);

if (process.argv.includes('--check')) {
  const trackerStale = readFileSync(trackerPath, 'utf8') !== trackerCsv;
  if (out !== original || trackerStale) {
    console.error('Generated files are out of date. Run `node scripts/generate.mjs` and commit the result.');
    process.exit(1);
  }
  console.log('Generated files are up to date.');
} else {
  writeFileSync(readmePath, out);
  writeFileSync(trackerPath, trackerCsv);
  console.log(`README.md + templates/tracker.csv updated - ${active.length} active, ${skipped.length} skipped.`);
}
