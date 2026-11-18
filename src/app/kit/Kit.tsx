"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
// From its own file, not index.ts: the barrel would bring every component's CSS.
import { Button } from "../../design-system/components/Button/Button";
import { drawKit, readPalette, type KitPalette } from "./draw";
import { COVER_SOURCE_WIDTH, FORMATS, fileName, isImageFile, type KitFormat, type KitTrack } from "./artwork";
import styles from "./kit.module.css";

const FORMAT_NAMES: Record<KitFormat, string> = { post: "post", story: "story" };
const KIT_FORMATS = Object.keys(FORMATS) as KitFormat[];

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // The media domain allows this, and without it the canvas couldn't export.
    if (crossOrigin) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image failed"));
    image.src = src;
  });
}

async function loadFonts(palette: KitPalette, title: string, label: string) {
  await Promise.all([document.fonts.load(`100px ${palette.display}`, title), document.fonts.load(`48px ${palette.readout}`, label)]);
}

function download(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function Kit({ tracks }: { tracks: readonly KitTrack[] }) {
  const [trackId, setTrackId] = useState(tracks[0].id);
  // A picked file stays in the browser, as an object URL.
  const [upload, setUpload] = useState<{ url: string; name: string } | null>(null);
  const [status, setStatus] = useState<{ ready: boolean; message: string }>({ ready: false, message: "Drawing…" });
  const canvases = useRef<Partial<Record<KitFormat, HTMLCanvasElement | null>>>({});
  const track = tracks.find(({ id }) => id === trackId) ?? tracks[0];

  useEffect(() => {
    let current = true;
    (async () => {
      setStatus({ ready: false, message: "Drawing…" });
      try {
        const palette = readPalette();
        const [cover] = await Promise.all([
          loadImage(upload?.url ?? track.cover, !upload),
          loadFonts(palette, track.title, track.label),
        ]);
        if (!current) return;
        const art = { title: track.title, label: track.label, cover, coverWidth: cover.naturalWidth, coverHeight: cover.naturalHeight };
        for (const format of KIT_FORMATS) {
          const canvas = canvases.current[format];
          if (canvas) drawKit(canvas, format, art, palette);
        }
        const small = Math.min(cover.naturalWidth, cover.naturalHeight) < COVER_SOURCE_WIDTH;
        setStatus({ ready: true, message: upload && small ? "This image is under 1080 px, so it may look soft." : "" });
      } catch {
        if (current) setStatus({ ready: false, message: upload ? "That image couldn't be read. Try a JPEG, PNG or WebP." : "The cover couldn't be loaded." });
      }
    })();
    return () => {
      current = false;
    };
  }, [track, upload]);

  useEffect(() => () => {
    if (upload) URL.revokeObjectURL(upload.url);
  }, [upload]);

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isImageFile(file)) {
      setStatus((now) => ({ ...now, message: "That file isn't an image." }));
      return;
    }
    setUpload({ url: URL.createObjectURL(file), name: file.name });
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Release kit</h1>
      <p className={styles.lede}>Pick a track and download its post and story. A cover you choose stays on this device.</p>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span>Track</span>
          <select className={styles.select} value={track.id} onChange={(event) => setTrackId(event.target.value)}>
            {tracks.map(({ id, title }) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Cover</span>
          <input className={styles.file} type="file" accept="image/*" onChange={pickFile} />
        </label>
        {upload && (
          <p className={styles.using}>
            Using {upload.name}{" "}
            <button type="button" className={styles.reset} onClick={() => setUpload(null)}>Use the release cover</button>
          </p>
        )}
      </div>

      <p className={styles.status} role="status">{status.message}</p>

      <div className={styles.outputs}>
        {KIT_FORMATS.map((format) => (
          <section key={format} className={styles.output} aria-label={`${FORMAT_NAMES[format]} preview`}>
            <canvas
              ref={(node) => { canvases.current[format] = node; }}
              className={styles.canvas}
              width={FORMATS[format].width}
              height={FORMATS[format].height}
              role="img"
              aria-label={`${track.title} ${FORMAT_NAMES[format]}, ${FORMATS[format].width} by ${FORMATS[format].height} pixels`}
            />
            <Button
              variant="primary"
              label={`Download ${FORMAT_NAMES[format]}`}
              disabled={!status.ready}
              onClick={() => {
                const canvas = canvases.current[format];
                if (canvas) download(canvas, fileName(track.id, format));
              }}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
