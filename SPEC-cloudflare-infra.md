# Spec: cloudflare-infra

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on nothing. `media-pipeline` needs its bucket and media domain, and `site` ships through its Worker.

## Objective

Serve `www.thesamegatsby.com` from Cloudflare Workers Static Assets, and snippets and covers from R2 at `media.thesamegatsby.com`, cached at Cloudflare's edge worldwide. Move the domain's DNS from Vercel to Cloudflare with no downtime and a rollback path. Everything stays on free tiers.

This module touches systems outside the repo. **Every step marked 🔒 is done only after Reno says yes to that step**, and steps marked 👤 are done by Reno in an account I don't operate.

## Current state (checked 3 Nov 2026)

| | |
|---|---|
| Registrar | Host Africa (Pty) Ltd. Expires 5 Aug 2027 |
| Nameservers | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| Apex | `https://thesamegatsby.com` → `308` to `https://www.thesamegatsby.com/` |
| `www` | Served by Vercel. HSTS `max-age=63072000` |
| MX / TXT on apex | None. Reno confirms no mail uses this domain |
| DNSSEC | Off (no DS record at the registry), so changing nameservers can't break resolution |
| Other records | Vercel's defaults only: a wildcard sending every subdomain to Vercel (`mail.`, `api.`, `media.` and any random name resolve to Vercel IPs), CAA records for `letsencrypt.org`, `pki.goog` and `sectigo.com`, and a `_domainconnect` CNAME |
| Repo | `github.com/littlevegasdavids/thesamegatsby`. Vercel deploys `main` |

Because Vercel already sends a two-year HSTS header, browsers that have visited will only use HTTPS for this domain. Every host has to serve valid HTTPS from the first minute.

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
  "routes": [{ "pattern": "www.thesamegatsby.com", "custom_domain": true }]
}
```

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

The zone also gets SSL/TLS Full (strict), Always Use HTTPS and HSTS matching Vercel's two years, so nothing about HTTPS gets weaker during the move.

**Why media is on its own hostname and not proxied through the Worker:** an R2 binding in the Worker would make every audio request a billed Worker invocation (100k a day on the free tier) and would need cache code. A custom domain on R2 is served by the cache with no Worker in the path, and egress is free.

## Rollout

Each phase leaves production working. Vercel keeps serving until phase 4.

1. **Inventory: done publicly on 3 Nov 2026** (see Current state). Nothing is needed from Reno. One caveat: a subdomain attached to a separate Vercel project would hide behind the wildcard. Reno has confirmed there's none.
2. **Zone on Cloudflare, DNS only** 🔒 👤.
   - Add `thesamegatsby.com` to Cloudflare (Free plan), letting Cloudflare import the records.
   - In the import, **keep only the apex and `www`**, still pointing at Vercel's IPs, **DNS-only (grey cloud)**, so Vercel keeps serving and renewing its own certificate.
   - **Delete the wildcard, the CAA records and `_domainconnect`.** The wildcard would make every typo'd subdomain hit Vercel. The CAA list would restrict which certificate authorities Cloudflare can use.
   - 👤 Change the nameservers at Host Africa to the pair Cloudflare assigns.
   - Wait until Cloudflare shows the zone as active. Nothing visible changes, because the same apex and `www` answers now come from new nameservers.
3. **Build the new side in parallel** 🔒.
   - Create the bucket and connect `media.thesamegatsby.com`.
   - Add the Cache, Transform and Tiered Cache settings.
   - Create the Worker and connect it to GitHub through Workers Builds (see CI/CD below).
   - Verify the `redesign` branch on its preview URL. `www` is still on Vercel.
4. **Cutover** 🔒, at a quiet hour.
   - Delete the `www` record that points at Vercel, and add `www.thesamegatsby.com` as the Worker's custom domain.
   - Swap the apex to the proxied placeholder plus the Redirect Rule.
   - Run the acceptance checks below.
   - The gap is the seconds between deleting the old `www` record and Cloudflare creating the new one.
5. **Settle** 🔒.
   - Leave the Vercel project untouched for 14 days.
   - Then remove the domain from Vercel and disconnect its Git integration. Whether to delete the project is Reno's call.

**Rollback** during phases 4–5: put the inventoried `www` and apex records back, pointing at Vercel. Vercel is still deploying `main`, so it serves the last good version.

**Merge order:** `redesign` merges to `main` just before phase 4. Vercel builds that merge too, which is harmless because DNS moves off it minutes later.

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

Until Vercel is disconnected in phase 5, it also builds every push. That's harmless, because after cutover nothing points at it.

## Commands

```bash
npm run cf:dev                      # next build && wrangler dev: serves out/ with _headers on :8787
npx wrangler whoami                 # confirm which account wrangler is logged into before any remote command
npx wrangler r2 bucket list         # read-only check that the bucket exists
```

## Acceptance checks

Run from the laptop after phase 3 (media) and phase 4 (site). `<key>` is any uploaded snippet.

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
| No downtime | `while true; do curl -s -o /dev/null -w "%{http_code} " https://www.thesamegatsby.com; sleep 2; done` during cutover | at most one non-200 window, under one minute |

Edge latency outside South Africa can't be measured from the laptop. Cache `HIT`s are the proxy for it, and the browser checks in `site` measure tap-to-sound against the deployed preview.

## Repo changes in this module

- Add `wrangler` as a dev dependency 🔒, plus `wrangler.jsonc`, `public/_headers`, `.node-version`, and the `cf:dev` and `ci` scripts.
- Fix `.gitignore`: today it ignores only `.env*.local`. Add `.env`, `.env.*`, `.dev.vars*` and `.wrangler/`.

## Out of scope for this module

Encoding and uploading the real media (`media-pipeline`), the page itself (`site`), analytics, email routing (there is no email on this domain), and paid Cloudflare features.

## Open questions

1. **Workers Builds details to confirm at setup:** that it reads `.node-version`, and that build results show as status checks on GitHub commits and pull requests. If either doesn't hold, the fallback is a `NODE_VERSION` build variable and the Cloudflare dashboard's build log.
2. **Does the Transform Rule's static header apply to R2 custom-domain responses served from cache?** The "CORS on a cached copy" check proves it. If it fails, the fallback is an R2 CORS policy for the site's origins plus a cache purge for the media host.
3. **Content-Security-Policy.** The App Router's static export inlines its bootstrap scripts, so a strict `script-src` breaks hydration. Whether to ship a CSP, and with which hashes or `'unsafe-inline'`, gets decided against the real `out/` build in `site`.
4. **Do branch preview URLs need `workers_dev` left on?** This gets checked against the installed Wrangler's config schema at setup. `workers_dev` is turned off after cutover if previews don't depend on it.
