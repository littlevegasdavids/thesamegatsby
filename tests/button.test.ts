import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseTokens, tokenContrast } from "../src/design-system/contrast.ts";
// Type-only, so Node strips it and never loads the .tsx. `npm run typecheck`
// checks the @ts-expect-error lines below against it.
import type { ButtonProps } from "../src/design-system/components/Button/Button.tsx";
import { GLYPHS } from "../src/design-system/components/Button/glyphs.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/design-system/${path}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = read("components/Button/Button.module.css");
const tokens = parseTokens(read("tokens.css"), 360);

// Every innermost rule in the file, top level or inside an @media block.
const RULES = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.split(",").map((selector) => selector.trim()),
  body,
}));

// Every value `property` takes in rules that list `selector`.
function values(selector: string, property: string): string[] {
  return RULES.filter((rule) => rule.selectors.includes(selector)).flatMap(({ body }) =>
    [...body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)]
      .filter(([, name]) => name === property)
      .map(([, , value]) => value.trim().replace(/\s+/g, " ")),
  );
}

function value(selector: string, property: string): string {
  const found = values(selector, property);
  assert.equal(found.length, 1, `${selector} sets ${property} ${found.length} times`);
  return found[0];
}

function token(selector: string, property: string): string {
  const match = /^var\((--dg-[\w-]+)\)$/.exec(value(selector, property));
  assert.ok(match, `${selector}'s ${property} isn't a single token`);
  return match[1];
}

const px = (selector: string, property: string) => Number(/^(\d+)px$/.exec(value(selector, property))?.[1]);

// Ghost and hardware buttons are clear, so their label lands on whatever
// they sit on: the page, a raised surface, or the now-playing bar.
const SURFACES = ["--dg-bg", "--dg-surface", "--dg-surface-raised"];

describe("ButtonProps", () => {
  test("a hardware button needs an icon and a label, so it's never nameless", () => {
    const stop: ButtonProps = { variant: "hardware", icon: "stop", label: "Stop snippet" };
    // @ts-expect-error: without a label, the icon-only button has no accessible name
    const nameless: ButtonProps = { variant: "hardware", icon: "stop" };
    // @ts-expect-error: a hardware button is square and shows only its icon
    const blank: ButtonProps = { variant: "hardware", label: "Stop snippet" };
    assert.deepEqual([stop, nameless, blank].map((props) => props.variant), ["hardware", "hardware", "hardware"]);
  });

  test("a primary or ghost button shows its label, with the icon optional", () => {
    const play: ButtonProps = { variant: "primary", icon: "play", label: "Play snippet" };
    const ghost: ButtonProps = { variant: "ghost", label: "Show all" };
    // @ts-expect-error: a primary button with only an icon would have no name
    const iconOnly: ButtonProps = { variant: "primary", icon: "play" };
    assert.deepEqual([play, ghost, iconOnly].map((props) => props.variant), ["primary", "ghost", "primary"]);
  });
});

