import type { ReleaseType } from "../../src/catalogue/types.ts";
import { KEBAB } from "../../src/catalogue/validate.ts";

// Kebab-case ASCII from a title: "Welcome to Vapor_City" becomes
// welcome-to-vapor-city and "Can't You See" becomes cant-you-see. Ids don't
// change once published, so --id overrides this rather than a later rename.
export function trackId(title: string): string {
  const id = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents, split off by NFKD
    .replace(/['’]/g, "") // apostrophes join their word: cant, not can-t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!KEBAB.test(id)) throw new Error(`"${title}" has no letters or digits to make an id from: pass --id`);
  return id;
}

// An EP's or album's id takes a suffix so it never clashes with its title
// track. A single's id is its track's.
export function releaseId(title: string, type: ReleaseType): string {
  const id = trackId(title);
  return type === "single" ? id : `${id}-${type}`;
}
