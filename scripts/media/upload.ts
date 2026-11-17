import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MEDIA_ORIGIN } from "../../src/catalogue/media.ts";

// Uploading to R2 and checking the media domain serves what went up. Wrangler
// is logged in with OAuth (`wrangler login`), so there are no R2 keys and
// nothing secret here (SPEC-cloudflare-infra.md).
const run = promisify(execFile);

export const BUCKET = "thesamegatsby-media";
export const CACHE_CONTROL = "public, max-age=31536000, immutable";
const TYPES: Record<string, string> = { m4a: "audio/mp4", avif: "image/avif", webp: "image/webp" };

export function contentTypeFor(key: string): string {
  const extension = key.split(".").at(-1)!;
  const type = TYPES[extension];
  if (!type) throw new Error(`add-song: no content type for .${extension} files`);
  return type;
}

export const wranglerPutArgs = (key: string, file: string) => [
  "--no-install",
  "wrangler",
  "r2",
  "object",
  "put",
  `${BUCKET}/${key}`,
  "--file",
  file,
  "--content-type",
  contentTypeFor(key),
  "--cache-control",
  CACHE_CONTROL,
  "--remote",
];

export type Head = { status: number; contentType?: string; cacheControl?: string; contentLength?: number };

// What's wrong with a key's HEAD, or undefined. A cover's size isn't in the
// catalogue, so check-media passes no size for covers.
export function checkHead(key: string, head: Head, size?: number): string | undefined {
  const problems: string[] = [];
  if (head.status !== 200) return `${key}: ${head.status} from ${MEDIA_ORIGIN}`;
  if (head.contentType !== contentTypeFor(key)) problems.push(`content-type ${head.contentType ?? "missing"}`);
  if (head.cacheControl !== CACHE_CONTROL) problems.push(`cache-control ${head.cacheControl ?? "missing"}`);
  if (size !== undefined && head.contentLength !== size) problems.push(`${head.contentLength ?? "no"} bytes, not ${size}`);
  return problems.length > 0 ? `${key}: ${problems.join(", ")}` : undefined;
}

// The three calls add-song makes, passed in so the tests use a fake bucket.
export type MediaTools = {
  whoami: () => Promise<void>;
  put: (key: string, file: string, contentType: string) => Promise<void>;
  head: (key: string) => Promise<Head>;
};

export const realMedia: MediaTools = {
  // The output names the account's email, so it's matched, never printed.
  async whoami() {
    let stdout = "";
    try {
      ({ stdout } = await run("npx", ["--no-install", "wrangler", "whoami"]));
    } catch {
      // Falls through to the message below.
    }
    if (!/You are logged in/.test(stdout)) throw new Error("add-song: Wrangler isn't logged in: run npx wrangler login, then try again");
  },
  async put(key, file) {
    try {
      await run("npx", wranglerPutArgs(key, file));
    } catch (error) {
      const detail = ((error as { stderr?: string }).stderr ?? "").trim().split("\n").at(-1);
      throw new Error(`add-song: uploading ${key} failed${detail ? `: ${detail}` : ""}`);
    }
  },
  async head(key) {
    const response = await fetch(`${MEDIA_ORIGIN}/${key}`, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
    const length = response.headers.get("content-length");
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? undefined,
      cacheControl: response.headers.get("cache-control") ?? undefined,
      contentLength: length === null ? undefined : Number(length),
    };
  },
};