describe("Button.module.css", () => {
  describe("targets", () => {
    test("primary is 48 px tall, as drawn", () => {
      assert.equal(px(".primary", "min-height"), 48);
    });

    test("ghost is 48 px tall, as drawn on the style tile", () => {
      assert.equal(px(".ghost", "min-height"), 48);
    });

    test("hardware is a 44 px square", () => {
      assert.equal(px(".hardware", "width"), 44);
      assert.equal(px(".hardware", "height"), 44);
    });

    test("every glyph fits inside the hardware button's border", () => {
      for (const [name, glyph] of Object.entries(GLYPHS)) {
        assert.ok(glyph.size <= 44 - 2, `${name} is ${glyph.size} px`);
      }
    });
  });

  describe("focus", () => {
    test("rings keyboard focus in --dg-focus", () => {
      assert.match(value(".button:focus-visible", "outline"), /^2px solid var\(--dg-focus\)$/);
      assert.ok(px(".button:focus-visible", "outline-offset") > 0, "the ring must stand off the button");
    });

    test("rings keyboard focus only, never a mouse click", () => {
      const focus = RULES.flatMap((rule) => rule.selectors).filter((selector) => /:focus(?!-visible)/.test(selector));
      assert.deepEqual(focus, []);
    });

    test("draws the chamfer on a layer inside the button, so it can't clip the ring", () => {
      assert.equal(value(".primary::before", "clip-path"), "var(--dg-chamfer)");
      const clipped = RULES.filter(({ body }) => /clip-path/.test(body)).flatMap((rule) => rule.selectors);
      assert.deepEqual(clipped, [".primary::before"]);
    });

    test("the ring reaches 3:1 on every surface a button sits on", () => {
      for (const surface of SURFACES) {
        const ratio = tokenContrast(tokens, "--dg-focus", surface);
        assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1 on ${surface}`);
      }
    });
  });

  describe("disabled", () => {
    test("styles the disabled attribute, so the state is announced and can't take focus", () => {
      for (const variant of [".primary", ".ghost", ".hardware"]) {
        assert.equal(values(`${variant}:disabled`, "color").length, 1, `${variant} has no :disabled look`);
      }
      assert.doesNotMatch(css, /aria-disabled/);
    });

    test("hover and press leave a disabled button alone", () => {
      const live = RULES.flatMap((rule) => rule.selectors).filter((selector) => /:(?:hover|active)/.test(selector));
      assert.ok(live.length > 0);
      for (const selector of live) assert.match(selector, /:enabled:(?:hover|active)/);
    });
  });

  // The todo's "the label passes contrast in every variant", in every state
  // with a look of its own. A hardware button's label is its accessible name;
  // what shows is the icon, which needs 3:1 as a graphic.
  describe("label contrast", () => {
    const LABELS = [
      { name: "primary", fg: ".primary", bg: ".primary::before", needs: 4.5 },
      { name: "primary, disabled", fg: ".primary:disabled", bg: ".primary:disabled::before", needs: 4.5 },
      { name: "ghost", fg: ".ghost", needs: 4.5 },
      { name: "ghost, hovered", fg: ".ghost", bg: ".ghost:enabled:hover", needs: 4.5 },
      { name: "ghost, pressed", fg: ".ghost", bg: ".ghost:enabled:active", needs: 4.5 },
      { name: "ghost, disabled", fg: ".ghost:disabled", needs: 4.5 },
      { name: "hardware icon", fg: ".hardware", needs: 3 },
      { name: "hardware icon, hovered", fg: ".hardware", bg: ".hardware:enabled:hover", needs: 3 },
      { name: "hardware icon, pressed", fg: ".hardware", bg: ".hardware:enabled:active", needs: 3 },
      { name: "hardware icon, disabled", fg: ".hardware:disabled", needs: 3 },
    ];

    test("ghost and hardware are clear until hovered or pressed", () => {
      assert.equal(value(".button", "background-color"), "transparent");
      for (const variant of [".ghost", ".hardware"]) assert.deepEqual(values(variant, "background-color"), []);
    });

    for (const { name, fg, bg, needs } of LABELS) {
      for (const surface of bg ? [bg] : SURFACES) {
        test(`${name} reaches ${needs}:1${bg ? "" : ` on ${surface}`}`, () => {
          const back = bg ? token(bg, "background-color") : surface;
          const ratio = tokenContrast(tokens, token(fg, "color"), back);
          assert.ok(ratio >= needs, `${ratio.toFixed(2)}:1 is under ${needs}:1`);
        });
      }
    }

    test("the ghost and hardware outline reaches 3:1 on every surface", () => {
      for (const variant of [".ghost", ".hardware"]) {
        assert.equal(value(variant, "border"), "1px solid var(--dg-outline)");
      }
      for (const surface of SURFACES) {
        const ratio = tokenContrast(tokens, "--dg-outline", surface);
        assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1 on ${surface}`);
      }
    });
  });
});
