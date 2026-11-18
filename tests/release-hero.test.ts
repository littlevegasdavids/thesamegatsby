import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
import { HERO_PHONE_COVER_WIDTH, HERO_TRACK_LIMIT, phoneCover, releaseHeroView, showAllLabel } from "../src/design-system/components/ReleaseHero/view.ts";
import type { Release, Track } from "../src/design-system/types.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/ReleaseHero/ReleaseHero.module.css");
const stripLineComments = (source: string) => source.replace(/^\s*\/\/.*$/gm, "");
const hero = stripLineComments(read("components/ReleaseHero/ReleaseHero.tsx"));
const list = stripLineComments(read("components/ReleaseHero/HeroTracklist.tsx"));
const tokens = parseTokens(read("tokens.css"), 360);

function block(source: string, header: string): string {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `no ${header}`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(source.indexOf("{", start) + 1, i);
  }
  throw new Error(`${header} isn't closed`);
}

const WIDE = block(css, "@media (min-width: 768px)");
const HOVER = block(css, "@media (hover: hover)");
const NARROW = css.replace(`@media (min-width: 768px) {${WIDE}}`, "").replace(`@media (hover: hover) {${HOVER}}`, "");

const rules = (source: string) =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: selectors.split(",").map((s) => s.trim()),
    body,
  }));

