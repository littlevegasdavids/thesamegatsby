import { STAR_PATH } from "../../design-system/components/SparkleStar/star";
import { WORDMARK_EM, WORDMARK_PATH, WORDMARK_TONES } from "../../design-system/components/Wordmark/outline";
import { FORMATS, centreCrop, fitTitle, kitLayout, titleLineHeight, type KitFormat } from "./artwork";

// Tokens resolved by the browser, so no colour is written here. A probe turns
// each into a value the canvas accepts, color-mix() included.
const COLOURS = {
  ground: "var(--dg-bg)",
  glow: "var(--dg-grid-glow)",
  grid: "var(--dg-grid-line)",
  line: "var(--dg-line)",
  coverGlow: "color-mix(in srgb, var(--dg-ultra-500) 25%, transparent)",
  bone: "var(--dg-fg)",
  ultra: "var(--dg-ultra-500)",
  hazard: "color-mix(in srgb, var(--dg-hazard-500) 55%, transparent)",
  accent: "var(--dg-accent)",
  star: "var(--dg-star)",
} as const;

export type KitPalette = Record<keyof typeof COLOURS, string> & { display: string; readout: string };

export function readPalette(): KitPalette {
  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.append(probe);
  const colours = Object.fromEntries(
    Object.entries(COLOURS).map(([name, value]) => {
      probe.style.color = value;
      return [name, getComputedStyle(probe).color];
    }),
  ) as Record<keyof typeof COLOURS, string>;
  probe.remove();
  const root = getComputedStyle(document.documentElement);
  return {
    ...colours,
    display: root.getPropertyValue("--dg-font-display").trim(),
    readout: root.getPropertyValue("--dg-font-readout").trim(),
  };
}

export type KitArt = { title: string; label: string; cover: CanvasImageSource; coverWidth: number; coverHeight: number };

const GRID_CELL = 72;
const COVER_RADIUS = 24;

function ground(ctx: CanvasRenderingContext2D, width: number, height: number, palette: KitPalette) {
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, height * 0.2, 0, width / 2, height * 0.2, height * 0.7);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.grid;
  for (let x = 0; x < width; x += GRID_CELL) ctx.fillRect(x, 0, 2, height);
  for (let y = 0; y < height; y += GRID_CELL) ctx.fillRect(0, y, width, 2);
}

function cover(ctx: CanvasRenderingContext2D, art: KitArt, box: { x: number; y: number; width: number; height: number }, palette: KitPalette) {
  const crop = centreCrop(art.coverWidth, art.coverHeight);
  ctx.save();
  ctx.shadowColor = palette.coverGlow;
  ctx.shadowBlur = 80;
  ctx.fillStyle = palette.ground;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, COVER_RADIUS);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, COVER_RADIUS);
  ctx.clip();
  ctx.drawImage(art.cover, crop.x, crop.y, crop.side, crop.side, box.x, box.y, box.width, box.height);
  ctx.restore();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, COVER_RADIUS);
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, palette: KitPalette) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = palette.star;
  ctx.fill(new Path2D(STAR_PATH));
  ctx.restore();
}

function wordmark(ctx: CanvasRenderingContext2D, box: { x: number; y: number; height: number }, palette: KitPalette) {
  const fills = { hazard: palette.hazard, ultra: palette.ultra, bone: palette.bone };
  const path = new Path2D(WORDMARK_PATH);
  const scale = box.height / WORDMARK_EM;
  for (const { x, y, fill } of WORDMARK_TONES.screen) {
    ctx.save();
    ctx.translate(box.x + x * scale, box.y + y * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = fills[fill];
    ctx.fill(path);
    ctx.restore();
  }
}

// Draws the whole piece. The canvas is both the preview and the export.
export function drawKit(canvas: HTMLCanvasElement, format: KitFormat, art: KitArt, palette: KitPalette) {
  const { width, height } = FORMATS[format];
  const layout = kitLayout(format);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw the artwork");

  ground(ctx, width, height, palette);
  cover(ctx, art, layout.cover, palette);
  wordmark(ctx, layout.wordmark, palette);

  const labelSize = layout.label.height;
  star(ctx, layout.label.x, layout.label.y + labelSize * 0.1, labelSize * 0.8, palette);
  ctx.textBaseline = "alphabetic";
  ctx.font = `${labelSize}px ${palette.readout}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText(art.label, layout.label.x + labelSize, layout.label.y + labelSize * 0.8);

  const fontFor = (size: number) => `${size}px ${palette.display}`;
  const measure = (text: string, size: number) => {
    ctx.font = fontFor(size);
    return ctx.measureText(text).width;
  };
  const { size, lines } = fitTitle(art.title, { width: layout.title.width, height: layout.title.height, maxLines: layout.titleLines }, measure);
  ctx.font = fontFor(size);
  // The V5 stacked tape, back to front, as --dg-tape sets it on hero titles.
  const copies = [
    { x: 0.06, y: 0.08, fill: palette.hazard },
    { x: 0.03, y: 0.04, fill: palette.ultra },
    { x: 0, y: 0, fill: palette.bone },
  ];
  lines.forEach((line, index) => {
    const baseline = layout.title.y + titleLineHeight(size) * index + size * 0.86;
    for (const copy of copies) {
      ctx.fillStyle = copy.fill;
      ctx.fillText(line, layout.title.x + copy.x * size, baseline + copy.y * size);
    }
  });
}
