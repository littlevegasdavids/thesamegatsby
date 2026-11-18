# Spec: claude-design-system

Module of the [Déjà Gatsby rebuild](SPEC.md). Depends on `design-system`.

**Written 18 Nov 2026. The files are built and checked locally. Nothing is published:** publishing a Claude artifact is an ask-first step (SPEC.md).

## Objective

Publish Déjà Gatsby as a Design System artifact in Claude, so Claude can make an on-brand post given only a track title and a cover (SPEC.md, success criteria).

## What gets published

`npm run export-design-system` writes `.design-system/project/`, which git ignores, from the repository's own sources:

| File | From |
|---|---|
| `tokens.json` | `src/design-system/tokens.css`, with usage notes from SPEC-design-system.md. 30 colours, 9 spaces, 4 radii and 10 type styles |
| `README.md` | The brand book: voice, foundations, type rules, marks, and the post and story recipe from SPEC-release-kit.md |
| `components/Cover/preview.html` | The system's cover |
| `fonts/` | Chakra Petch 400 and 600, and VT323, all under the OFL |
| `assets/Marks/` | `wordmark.svg` and `sparkle-star.svg`, copied as they are |

## What's left out, and why

- **Aero's font file,** until its licence is confirmed (SPEC.md, open question 1). The outlined wordmark needs no font, but **Claude can't set a release title in Aero until the file is added**, which limits the success criterion above.
- **Six translucent colours** (`surface-glass`, `surface-translucent`, `field`, `accent-wash`, `grid-line`, `grid-glow`), because the artifact's token format refuses `color-mix()`. The brand book describes how they're used.
- **React components.** The brand book and tokens are what artwork needs, and the live components stay in the site.

## To publish, with Reno's OK

1. Run `npm run export-design-system`.
2. Create one artifact from the Design System type, titled "Déjà Gatsby".
3. Upload the two marks as assets, and record them in the index's `Marks` group.
4. Publish the rest with `project/design-system.json` last, as the type's instructions say.
5. Ask Claude for a post from one title and cover, and compare it with `/kit`'s.

## Testing

`tests/design-system-export.test.ts` checks that token names are valid and unique, values are ones the artifact can read, every token has a usage note, the type sizes are right, Aero's file is absent, and the brand book and cover keep their rules. The cover was rendered and checked by eye.

## Success criteria

- [x] The export is generated from the repository's tokens, fonts and marks, with no value retyped by hand.
- [ ] Reno approves publishing, and the artifact is live.
- [ ] Claude makes an on-brand post from a title and a cover alone. It needs Aero's licence and file for the title.
