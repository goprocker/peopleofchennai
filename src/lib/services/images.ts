import "server-only";
import sharp, { type Metadata } from "sharp";
import { AppError } from "@/lib/errors";
import {
  IMAGE_MAX_BYTES,
  IMAGE_MAX_DIMENSION,
  IMAGE_MIN_DIMENSION,
  type ImageMime,
} from "@/lib/validation/public-forms";

const FORMAT_TO_MIME: Record<string, ImageMime> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const MIME_TO_EXT: Record<ImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ProcessedImage {
  buffer: Buffer;
  mime: ImageMime;
  ext: string;
  width: number;
  height: number;
  size: number;
}

const photoError = (msg: string) => new AppError("VALIDATION", msg, { photo: [msg] });

/**
 * Validates an uploaded image by its actual bytes (never the client-supplied MIME type),
 * then re-encodes it: bakes in EXIF orientation and strips all metadata (GPS etc.).
 */
export async function processUploadedImage(file: Blob): Promise<ProcessedImage> {
  if (file.size === 0) throw photoError("The photo is empty.");
  if (file.size > IMAGE_MAX_BYTES) throw photoError("Images must be 5 MB or smaller.");

  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: IMAGE_MAX_DIMENSION * IMAGE_MAX_DIMENSION }).metadata();
  } catch {
    throw photoError("That file isn’t a readable image.");
  }
  const mime = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  if (!mime) throw photoError("Use a JPEG, PNG or WebP image.");
  if ((meta.pages ?? 1) > 1) throw photoError("Animated images aren’t supported.");

  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (Math.min(w, h) < IMAGE_MIN_DIMENSION) {
    throw photoError(`Photos must be at least ${IMAGE_MIN_DIMENSION}px on the shortest side.`);
  }
  if (Math.max(w, h) > IMAGE_MAX_DIMENSION) throw photoError("That photo’s dimensions are too large.");

  // rotate() with no args applies EXIF orientation; sharp drops metadata on output by default.
  const pipeline = sharp(input).rotate();
  const out =
    mime === "image/png"
      ? await pipeline.png().toBuffer({ resolveWithObject: true })
      : mime === "image/webp"
        ? await pipeline.webp({ quality: 90 }).toBuffer({ resolveWithObject: true })
        : await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer({ resolveWithObject: true });

  return {
    buffer: out.data,
    mime,
    ext: MIME_TO_EXT[mime],
    width: out.info.width,
    height: out.info.height,
    size: out.info.size,
  };
}
