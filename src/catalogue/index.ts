import data from "./songs.json" with { type: "json" };
import { parseCatalogue } from "./validate.ts";

// Validated when it's imported, so a bad hand edit to songs.json fails
// `next build` as well as the tests. site imports this in a server component,
// so the validation never ships to the browser.
export const catalogue = parseCatalogue(data);

export { MEDIA_ORIGIN, coverSrcSet, coverUrl, snippetUrl } from "./media.ts";
export type * from "./types.ts";