function value(source: string, selector: string, property: string): string | undefined {
  const found = rules(source)
    .filter((r) => r.selectors.includes(selector))
    .flatMap(({ body }) => [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].filter(([, name]) => name === property))
    .map(([, , v]) => v.trim());
  assert.ok(found.length <= 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

const track = (id: string): Track => ({ id, title: `Track ${id}`, kind: "original", duration: 30 });
const single: Release = {
  id: "vapor",
  type: "single",
  title: "Welcome to Vapor_City",
  cover: "/c.jpg",
  tracks: [track("vapor")],
  leadTrackId: "vapor",
  links: [],
};
const ep: Release = {
  id: "ep",
  type: "ep",
  title: "Can't You See",
  cover: "/c.jpg",
  tracks: [{ ...track("cys"), title: "Can't You See" }, track("ukg")],
  leadTrackId: "cys",
  links: [],
};
const album = (count: number, lead = "t3"): Release => ({
  ...ep,
  id: "album",
  type: "album",
  title: "[Album title]",
  tracks: Array.from({ length: count }, (_, i) => track(`t${i + 1}`)),
  leadTrackId: lead,
});

describe("ReleaseHero's view", () => {
  test("labels each type, counting an EP's or album's tracks", () => {
    assert.equal(releaseHeroView(single, {}).label, "New single");
    assert.equal(releaseHeroView(ep, {}).label, "New EP · 2 tracks");
    assert.equal(releaseHeroView(album(8), {}).label, "New album · 8 tracks");
    assert.equal(releaseHeroView({ ...ep, tracks: [track("cys")] }, {}).label, "New EP · 1 track");
  });

  test("names the stream chips and the tracklist for the type", () => {
    assert.deepEqual(
      [single, ep, album(8)].map((r) => [releaseHeroView(r, {}).streamHeading, releaseHeroView(r, {}).listLabel]),
      [
        ["Stream it on", null],
        ["Stream the EP", "On this EP"],
        ["Stream the album", "On this album"],
      ],
    );
  });

  test("plays a single's snippet, and an EP's or album's lead track", () => {
    assert.deepEqual(releaseHeroView(single, {}).play, { label: "Play snippet", icon: "play", pressed: false });
    assert.deepEqual(releaseHeroView(ep, {}).play, { label: "Play lead track", icon: "play", pressed: false });
    assert.equal(releaseHeroView(album(8), {}).leadTrackId, "t3");
  });

  test("turns the main button to a pressed Stop snippet while the lead track loads or plays (G7)", () => {
    for (const r of [single, ep]) {
      for (const playState of ["loading", "playing"] as const) {
        const view = releaseHeroView(r, { playingTrackId: r.leadTrackId, playState, elapsed: 12 });
        assert.deepEqual(view.play, { label: "Stop snippet", icon: "stop", pressed: true }, `${r.type} ${playState}`);
      }
    }
  });

  test("puts the main button back once the lead has played, or while another track plays", () => {
    const played = releaseHeroView(ep, { playingTrackId: "cys", playState: "played", elapsed: 30 });
    assert.deepEqual(played.play, { label: "Play lead track", icon: "play", pressed: false });
    const other = releaseHeroView(ep, { playingTrackId: "ukg", playState: "playing", elapsed: 12 });
    assert.deepEqual(other.play, { label: "Play lead track", icon: "play", pressed: false });
  });

  test("notes the lead track's title in capitals beside the button, for an EP or album only", () => {
    assert.equal(releaseHeroView(ep, {}).leadNote, "CAN'T YOU SEE");
    assert.equal(releaseHeroView(album(8), {}).leadNote, "TRACK T3");
    assert.equal(releaseHeroView(single, {}).leadNote, null);
  });

  test("falls back to the first track when the lead isn't one of the release's own", () => {
    const view = releaseHeroView({ ...ep, leadTrackId: "missing" }, {});
    assert.equal(view.leadTrackId, "cys");
    assert.deepEqual(view.tracks.map((t) => t.lead), [true, false]);
  });

  test("lists every track of an EP, numbered from 1, with LEAD on the lead only", () => {
    const view = releaseHeroView(ep, {});
    assert.deepEqual(
      view.tracks.map(({ index, title, lead }) => [index, title, lead]),
      [
        [1, "Can't You See", true],
        [2, "Track ukg", false],
      ],
    );
    assert.equal(view.showAll, null);
    assert.deepEqual(releaseHeroView(single, {}).tracks, []);
  });

  test("gives the playing track its state and elapsed time, and every other track idle", () => {
    const view = releaseHeroView(album(8), { playingTrackId: "t2", playState: "playing", elapsed: 12 });
    assert.deepEqual(
      view.tracks.slice(0, 3).map(({ state, elapsed }) => [state, elapsed]),
      [
        ["idle", 0],
        ["playing", 12],
        ["idle", 0],
      ],
    );
  });

  test("shows an album's first five, with Show all when there are more", () => {
    assert.equal(HERO_TRACK_LIMIT, 5);
    const long = releaseHeroView(album(8), {});
    assert.deepEqual([long.tracks.length, long.shown, long.showAll], [8, 5, "Show all 8 tracks"]);
    const short = releaseHeroView(album(5), {});
    assert.deepEqual([short.shown, short.showAll], [5, null]);
    const bigEp = releaseHeroView({ ...album(7), type: "ep" }, {});
    assert.deepEqual([bigEp.shown, bigEp.showAll], [7, null]);
  });

  test("reads Show fewer tracks once Show all is open (DS-23's proposal)", () => {
    assert.equal(showAllLabel(false, 8), "Show all 8 tracks");
    assert.equal(showAllLabel(true, 8), "Show fewer tracks");
  });
});

describe("ReleaseHero's markup", () => {
  test("holds no state itself: only the tracklist's Show all is a client component", () => {
    assert.ok(!/"use client"/.test(hero) && !/useState/.test(hero));
    assert.match(list, /^\s*"use client";/);
    assert.match(list, /useState\(defaultShowAll\)/);
  });

  test("is a section named by its visible label, with the title as its heading", () => {
    assert.match(hero, /<section[^>]*aria-labelledby=\{labelId\}/);
    assert.match(hero, /<p id=\{labelId\} className=\{styles\.label\}>/);
    assert.match(hero, /<h1 className=\{`\$\{styles\.title\} dg-tape`\}>\{release\.title\}<\/h1>/);
  });

  test("marks the label with the sparkle, which stays decorative", () => {
    assert.match(hero, /<SparkleStar size=\{12\} \/>/);
  });

  const coverFrame = () => /<div className=\{styles\.cover\}>([\s\S]*?)<\/div>/.exec(hero)?.[1] ?? "";

  test("gives the cover fixed dimensions, eager loading and alt text, with nothing else in its frame", () => {
    assert.match(coverFrame(), /^\s*<picture[^>]*>[\s\S]*<\/picture>\s*$/, "the cover frame holds the picture alone");
    assert.equal(coverFrame().match(/<img\b/g)?.length, 1);
    assert.match(hero, /width: 480/);
    assert.match(hero, /height: 480/);
    assert.match(hero, /loading: "eager"/);
    assert.match(hero, /`\$\{release\.title\} cover art`/);
  });

  // SITE-6: with only width, next/image wrote "768 1x, 1080 2x", so every
  // phone at 1.5x or more loaded the 1080 for a box the 768 fills, and the
  // homepage's first load went over 350 KB at Lighthouse's 1.75x.
  test("tells the browser the cover's box: the column on a phone, 480 px from 768", () => {
    assert.match(hero, /sizes: "\(min-width: 768px\) 480px, calc\(100vw - 40px\)"/);
    assert.match(coverFrame(), /<source media="\(min-width: 768px\)" srcSet=\{cover\.srcSet\} sizes="min\(44vw, 480px\)" \/>/);
  });

  // Lighthouse on the preview: the cover is the page's largest paint, and it
  // had no priority hint. /system shows a dozen heroes, so it's opt-in.
  test("asks for the cover first only when the page says it's the main image", () => {
    assert.match(hero, /priority\?: boolean/);
    assert.match(hero, /fetchPriority: priority \? "high" : undefined/);
  });

  // Reno's call, 18 Nov 2026: a 3x phone took the 1080 and went to about
  // 364 kB, over the 350 kB budget. Below 768 px the img offers nothing wider.
  test("keeps phones to the capped file, in its srcset and its src", () => {
    assert.match(coverFrame(), /<img[^>]*src=\{phone\.src\}[^>]*srcSet=\{phone\.srcSet\}/);
    assert.match(hero, /phoneCover\(cover\.srcSet, cover\.src\)/);
  });

  test("lets the picture take no box of its own, so the image still fills the frame", () => {
    assert.match(block(NARROW, ".coverPicture"), /display:\s*contents/);
  });

  test("plays through a primary Button that carries aria-pressed", () => {
    assert.match(hero, /<Button\s+variant="primary"\s+icon=\{view\.play\.icon\}\s+label=\{view\.play\.label\}\s+pressed=\{view\.play\.pressed\}/);
    assert.match(hero, /onPlay\(view\.leadTrackId\)/);
  });

  test("streams through StreamLinks chips, from the release's own links", () => {
    assert.match(hero, /<StreamLinks variant="chips" heading=\{view\.streamHeading\} links=\{release\.links\}/);
  });

  test("renders the tracklist as list TrackRows, the ones past five hidden until Show all", () => {
    assert.match(list, /variant="list"/);
    assert.match(list, /lead=\{t\.lead\}/);
    assert.match(list, /<div id=\{restId\} hidden=\{!open\}>/);
    assert.match(list, /aria-expanded=\{open\}/);
    assert.match(list, /aria-controls=\{restId\}/);
  });

  test("hides the toggle's chevron and the lead note's place in the tree is plain text", () => {
    assert.match(list, /<svg[^>]*aria-hidden/);
    assert.ok(!/aria-live|role="status"/.test(hero + list));
  });
});

describe("ReleaseHero's layout", () => {
  test("keeps the cover square, at the large radius, with a hairline and the cover glow", () => {
    assert.equal(value(NARROW, ".cover", "aspect-ratio"), "1");
    assert.equal(value(NARROW, ".cover", "border-radius"), "var(--dg-radius-l)");
    assert.equal(value(NARROW, ".cover", "border"), "1px solid var(--dg-line)");
    assert.equal(value(NARROW, ".cover", "box-shadow"), "var(--dg-glow-cover)");
    assert.equal(value(NARROW, ".coverImage", "width"), "100%");
    assert.equal(value(NARROW, ".coverImage", "height"), "100%");
  });

  test("puts no filter, overlay or text on the cover", () => {
    const coverRules = rules(css).filter((r) => r.selectors.some((s) => /\.cover/.test(s)));
    assert.ok(coverRules.every((r) => !/::?(?:before|after)/.test(r.selectors.join())), "no pseudo-element on the cover");
    assert.ok(coverRules.every((r) => !/(?:^|[;\s])(?:filter|mix-blend-mode|opacity|backdrop-filter)\s*:/.test(r.body)));
  });

  test("sets the title in Aero at the hero size, with one weight, wrapping a long word", () => {
    assert.equal(value(NARROW, ".title", "font-family"), "var(--dg-font-display)");
    assert.equal(value(NARROW, ".title", "font-size"), "var(--dg-text-display-xl)");
    assert.equal(value(NARROW, ".title", "font-weight"), "400");
    assert.equal(value(NARROW, ".title", "overflow-wrap"), "anywhere");
  });

  test("tints the label's star amber, in label type", () => {
    assert.equal(value(NARROW, ".label", "--dg-star"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".label", "color"), "var(--dg-accent)");
    assert.equal(value(NARROW, ".label", "font-size"), "var(--dg-text-label)");
  });

  test("is one column below 768 px and two from it, with the cover on the left", () => {
    assert.equal(value(NARROW, ".hero", "display"), "grid");
    assert.equal(value(NARROW, ".hero", "grid-template-columns"), undefined);
    assert.match(value(WIDE, ".single", "grid-template-columns") ?? "", /^minmax\(0, 480px\) minmax\(0, \d+px\)$/);
    assert.match(value(WIDE, ".group", "grid-template-columns") ?? "", /^minmax\(0, 440px\) minmax\(0, \d+px\)$/);
    assert.match(value(WIDE, ".single", "grid-template-areas") ?? "", /^"cover \." "cover label" "cover body" "cover \."$/);
    assert.match(value(WIDE, ".group", "grid-template-areas") ?? "", /^"cover label" "cover body" "cover \."$/);
    assert.equal(value(WIDE, ".cover", "grid-area"), "cover");
  });

  test("keeps the main button's row one line, so Stop snippet moves nothing below it", () => {
    assert.equal(value(NARROW, ".actions", "flex-wrap"), undefined);
    assert.equal(value(NARROW, ".leadNote", "white-space"), "nowrap");
    assert.equal(value(NARROW, ".leadNote", "text-overflow"), "ellipsis");
    assert.equal(value(NARROW, ".leadNote", "min-width"), "0");
  });

  test("notes the lead track in the small readout, muted", () => {
    assert.equal(value(NARROW, ".leadNote", "font-family"), "var(--dg-font-readout)");
    assert.equal(value(NARROW, ".leadNote", "font-size"), "var(--dg-text-readout-s)");
    assert.equal(value(NARROW, ".leadNote", "color"), "var(--dg-fg-subtle)");
  });
});

describe("ReleaseHero's Show all toggle", () => {
  test("is a 44 px target with an outline that reaches 3:1, where the board draws a hairline", () => {
    assert.equal(value(NARROW, ".showAll", "min-height"), "44px");
    assert.equal(value(NARROW, ".showAll", "border"), "1px solid var(--dg-outline)");
    assert.ok(tokenContrast(tokens, "--dg-outline", "--dg-bg") >= 3);
  });

  test("spans the column on a phone and fits its words from 768 px", () => {
    assert.equal(value(NARROW, ".showAll", "width"), "100%");
    assert.equal(value(WIDE, ".showAll", "width"), "auto");
  });

  test("flips its chevron while open", () => {
    assert.equal(value(NARROW, ".open", "transform"), "rotate(180deg)");
    assert.match(list, /open \? `\$\{styles\.chevron\} \$\{styles\.open\}`/);
  });

  test("rings focus 2 px out, hovers amber only for a real pointer, and never transitions", () => {
    assert.equal(value(NARROW, ".showAll:focus-visible", "outline"), "2px solid var(--dg-focus)");
    assert.equal(value(NARROW, ".showAll:focus-visible", "outline-offset"), "2px");
    assert.equal(value(HOVER, ".showAll:hover", "color"), "var(--dg-accent)");
    assert.equal(value(HOVER, ".showAll:hover", "border-color"), "var(--dg-accent)");
    assert.ok(!/:hover/.test(NARROW + WIDE));
    assert.ok(!/transition/.test(css));
  });

  test("its muted words and its hover reach 4.5:1 on the page", () => {
    assert.ok(tokenContrast(tokens, "--dg-fg-muted", "--dg-bg") >= 4.5);
    assert.ok(tokenContrast(tokens, "--dg-accent", "--dg-bg") >= 4.5);
  });
});

describe("phoneCover", () => {
  const url = (width: number) => `https://media.thesamegatsby.com/covers/x.12345678.${width}.webp`;
  const all = [768, 1080].map((width) => `${url(width)} ${width}w`).join(", ");

  test("caps a phone at the 768 px file", () => {
    assert.equal(HERO_PHONE_COVER_WIDTH, 768);
    assert.deepEqual(phoneCover(all, url(1080)), { srcSet: `${url(768)} 768w`, src: url(768) });
  });

  test("keeps every width up to the cap, and takes the widest as src", () => {
    const wider = [192, 384, 768, 1080].map((width) => `${url(width)} ${width}w`).join(", ");
    assert.deepEqual(phoneCover(wider, url(1080)), {
      srcSet: [192, 384, 768].map((width) => `${url(width)} ${width}w`).join(", "),
      src: url(768),
    });
  });

  test("works on /system's local fixtures, which carry ?w=", () => {
    const local = "/system-fixtures/x.jpg?w=768 768w, /system-fixtures/x.jpg?w=1080 1080w";
    assert.deepEqual(phoneCover(local, "/system-fixtures/x.jpg?w=1080"), {
      srcSet: "/system-fixtures/x.jpg?w=768 768w",
      src: "/system-fixtures/x.jpg?w=768",
    });
  });

  test("leaves the image alone when no file fits under the cap", () => {
    assert.deepEqual(phoneCover(`${url(1080)} 1080w`, url(1080)), { srcSet: `${url(1080)} 1080w`, src: url(1080) });
    assert.deepEqual(phoneCover(undefined, url(1080)), { srcSet: undefined, src: url(1080) });
  });
});
