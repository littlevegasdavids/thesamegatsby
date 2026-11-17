import { readFileSync } from "node:fs";
import { join } from "node:path";

// A token's value, read from tokens.css at build, for the places CSS can't
// reach: the theme-color tag and the images next/og draws. They take the
// value itself, so no colour is written twice. Server-only: it reads a file.

const DECLARATION = /(--dg-[\w-]+)\s*:\s*([^;]+);/g;
const VAR = /var\((--dg-[\w-]+)\)/g;

// The phone value, the first one written: the 768 px block redefines some
// tokens, and the images and tags aren't drawn at a width.
function declarations(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(DECLARATION)) {
    if (!found.has(name)) found.set(name, value.trim());
  }
  return found;
}

export function tokenValue(css: string, name: string): string {
  const all = declarations(css);
  const resolve = (token: string, seen: readonly string[]): string => {
    if (seen.includes(token)) throw new Error(`tokens.css: ${[...seen, token].join(" → ")} is a loop`);
    const value = all.get(token);
    if (value === undefined) throw new Error(`tokens.css has no ${token}`);
    return value.replace(VAR, (_, inner: string) => resolve(inner, [...seen, token]));
  };
  return resolve(name, []);
}

// next build and the tests both run from the repo's root.
export function token(name: string): string {
  return tokenValue(readFileSync(join(process.cwd(), "src/design-system/tokens.css"), "utf8"), name);
}
