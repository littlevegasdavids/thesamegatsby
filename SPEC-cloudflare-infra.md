# Spec: cloudflare-infra

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on nothing. `media-pipeline` needs its bucket and media domain, and `site` ships through its Worker.

## Objective

Serve `www.thesamegatsby.com` from Cloudflare Workers Static Assets, and snippets and covers from R2 at `media.thesamegatsby.com`, cached at Cloudflare's edge worldwide. The domain's DNS is on Cloudflare. Everything stays on free tiers.

This module touches systems outside the repo. **Every step marked 🔒 is done only after Reno says yes to that step**, and steps marked 👤 are done by Reno in an account I don't operate.

## Current state (checked 4 Nov 2026)

| | |
|---|---|
| Registrar | Host Africa (Pty) Ltd. Expires 5 Aug 2027 |
| Nameservers | `journey.ns.cloudflare.com`, `leland.ns.cloudflare.com`. The zone has been active on Cloudflare's Free plan since 4 Nov 2026 |
| DNS records | **None.** The apex, `www` and every other name resolve to nothing |
| Vercel | **Gone.** Reno deleted the Vercel project and removed the domain from it on 4 Nov 2026 |
| What visitors see | Nothing, by Reno's choice, until the Cloudflare site is ready and launched (phase 4). There's no holding page |
| MX / TXT | None. No mail uses this domain |
| DNSSEC | Off |
| Repo | `github.com/littlevegasdavids/thesamegatsby`. Nothing deploys from it until Workers Builds is connected (CF-4) |

**Before the move (3 Nov 2026):** Vercel's nameservers, the apex 308ing to `www`, Vercel serving `www`, and only Vercel's default records (a wildcard, CAA for three CAs, and `_domainconnect`). None of them were carried over.

Vercel sent a two-year HSTS header, so browsers that visited before the move will only use HTTPS for this domain until late 2028. Every hostname has to serve valid HTTPS from its first minute.

## Target architecture

```
visitor ──► www.thesamegatsby.com ──► Worker "thesamegatsby" (static assets only, out/)
        ──► thesamegatsby.com ──► Redirect Rule 308 ──► www (path and query kept)
        ──► media.thesamegatsby.com ──► Cloudflare cache ──(miss)──► R2 "thesamegatsby-media"
```

### Site Worker

