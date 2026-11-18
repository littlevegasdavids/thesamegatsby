import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { COVER_HTML, README, buildTokens, specUsage } from "../scripts/design-system-export.ts";

const css = readFileSync(new URL("../src/design-system/tokens.css", import.meta.url), "utf8");
const spec = readFileSync(new URL("../SPEC-design-system.md", import.meta.url), "utf8");
const { tokens, skipped } = buildTokens(css, spec);
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

describe("tokens.json for the Design System artifact", () => {
  const lists = [tokens.color.tokens, tokens.spacing.tokens, tokens.radius.tokens];
  const all = lists.flat();

  test("reads the spec's usage notes", () => {
    assert.match(specUsage(spec).get("--dg-ink-950") ?? "", /Page ground/);
  });

  test("keeps the palette's exact values, and semantic colours as aliases", () => {
    const find = (name: string) => tokens.color.tokens.find((token) => token.name === name)?.value;
    assert.equal(find("ink-950"), "#07080d");
    assert.equal(find("sodium-400"), "#ffb23f");
    assert.equal(find("bg"), "{ink-950}");
    assert.equal(find("accent"), "{sodium-400}");
  });

  test("uses only values the artifact can read", () => {
    const names = new Set(tokens.color.tokens.map(({ name }) => name));
    for (const { name, value } of tokens.color.tokens) {
      const alias = /^\{(.+)\}$/.exec(value)?.[1];
      assert.ok(alias ? names.has(alias) : /^#[0-9a-f]{6}$/.test(value), `${name}: ${value}`);
    }
  });

  test("lists what it can't express, rather than dropping it silently", () => {
    assert.ok(skipped.includes("surface-glass"));
    assert.ok(skipped.includes("grid-line"));
  });

  test("gives every token a valid unique name and a usage note", () => {
    assert.equal(new Set(all.map(({ name }) => name)).size, all.length);
    for (const { name, usage } of all) {
      assert.match(name, NAME);
      assert.ok(usage.length > 0, name);
    }
  });

  test("has the spacing and radius scales", () => {
    assert.deepEqual(tokens.spacing.tokens.map(({ value }) => value), ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px"]);
    assert.deepEqual(tokens.radius.tokens.map(({ value }) => value), ["0", "4px", "8px", "12px"]);
  });

  test("has each type style in px, at its largest size", () => {
    const styles = Object.fromEntries(tokens.type.groups.flatMap(({ styles }) => styles.map((style) => [style.name, style])));
    assert.equal(styles["display-xl"].fontSize, "72px");
    assert.equal(styles["display-l"].fontSize, "36px");
    assert.equal(styles.readout.fontSize, "22px");
    assert.equal(styles.body.fontSize, "16px");
  });

  test("leaves Aero's file out until its licence is confirmed", () => {
    assert.deepEqual(tokens.type.fonts.map(({ family }) => family).sort(), ["Chakra Petch", "Chakra Petch", "VT323"]);
    assert.match(tokens.type.families.display, /^"Aero"/);
  });
});

describe("the brand book", () => {
  test("carries the rules Claude needs to make a post from a title and a cover", () => {
    for (const rule of [/1080 × 1350/, /1080 × 1920/, /never .*cover art/i, /below 24 px/, /at most two accents/i, /licen[cs]e/i]) assert.match(README, rule);
  });
});

describe("the cover", () => {
  test("starts with its marker, and draws only from tokens", () => {
    assert.match(COVER_HTML.split("\n")[0], /^<!-- @dsCard height=288 -->$/);
    assert.doesNotMatch(COVER_HTML, /<(img|iframe|object|embed)\b/);
    assert.doesNotMatch(COVER_HTML, /#[0-9a-f]{3,8}\b/i);
    assert.match(COVER_HTML, /Déjà Gatsby/);
  });
});
