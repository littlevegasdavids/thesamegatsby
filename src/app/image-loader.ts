import { MEDIA_ORIGIN } from "../catalogue/media.ts";

// next/image's loader under static export (next.config.ts). media-pipeline
// builds every cover at these widths, so a cover's URL is rewritten to the
// smallest one that fills what next/image asks for: a 60 px row at 2x asks
// for 128 and loads the 192. Anything else, such as /system's local
// fixtures, passes through with a ?w= the server ignores, which keeps
// next/image's check that a loader uses the width quiet.
export const COVER_WIDTHS = [192, 384, 768, 1080] as const;

const SIZED_COVER = /^(\/covers\/[^/]+\.)\d+(\.(?:webp|avif))$/;

type LoaderProps = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width }: LoaderProps): string {
  if (src.startsWith(`${MEDIA_ORIGIN}/`)) {
    const match = SIZED_COVER.exec(src.slice(MEDIA_ORIGIN.length));
    if (match) {
      const built = COVER_WIDTHS.find((w) => w >= width) ?? COVER_WIDTHS[COVER_WIDTHS.length - 1];
      return `${MEDIA_ORIGIN}${match[1]}${built}${match[2]}`;
    }
  }
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