`wrangler.jsonc` (assets only, no `main` script, so every request is a free static-asset request):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "thesamegatsby",
  "compatibility_date": "<date of setup>",
  "assets": { "directory": "./out", "not_found_handling": "404-page" },
  "preview_urls": true
}
```

- **`preview_urls: true`:** Wrangler 4.153 defaults it to `false`, which would leave branch uploads without a preview URL.
- **No `routes` until launch:** phase 4 adds `"routes": [{ "pattern": "www.thesamegatsby.com", "custom_domain": true }]`. The production deploy then creates `www`'s DNS record and certificate. Until then, nothing points at the Worker.

`public/_headers` (Next copies it into `out/`):

| Path | Header |
|---|---|
| `/_next/static/*` | `Cache-Control: public, max-age=31536000, immutable`. This covers fonts too, since `next/font` emits them under `/_next/static/media/` |
| `/*` | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |

HTML keeps the static-assets default (`public, max-age=0, must-revalidate`), so a deploy shows up immediately.

### Media bucket

| Setting | Value |
|---|---|
| Bucket | `thesamegatsby-media`, Standard storage, automatic location |
| Public access | Custom domain `media.thesamegatsby.com` only. `r2.dev` stays disabled |
| Keys | Content-hashed, so every object is immutable: `snippets/<slug>.<hash>.m4a`, `covers/<slug>.<hash>.<width>.avif`, `.webp` |
| Object metadata | `Content-Type` set per file. `Cache-Control: public, max-age=31536000, immutable`. Set by `media-pipeline` at upload |
| Uploads | `wrangler r2 object put thesamegatsby-media/<key> --file … --content-type … --cache-control … --remote`, authenticated with `wrangler login` (OAuth). **No R2 API keys exist, so there's nothing secret to store** |

### Zone rules (free plan)

| Rule | Type | Match | Action | Why |
|---|---|---|---|---|
| Media cache | Cache Rule | hostname = `media.thesamegatsby.com` | Eligible for cache. Edge TTL: respect origin. Browser TTL: respect origin | Cloudflare caches by file extension, and **`.m4a` isn't in its default list**. Without this rule every snippet comes straight from R2 |
| Media CORS | Response Header Transform Rule | hostname = `media.thesamegatsby.com` | Set static `Access-Control-Allow-Origin: *` | R2 only adds CORS headers when the request carries `Origin`, and its docs don't say how that interacts with cached copies. A static header on every response stops a cached copy without CORS from breaking the release kit's canvas export. The media is public, so `*` exposes nothing |
| Apex redirect | Single Redirect | hostname = `thesamegatsby.com` | 308 to `https://www.thesamegatsby.com${path}${query}` | Keeps today's behaviour. The apex gets a proxied `AAAA 100::` placeholder record so the rule has something to run on |
| Tiered cache | Cache setting | zone | Smart Tiered Cache on | Cloudflare's R2 docs recommend it: one upper tier next to the bucket, fewer reads from R2 |

The zone also gets SSL/TLS Full (strict), Always Use HTTPS, and HSTS at two years, as Vercel had, so HTTPS is never weaker than before the move.

**Why media is on its own hostname and not proxied through the Worker:** an R2 binding in the Worker would make every audio request a billed Worker invocation (100k a day on the free tier) and would need cache code. A custom domain on R2 is served by the cache with no Worker in the path, and egress is free.

## Rollout

1. **Inventory: done on 3 Nov 2026.**
2. **Zone on Cloudflare: done on 4 Nov 2026** 👤. Reno added the zone and changed the nameservers at Host Africa. The same day he deleted the Vercel project, so the zone holds no records. The planned import (apex and `www` left DNS-only on Vercel) no longer applies.
3. **Build the new side** 🔒.
   - Create the bucket and connect `media.thesamegatsby.com`.
   - Add the zone settings, the Cache and Transform Rules, and Tiered Cache.
   - Create the Worker and connect it to GitHub through Workers Builds (see CI/CD below).
   - Verify `redesign` on its preview URL. `www` stays unattached.
4. **Launch** 🔒. This happens when `site` is built and the Aero licence is confirmed (SPEC.md, open question 1).
   - Merge `redesign` into `main`, with the `www` custom-domain route added to `wrangler.jsonc`. The production deploy attaches `www`, and Cloudflare creates its record and certificate.
   - Add the apex's proxied `AAAA 100::` placeholder and the Redirect Rule.
   - Run the acceptance checks below.

   There's nothing live to keep up, so this needs no downtime window.

**Rollback** after launch: `npx wrangler rollback` returns production to an earlier version, from the Worker's version history. Removing the custom domain takes the site offline again, which is the state before launch.

## CI/CD

Push to deploy, with Workers Builds connected to the GitHub repo. There are no GitHub Actions and no deploy secrets.

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run ci`: lint, typecheck, test, then `next build`. Any failure stops the build, so nothing deploys |
| Deploy command (production) | `npx wrangler deploy` |
| Deploy command (other branches) | `npx wrangler versions upload`: a preview URL per push, with production untouched |
| Node version | Pinned with a `.node-version` file (`24`), so CI matches the laptop |
| Secrets | None. The site is static, and media uploads run locally through `add-song` |

**What a push does:**
- To `redesign` or any other branch: a checked build and a preview URL.
- To `main`: a checked build, then production.


## Commands

```bash
npm run cf:dev                      # next build && wrangler dev: serves out/ with _headers on :8787
npx wrangler whoami                 # confirm which account wrangler is logged into before any remote command
npx wrangler r2 bucket list         # read-only check that the bucket exists
```

## Acceptance checks

Run from the laptop after phase 3 (media) and phase 4 (launch). `<key>` is any uploaded snippet.

| Check | Command | Pass |
|---|---|---|
| Site on Cloudflare | `curl -sI https://www.thesamegatsby.com` | `200`, `server: cloudflare` |
| Apex redirect | `curl -sI "https://thesamegatsby.com/x?y=1"` | `308`, `location: https://www.thesamegatsby.com/x?y=1` |
| HTTPS everywhere | `curl -sI http://www.thesamegatsby.com` | redirects to `https://` |
| Media cached | `curl -sI https://media.thesamegatsby.com/<key>`, run twice | second response `cf-cache-status: HIT` |
| Media immutable | same | `cache-control: public, max-age=31536000, immutable`, `content-type: audio/mp4` |
| Range from cache | `curl -s -o /dev/null -w "%{http_code}" -H "Range: bytes=0-16383" https://media.thesamegatsby.com/<key>` | `206` |
| CORS on a cached copy | prime with no `Origin` header, then `curl -sI -H "Origin: https://www.thesamegatsby.com" https://media.thesamegatsby.com/<key>` | `access-control-allow-origin: *` on a `HIT` |
| Static asset cache | `curl -sI https://www.thesamegatsby.com/_next/static/<file>` | `immutable` |
| r2.dev off | bucket settings | public `r2.dev` URL disabled |

Edge latency outside South Africa can't be measured from the laptop. Cache `HIT`s are the proxy for it, and the browser checks in `site` measure tap-to-sound against the deployed preview.

## Repo changes in this module

- `wrangler` as a dev dependency, pinned to 4.153.0 (CF-2). That is the earliest release whose bundled `undici` has the October 2026 fixes, since 4.152 and older pull in a version with high-severity advisories.
- `wrangler.jsonc`, `public/_headers` and the `cf:dev` script (CF-2). `.node-version`, the `ci` script and the `.gitignore` entries for `.env`, `.env.*`, `.dev.vars*` and `.wrangler/` came with DS-2.

## Out of scope for this module

Encoding and uploading the real media (`media-pipeline`), the page itself (`site`), analytics, email routing (there is no email on this domain), and paid Cloudflare features.

## Open questions

1. **Workers Builds details to confirm at setup:** that it reads `.node-version`, and that build results show as status checks on GitHub commits and pull requests. If either doesn't hold, the fallback is a `NODE_VERSION` build variable and the Cloudflare dashboard's build log.
2. **Does the Transform Rule's static header apply to R2 custom-domain responses served from cache?** The "CORS on a cached copy" check proves it. If it fails, the fallback is an R2 CORS policy for the site's origins plus a cache purge for the media host.
3. **Content-Security-Policy.** The App Router's static export inlines its bootstrap scripts, so a strict `script-src` breaks hydration. Whether to ship a CSP, and with which hashes or `'unsafe-inline'`, gets decided against the real `out/` build in `site`.
4. **Do branch preview URLs need `workers_dev` left on?** Wrangler 4.153's schema answers half of it: `preview_urls` defaults to `false`, so `wrangler.jsonc` sets it to `true`. `workers_dev` stays at its default (`true`). Whether previews still work with it off gets checked at CF-4. If they do, it's turned off at launch.
