#!/usr/bin/env node
/**
 * Structural checks on data/directories.json that a JSON parser alone won't catch:
 * duplicate names, out-of-range DR, negative prices, bad status values, bad URLs.
 * Run by CI on every PR; safe to run locally with `node scripts/validate.mjs`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { meta, directories } = JSON.parse(readFileSync(join(root, 'data', 'directories.json'), 'utf8'));

const errors = [];
const seenNames = new Set();
const seenUrls = new Set();

if (!/^\d{4}-\d{2}-\d{2}$/.test(meta?.lastUpdated ?? '')) {
  errors.push('meta.lastUpdated must be a YYYY-MM-DD date');
}

for (const d of directories) {
  const at = `"${d.name ?? '(unnamed)'}"`;

  if (!d.name?.trim()) errors.push(`${at}: missing name`);
  if (seenNames.has(d.name)) errors.push(`${at}: duplicate entry`);
  seenNames.add(d.name);

  if (d.url !== null) {
    if (typeof d.url !== 'string' || !/^https:\/\/\S+$/.test(d.url)) {
      errors.push(`${at}: url must be an https URL or null`);
    } else {
      // Compare on host so a trailing slash doesn't hide a real duplicate.
      const host = new URL(d.url).host.replace(/^www\./, '');
      if (seenUrls.has(host)) errors.push(`${at}: duplicate domain ${host}`);
      seenUrls.add(host);
    }
  }

  if (typeof d.priceUsd !== 'number' || d.priceUsd < 0) errors.push(`${at}: priceUsd must be a number >= 0`);
  if (d.dr !== null && (!Number.isInteger(d.dr) || d.dr < 0 || d.dr > 100)) errors.push(`${at}: dr must be an integer 0-100 or null`);
  if (!['active', 'skipped'].includes(d.status)) errors.push(`${at}: status must be "active" or "skipped"`);
  if (d.status === 'skipped' && !d.notes?.trim()) errors.push(`${at}: skipped entries must explain why in notes`);
  // A link-policy verdict without its evidence page is unauditable, so reject it.
  if (d.linkPolicy && !['dofollow', 'nofollow', 'mixed'].includes(d.linkPolicy)) errors.push(`${at}: linkPolicy must be dofollow, nofollow or mixed`);
  if (d.linkPolicy && !d.linkPolicyEvidence) errors.push(`${at}: linkPolicy must cite a linkPolicyEvidence URL`);
  if (d.linkPolicy === 'mixed' && !/^\d+\/\d+$/.test(d.linkPolicySample ?? '')) errors.push(`${at}: mixed linkPolicy needs a linkPolicySample like "6/8"`);
}

if (errors.length) {
  console.error(`${errors.length} problem(s) in data/directories.json:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`OK — ${directories.length} entries validated.`);
