# Awesome Startup Launch Directories

> A maintained, **DR-ranked** list of startup and product launch directories — where to submit your startup, what each listing costs, and what the backlink is actually worth.

Most "300+ places to launch your startup" lists are link dumps. Half the sites are dead, none of them tell you what a listing costs, and none tell you whether the backlink is worth anything. This one is small on purpose: every entry has been checked, priced, and ranked by **Ahrefs Domain Rating (DR)** — and the ones that weren't worth it are listed too, with the reason.

<!-- BEGIN:STATS -->
- **23** directories listed (**2** free, **21** paid)
- **14** of them are **DR 70+**
- Submitting to every paid listing here costs **$480.86** total
- Cheapest **paid** DR 70+ placement: [Open-Launch](https://open-launch.com/) at **$12** (DR 72)
- DR figures last refreshed **2026-09-06**
<!-- END:STATS -->

---

## The list

Sorted by DR, highest first. **DR / $** is a rough cost-efficiency score (domain rating per dollar) — useful when you're picking which three to buy, not which twenty.

<!-- BEGIN:TABLE -->
| # | Directory | DR | Price | DR / $ | Notes |
|---|-----------|---:|------:|-------:|-------|
| 1 | [Findly Tools](https://findly.tools/) | 81 | $29 | 2.8 |  |
| 2 | [StackShare](https://stackshare.io/) | 78 | Free | ∞ | Free listing. Dev-tool / tech-stack focused. |
| 3 | [Uneed](https://www.uneed.best/) | 75 | $14.99 | 5.0 | Free queue available; paid slot skips the wait. |
| 4 | [ToolFame](https://toolfame.com/) | 75 | $14.99 | 5.0 |  |
| 5 | [LaunchIgniter](https://launchigniter.com/) | 74 | $15 | 4.9 |  |
| 6 | [PeerPush](https://peerpush.com/) | 74 | $39 | 1.9 |  |
| 7 | [NickLaunches](https://nicklaunches.com/) | 74 | $19 | 3.9 |  |
| 8 | [Startupbase](https://startupbase.io/) | 73 | $15 | 4.9 |  |
| 9 | [TinyLaunch](https://www.tinylaunch.com/) | 73 | $39 | 1.9 |  |
| 10 | [Open-Launch](https://open-launch.com/) | 72 | $12 | 6.0 | Open source launch platform. |
| 11 | [Startup Fast](https://www.startupfa.st/) | 72 | $19 | 3.8 |  |
| 12 | [TinyShelf](https://www.tinyshelf.co/) | 71 | $19 | 3.7 |  |
| 13 | [Tiny Startups](https://www.tinystartups.com/) | 71 | $49 | 1.4 |  |
| 14 | [Launch Llama](https://tools.launchllama.co/) | 71 | $39 | 1.8 |  |
| 15 | [MicroLaunch](https://microlaunch.net/) | 63 | $39 | 1.6 |  |
| 16 | [IndieHunt](https://indiehunt.io) | 62 | $19 | 3.3 |  |
| 17 | [LaunchVault](https://www.launchvault.dev/) | 55 | $9.99 | 5.5 |  |
| 18 | [StartupTrusted](https://startuptrusted.com/) | 54 | $9 | 6.0 |  |
| 19 | [Ramen.tools](https://ramen.tools/) | 47 | Free | ∞ | Free listing. |
| 20 | [NoonLaunch](https://noonlaunch.com/) | 45 | $11 | 4.1 |  |
| 21 | [DevHub](https://devhub.best) | 39 | $9.90 | 3.9 |  |
| 22 | [Shipyard HQ](https://shipyardhq.dev/) | 35 | $9.99 | 3.5 |  |
| 23 | [Resource.fyi](https://resource.fyi) | 31 | $49 | 0.6 |  |
<!-- END:TABLE -->

## Skipped

Directories that were evaluated and deliberately *not* submitted to. Kept here so nobody has to repeat the research.

<!-- BEGIN:SKIPPED -->
| Directory | DR | Price | Why it was skipped |
|-----------|---:|------:|--------------------|
| Outbid | 71 | $10 | Far more outgoing than incoming links — weak link equity for the price. |
| [Index by Dodo Payments](https://index.dodopayments.com/) | — | Free | Curated — not accepting general submissions. |
| [PromoteProject](https://www.promoteproject.com/) | — | Free | Ad-heavy pages; poor placement quality. |
<!-- END:SKIPPED -->

---

## How to use this list

If you're launching on a budget, a reasonable order of operations:

1. **Do the free ones first.** They cost nothing but time, and a couple of them are high DR.
2. **Then buy DR 70+ in ascending price order.** The `DR / $` column is sorted for exactly this.
3. **Space submissions out.** A burst of identical listings on the same day looks like what it is. A few per week reads as a normal launch.
4. **Write the listing once, reuse it.** Nearly every directory asks for the same fields: name, URL, one-liner (~60 chars), description (~200 chars), logo, screenshots, category, pricing model. Keep them in a text file.
5. **Track what you submitted.** Approvals take days to weeks and some directories never reply. Fork this repo's JSON into your own private sheet if you want a status column.

### A note on what a listing is actually worth

A DR 74 directory does **not** pass DR 74 of value to you. What you get is one link from a page that is usually many hops from that domain's strongest pages, often alongside hundreds of other listings, and sometimes `nofollow`. Treat these as:

- **Real value:** discovery, first users, social proof, and a plausible referral trickle.
- **Modest value:** a diversified, natural-looking backlink profile early in a domain's life.
- **Not the value:** a direct ranking jump. If a directory promises one, that's marketing.

Prices and DR change. Verify before you pay — see [`data/directories.json`](data/directories.json) for the last refresh date.

## Data

[`data/directories.json`](data/directories.json) is the source of truth and is meant to be consumed programmatically:

```bash
# Every free listing
jq '.directories[] | select(.priceUsd == 0 and .status == "active") | .url' data/directories.json

# DR 70+ under $20, cheapest first
jq -r '[.directories[] | select(.status == "active" and .dr >= 70 and .priceUsd < 20)]
       | sort_by(.priceUsd)[] | "\(.name)\t$\(.priceUsd)\tDR \(.dr)"' data/directories.json
```

| Field | Meaning |
|-------|---------|
| `name` | Directory name |
| `url` | Homepage (`null` if unverified) |
| `priceUsd` | Cost of a standard listing, USD. `0` = free |
| `dr` | Ahrefs Domain Rating at the time of the snapshot, `null` if unmeasured |
| `status` | `active` (recommended) or `skipped` (evaluated and rejected) |
| `notes` | Caveats, free-tier details, or the reason for skipping |

The README tables are generated from that file:

```bash
node scripts/generate.mjs          # rewrite the README tables
node scripts/generate.mjs --check  # CI: fail if the README is stale
```

## Contributing

Corrections are as welcome as additions — a wrong price or a dead link is worse than a missing entry. See [CONTRIBUTING.md](CONTRIBUTING.md).

**Please don't** open a PR that adds your own directory unless it's genuinely live, has real traffic, and you disclose the affiliation in the PR description. Self-submissions that meet that bar are fine; drive-by link farming gets closed.

## License

[CC0 1.0 Universal](LICENSE) — public domain. Copy it, fork it, build a tool on top of it, no attribution needed.
