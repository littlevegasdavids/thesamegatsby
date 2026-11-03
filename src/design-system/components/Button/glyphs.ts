// The glyphs the canvas draws on its buttons, at the sizes it draws them:
// play on the primary, then stop, replay and close on the hardware buttons.
// Kept out of the .tsx so tests/button.test.ts can check them. They paint in
// currentColor, so each takes its button's label colour.
export type ButtonIcon = "play" | "stop" | "replay" | "close";

export const GLYPH_VIEWBOX = "0 0 24 24";

export const GLYPHS: Record<ButtonIcon, { size: number; d: string; stroke?: true }> = {
  play: { size: 16, d: "M7 4.5v15l13-7.5z" },
  stop: { size: 14, d: "M5 5h14v14H5z" },
  replay: { size: 18, d: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4", stroke: true },
  close: { size: 16, d: "M6 6l12 12M18 6L6 18", stroke: true },
};
