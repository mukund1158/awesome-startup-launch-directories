# Contributing

Everything lives in [`data/directories.json`](data/directories.json). **Never edit the README tables by hand** - they are generated.

## Adding or correcting a directory

1. Edit `data/directories.json`.
2. Run `node scripts/generate.mjs` (Node 18+, no dependencies).
3. Commit both the JSON and the regenerated `README.md`.

CI runs `node scripts/generate.mjs --check` and fails if the README wasn't regenerated.

## Entry format

```json
{
  "name": "Example Launch",
  "url": "https://example.com/",
  "priceUsd": 19,
  "dr": 68,
  "status": "active",
  "notes": "Free tier with a 3-week queue."
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `name` | yes | As the site spells it |
| `url` | yes | Homepage, `https`, trailing slash if that's canonical. Use `null` only if genuinely unverifiable |
| `priceUsd` | yes | Number, USD, standard/cheapest paid listing. `0` for free. No currency symbol |
| `dr` | yes | Integer Ahrefs Domain Rating, or `null` if you couldn't measure it. **Don't guess** |
| `status` | yes | `active` or `skipped` |
| `notes` | no | Short. Free-tier details, queue length, or the reason for skipping |

## Bar for inclusion

A directory gets in if it is live, actually lists products, and a submission results in a real page with a real link. It gets `status: "skipped"` (rather than deletion) if it was evaluated and rejected - the reason is the useful part.

Reasons to reject:

- Dead, parked, or hasn't published a new listing in months
- Listings are `nofollow` **and** the site sends no meaningful referral traffic
- Ad-saturated pages where the listing is buried
- Pay-to-list with no editorial review and an obviously spun link profile
- Won't accept general submissions (note it, don't pretend it's open)

## Prices and DR

Both drift. If you update figures, bump `meta.lastUpdated` in the JSON in the same PR. Please state in the PR where the DR came from (Ahrefs free checker, paid Ahrefs, etc.) - a mixed-source number is worse than an absent one.

## Self-submissions

If you own or work on a directory, you may submit it - **disclose that in the PR description**. It will be held to the same bar as anything else. Undisclosed self-promotion gets closed.
