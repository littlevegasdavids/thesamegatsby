import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// SPEC.md, confirmed assumption 3: the old site's UI and audio libraries are
// gone. audio-engine replaced Howler with one native <audio> element.
const REMOVED = ["howler", "@types/howler", "@chakra-ui/react", "@emotion/react", "@emotion/styled", "framer-motion", "react-icons"];

test("none of the old site's libraries is a dependency", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  assert.deepEqual(declared.filter((name) => REMOVED.includes(name)), []);
});

test("nor is any of them in the lockfile's root package", () => {
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const root = lock.packages[""];
  const declared = Object.keys({ ...root.dependencies, ...root.devDependencies });
  assert.deepEqual(declared.filter((name) => REMOVED.includes(name)), []);
});
