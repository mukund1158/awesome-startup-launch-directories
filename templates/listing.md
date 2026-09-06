# Listing asset kit

Fill this in **once**, then paste from it into all 23 directories. These are the fields nearly every launch directory asks for, at the strictest limits any of them enforce - write to the shortest limit and you never have to rewrite for a specific site.

Copy this file to `my-listing.md` (gitignored) and fill it in.

---

## Text

**Product name**
```
```

**Tagline - 60 characters max.**
Most directories cut off around 60. Say what it does, not what it feels like. No "the ultimate", no "revolutionize".
```
```

**Short description - 200 characters max.**
The card/preview text. Lead with the noun ("A CLI that…", "A dashboard for…"). One concrete capability beats three adjectives.
```
```

**Long description - 500-1500 characters.**
Plain paragraphs, no markdown headers - most forms strip them. Structure: what it is → who it's for → the one thing it does better → pricing in a sentence.
```
```

**Categories / tags - pick 3-5, reuse everywhere.**
Consistency across directories matters more than picking the perfect tag on any one of them.
```
```

## Links

| Field | Value |
|-------|-------|
| Website URL | |
| Pricing page | |
| Docs | |
| X / Twitter | |
| GitHub | |
| Maker profile | |

Use a UTM on the website URL so you can tell which directory actually sends traffic:
`https://yoursite.com/?utm_source=<directory>&utm_medium=referral&utm_campaign=launch`

## Images

Make these once at the largest size and downscale as needed.

| Asset | Size | Notes |
|-------|------|-------|
| Logo (square) | 512×512 PNG | Transparent background. Some sites render it on white, some on dark - check both |
| Logo (wordmark) | 1200×400 PNG | Occasionally requested instead of the square |
| OG / social image | 1200×630 PNG | Also your own site's `og:image` |
| Screenshot 1 | 1920×1080 | The core screen. Not the landing page - the actual product |
| Screenshot 2-4 | 1920×1080 | One feature each |
| Demo video | ≤60s, MP4 | Optional, but the sites that accept it weight it heavily |

Keep every file under 2 MB - several forms reject larger uploads without a clear error.

## Pricing

| Field | Value |
|-------|-------|
| Model | Free / Freemium / Paid / One-time |
| Starting price | |
| Free tier? | |
| Trial length | |

## Maker

| Field | Value |
|-------|-------|
| Name | |
| Email (for approvals) | |
| Bio - 160 chars | |
| Profile photo | 400×400 |

---

## Before you submit

- [ ] Site loads in under 3s and has no broken images
- [ ] It works on mobile - reviewers check on their phone
- [ ] Pricing is visible without signing up
- [ ] There's a real email or contact route on the site
- [ ] `og:image` and `og:description` are set (the directory may scrape them)
- [ ] Signup doesn't require a credit card, if you claim a free tier
- [ ] UTM parameters are on the URL you submit

## After you submit

Approvals take anywhere from hours to weeks, and some directories never reply. Track what you sent and when - otherwise you'll resubmit to the same site in three months. See [`templates/tracker.csv`](tracker.csv).
