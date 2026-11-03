// The four-point star drawn for this system on the canvas, kept out of the
// .tsx so tests/sparkle-star.test.ts can check it against the asset file.
export const STAR_VIEWBOX = "0 0 24 24";
export const STAR_PATH = "M12 1c.7 6.2 4.8 10.3 11 11-6.2.7-10.3 4.8-11 11-.7-6.2-4.8-10.3-11-11 6.2-.7 10.3-4.8 11-11z";

// Decorative unless labelled. An empty label counts as none, so the star is
// never an image without a name.
export function starA11y(label?: string) {
  return label ? ({ role: "img", "aria-label": label } as const) : ({ "aria-hidden": true } as const);
}
