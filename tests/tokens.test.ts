import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  composite,
  contrastRatio,
  parseTokens,
  resolveColor,
  tokenContrast,
} from "../src/design-system/contrast.ts";

const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

describe("contrastRatio", () => {
  test("gives 21 for black on white, in either order", () => {
    assert.equal(contrastRatio(BLACK, WHITE), 21);
    assert.equal(contrastRatio(WHITE, BLACK), 21);
  });

  test("gives 1 for a colour on itself", () => {
    assert.equal(contrastRatio(WHITE, WHITE), 1);
  });

  test("matches the WCAG reference grey, #767676 on white at 4.54", () => {
    const grey = { r: 0x76, g: 0x76, b: 0x76, a: 1 };
    assert.equal(contrastRatio(grey, WHITE).toFixed(2), "4.54");
  });

  test("refuses a translucent colour, which has no ratio until it's composited", () => {
    assert.throws(() => contrastRatio({ ...WHITE, a: 0.5 }, BLACK), /opaque/);
  });
});

describe("composite", () => {
  test("paints a translucent colour over an opaque one", () => {
    assert.deepEqual(composite({ ...WHITE, a: 0.5 }, BLACK), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
  });

  test("refuses a translucent backdrop", () => {
    assert.throws(() => composite(WHITE, { ...BLACK, a: 0.5 }), /opaque/);
  });
});

describe("parseTokens", () => {
  const css = `
    /* --dg-commented: #FFFFFF; */
    :root {
      --dg-gap: 6px;
      --dg-shadow: 0 8px 24px
        black;
    }
    @media (min-width: 768px) {
      :root {
        --dg-gap: 8px;
      }
    }
  `;

  test("reads the phone values below the breakpoint", () => {
    assert.equal(parseTokens(css, 360).get("--dg-gap"), "6px");
  });

  test("lets a min-width block override from its breakpoint up", () => {
    assert.equal(parseTokens(css, 767).get("--dg-gap"), "6px");
    assert.equal(parseTokens(css, 768).get("--dg-gap"), "8px");
  });

  test("joins a value that spans lines", () => {
    assert.equal(parseTokens(css, 360).get("--dg-shadow"), "0 8px 24px black");
  });

  test("skips comments", () => {
    assert.equal(parseTokens(css, 360).has("--dg-commented"), false);
  });

  test("throws on any other rule, so nothing in tokens.css goes unread", () => {
    assert.throws(
      () => parseTokens("@media (prefers-reduced-motion: reduce) { :root { --dg-dur-1: 0ms; } }", 360),
      /prefers-reduced-motion/,
    );
    assert.throws(() => parseTokens("body { --dg-bg: #000000; }", 360), /body/);
  });
});

describe("resolveColor", () => {
  const tokens = parseTokens(
    `:root {
      --dg-ink: #0E1120;
      --dg-surface: var(--dg-ink);
      --dg-glass: color-mix(in srgb, var(--dg-ink) 82%, transparent);
      --dg-named: red;
    }`,
    360,
  );

  test("reads a hex colour", () => {
    assert.deepEqual(resolveColor(tokens, "--dg-ink"), { r: 0x0e, g: 0x11, b: 0x20, a: 1 });
  });

  test("follows var() to the token it names", () => {
    assert.deepEqual(resolveColor(tokens, "--dg-surface"), resolveColor(tokens, "--dg-ink"));
  });

  test("reads a color-mix() with transparent as the colour at that opacity", () => {
    assert.deepEqual(resolveColor(tokens, "--dg-glass"), { r: 0x0e, g: 0x11, b: 0x20, a: 0.82 });
  });

  test("throws on a token that isn't defined", () => {
    assert.throws(() => resolveColor(tokens, "--dg-missing"), /--dg-missing/);
  });

  test("throws on colour syntax it doesn't parse", () => {
    assert.throws(() => resolveColor(tokens, "--dg-named"), /--dg-named/);
  });
});

describe("tokenContrast", () => {
  const tokens = parseTokens(
    `:root {
      --dg-black: #000000;
      --dg-white: #FFFFFF;
      --dg-half: color-mix(in srgb, var(--dg-white) 50%, transparent);
    }`,
    360,
  );

  test("composites a translucent surface over the backdrop before measuring", () => {
    const grey = { r: 127.5, g: 127.5, b: 127.5, a: 1 };
    assert.equal(
      tokenContrast(tokens, "--dg-white", "--dg-half", "--dg-black"),
      contrastRatio(WHITE, grey),
    );
  });
});

const css = readFileSync(new URL("../src/design-system/tokens.css", import.meta.url), "utf8");

describe("tokens.css", () => {
  // Every token named in SPEC-design-system.md, in the order the spec lists them.
  const SPEC_TOKENS = [
    // Colour primitives
    "--dg-ink-950", "--dg-ink-900", "--dg-ink-800", "--dg-ink-700",
    "--dg-bone-100", "--dg-bone-300", "--dg-bone-500",
    "--dg-sodium-400", "--dg-signal-300", "--dg-hazard-500", "--dg-ultra-500", "--dg-ultra-300",
    "--dg-white", "--dg-black",
    // Semantic tokens
    "--dg-bg", "--dg-surface", "--dg-surface-raised", "--dg-surface-glass", "--dg-glass-filter",
    "--dg-surface-translucent", "--dg-field", "--dg-accent-wash", "--dg-line", "--dg-outline",
    "--dg-fg", "--dg-fg-muted", "--dg-fg-subtle", "--dg-accent", "--dg-on-accent",
    "--dg-focus", "--dg-star", "--dg-rec", "--dg-link", "--dg-panel", "--dg-on-panel",
    // Typography
    "--dg-text-display-xl", "--dg-text-display-l", "--dg-text-title", "--dg-text-title-s",
    "--dg-text-body", "--dg-text-small", "--dg-text-label", "--dg-text-micro",
    "--dg-text-readout", "--dg-text-readout-s",
    "--dg-font-display", "--dg-font-ui", "--dg-font-readout",
    // Space, radius, motion, layers
    "--dg-space-1", "--dg-space-2", "--dg-space-3", "--dg-space-4", "--dg-space-5",
    "--dg-space-6", "--dg-space-7", "--dg-space-8", "--dg-space-9",
    "--dg-radius-0", "--dg-radius-s", "--dg-radius-m", "--dg-radius-l", "--dg-chamfer",
    "--dg-ease-tape", "--dg-dur-1", "--dg-dur-2", "--dg-dur-3",
    "--dg-z-texture", "--dg-z-bar", "--dg-z-overlay",
    // Sticky stack
    "--dg-header-inset", "--dg-header-h", "--dg-sticky-gap", "--dg-filter-h",
    "--dg-sticky-filter", "--dg-sticky-release",
    // Shadows, glows and the backdrop
    "--dg-shadow-float", "--dg-shadow-menu", "--dg-shadow-bar",
    "--dg-glow-accent", "--dg-glow-accent-box", "--dg-glow-cover",
    "--dg-tape", "--dg-tape-artwork",
    "--dg-grid-line", "--dg-grid-cell", "--dg-grid-drift", "--dg-grid-glow",
    "--dg-scanline", "--dg-vignette",
    // Textures
    "--dg-grain-opacity",
  ];

  test("defines every token in the spec", () => {
    const tokens = parseTokens(css, 360);
    assert.deepEqual(SPEC_TOKENS.filter((name) => !tokens.has(name)), []);
  });

  // SPEC-design-system.md › Contrast, one entry per pair. `over` is the opaque
  // colour a translucent surface is composited onto; it defaults to --dg-bg.
  // "line on bg" is decorative with no minimum, so it isn't checked.
  const PAIRS = [
    { fg: "--dg-fg", bg: "--dg-bg", needs: 4.5 },
    { fg: "--dg-fg", bg: "--dg-surface", needs: 4.5 },
    { fg: "--dg-fg", bg: "--dg-surface-raised", needs: 4.5 },
    { fg: "--dg-fg", bg: "--dg-surface-glass", needs: 4.5 },
    { fg: "--dg-fg-muted", bg: "--dg-surface-glass", needs: 4.5 },
    { fg: "--dg-fg-muted", bg: "--dg-bg", needs: 4.5 },
    { fg: "--dg-fg-muted", bg: "--dg-surface-raised", needs: 4.5 },
    { fg: "--dg-fg-subtle", bg: "--dg-bg", needs: 4.5 },
    { fg: "--dg-fg-subtle", bg: "--dg-surface-raised", needs: 4.5 },
    { fg: "--dg-fg-subtle", bg: "--dg-surface-translucent", needs: 4.5 },
    { fg: "--dg-accent", bg: "--dg-bg", needs: 4.5 },
    { fg: "--dg-accent", bg: "--dg-surface-raised", needs: 4.5 },
    { fg: "--dg-accent", bg: "--dg-accent-wash", over: "--dg-surface-raised", needs: 4.5 },
    { fg: "--dg-on-accent", bg: "--dg-accent", needs: 4.5 },
    { fg: "--dg-rec", bg: "--dg-bg", needs: 4.5 },
    { fg: "--dg-link", bg: "--dg-bg", needs: 4.5 },
    { fg: "--dg-on-panel", bg: "--dg-panel", needs: 4.5 },
  ];

  // Colours don't change at 768 px today, but a desktop override would only
  // show up in the desktop set.
  for (const width of [360, 1280]) {
    describe(`contrast at ${width} px`, () => {
      const tokens = parseTokens(css, width);
      for (const { fg, bg, over, needs } of PAIRS) {
        const where = over ? ` (over ${over})` : "";
        test(`${fg} on ${bg}${where} reaches ${needs}:1`, () => {
          const ratio = tokenContrast(tokens, fg, bg, over);
          assert.ok(ratio >= needs, `${ratio.toFixed(2)}:1 is under ${needs}:1`);
        });
      }
    });
  }
});
