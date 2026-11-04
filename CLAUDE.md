# Déjà Gatsby website

Reno's music portfolio at thesamegatsby.com, being rebuilt as **Déjà Gatsby**. The site has one job: a fan on a phone taps a track, hears a 30-second snippet, and clicks through to stream the full song. Built and maintained by Reno Davids, solo.

## Where things are

| What | Where |
|---|---|
| Intent, decisions, capability map, stack, code style, boundaries | `SPEC.md` |
| Tokens, fonts, textures, components, `/system`, acceptance | `SPEC-design-system.md` |
| DNS, the Worker, R2, launch and rollback | `SPEC-cloudflare-infra.md` |
| The current plan, and the task checklist with its acceptance criteria | `tasks/plan.md`, `tasks/todo.md` |
| How the UI must look | The approved canvas ["Déjà Gatsby Screens"](https://claude.ai/artifact/WSB4B7NtCYipXV3GSXmmSo). plan.md maps each board to the components it's a reference for |

Each later module gets its own `SPEC-<module>.md` when it comes up in SPEC.md's build order.

The canvas is the reference for looks. SPEC-design-system.md is the contract for behaviour, accessibility and tokens, and **where they disagree, the spec wins** (plan.md lists the known cases). If something on the canvas isn't in the spec, ask Reno and update the spec before writing the code.

## Stack

- Next.js 16 with the App Router, React 19 and TypeScript 5, built with `output: 'export'` into static files in `out/`. There's no server: no API routes, middleware, ISR or server actions.
- Plain CSS custom properties in `src/design-system/tokens.css`, plus a CSS Module per component. No CSS-in-JS and no Tailwind.
- Tests run on Node 24's built-in runner with type stripping. It can't import `.tsx`, so testable logic lives in `.ts` files.
- The site is served by Cloudflare Workers Static Assets, and media comes from R2 at `media.thesamegatsby.com`. DNS is on Cloudflare. Vercel is gone, and `www` points at nothing until launch (CF-5).
- Next 16.4 is newer than most training data. Read the guide in `node_modules/next/dist/docs/` before using an unfamiliar API. If `next dev` writes an `AGENTS.md`, commit it rather than deleting it, because it puts the file back.

## Commands

```bash
npm run dev         # Next dev server, :3000
npm run build       # static export to out/
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # node --test "tests/**/*.test.ts"
npm run ci          # lint, typecheck, test, then build: what Workers Builds runs
```

## Working agreement

- **Branch:** all work happens on `redesign`, one conventional commit per task in `tasks/todo.md`. Never push unless Reno asks, because once CF-4 is done a push triggers a Workers build. `main` doesn't move until launch.
- **Before ticking a task**, check the list at the top of `tasks/todo.md`, including the `/system` and canvas checks for UI tasks.
- **Ask Reno first** before:
  - adding any dependency or installing a tool
  - downloading fonts, icons or other third-party assets
  - touching anything in the Cloudflare, Host Africa or GitHub dashboards or APIs
  - uploading to R2, or publishing a Claude artifact
  - changing the capability map or a confirmed assumption in SPEC.md
- **Never** commit secrets, `.env`, `.dev.vars` or WAV masters, and never serve production media from `r2.dev`.
- **Aero:** display type only, never below 24 px, and never for body text. Nothing launches publicly in Aero until the author confirms the licence covers web use (SPEC.md, open question 1).

SPEC.md's Boundaries and Code style sections hold the full rules.
