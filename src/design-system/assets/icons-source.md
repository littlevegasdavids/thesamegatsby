# Platform and social icons: source and licence

The brand marks in `icon-paths.ts` are the path data of nine files from **Simple Icons 16.36.0**, downloaded on 4 Nov 2026 with Reno's approval from `https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/<file>`. Each file is one path on a 24 × 24 viewBox. Only the path data is kept, painted in `currentColor`.

| Platform | File | Bytes | SHA-256 |
|---|---|---|---|
| Spotify | `spotify.svg` | 697 | `b9ec9bec7769c35643981586d6ea0d675aaf3871b32f8a291bcac7a87fff0bc1` |
| Apple Music | `applemusic.svg` | 1,735 | `365264bcf032a1acb6f18554cf7d34b1b2a75f7e571848629173bbfd0e1cadbb` |
| YouTube Music | `youtubemusic.svg` | 449 | `f96c8a67f93717df8f9f57b0e96638b19e8fd80a165ddf83598592b5342612f5` |
| SoundCloud | `soundcloud.svg` | 1,178 | `02bac3d2cb8c1091aeae61219803dadbb4364dd636e50f60567d25dfcde7c12c` |
| Bandcamp | `bandcamp.svg` | 149 | `d8aba588023c3dc412ec4f8780b1f1c5c49c5079bc3b8b05ad4e175e9445a4d8` |
| Deezer | `deezer.svg` | 1,198 | `928ee1c513ccf49c125956f8cb300558701a112eb2adaede966d032408cc480c` |
| Tidal | `tidal.svg` | 305 | `99f2c0efba4e756b58da03fa35b5d163f1033e77671f1bf2931df29f8694e4af` |
| Instagram | `instagram.svg` | 2,101 | `f53af2d1fc5292ba1433b5c1faf50005ce6a997fa302d1816989929f379a59dc` |
| TikTok | `tiktok.svg` | 707 | `6f54ac8d325faacea8935bdc44cbed60206a6b408641799e5fea1cba7c1a0af7` |

## Licence

Simple Icons is released under **CC0 1.0 Universal**. Its disclaimer notes that an icon can carry a licence of its own. In 16.36.0's `data/simple-icons.json`, none of these nine entries has a `license` field, so all nine are CC0.

CC0 waives no trademark rights. Each mark stays its brand's trademark, and the brands' guidelines still apply. The design system keeps every mark monochrome, in `--dg-fg`, never in brand colours. Spotify, Deezer and Instagram list their guidelines in Simple Icons' data:
- Spotify: https://developer.spotify.com/documentation/general/design-and-branding/#using-our-logo
- Deezer: https://deezerbrand.com/document/37#/-/logo
- Instagram: https://about.meta.com/brand/resources/instagram

## Amazon Music is a stand-in

Simple Icons 16.36.0 has no Amazon Music mark. Its data has no entry, and the file returns 404. Until Amazon's own mark is sourced, Amazon Music uses the stand-in drawn on the canvas (`Main.dc.html`'s "More" row): a smile and a note, stroked at 1.8 units. It isn't Amazon's mark. Reno chose this on 4 Nov 2026. **It must be replaced before public launch.** Fetching Amazon's mark from its brand pages is a separate ask, under Amazon's terms rather than CC0.
