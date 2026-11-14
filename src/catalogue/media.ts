import type { Cover, CoverFormat, Snippet } from "./types.ts";

export const MEDIA_ORIGIN = "https://media.thesamegatsby.com";

export const snippetUrl = (snippet: Snippet) => `${MEDIA_ORIGIN}/${snippet.key}`;

export const coverUrl = (cover: Cover, width: number, format: CoverFormat) =>
  `${MEDIA_ORIGIN}/${cover.key}.${width}.${format}`;

export const coverSrcSet = (cover: Cover, format: CoverFormat) =>
  cover.widths.map((width) => `${coverUrl(cover, width, format)} ${width}w`).join(", ");
