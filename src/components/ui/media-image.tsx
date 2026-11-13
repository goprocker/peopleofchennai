import Image from "next/image";
import type { PublicImage } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * next/image wrapper for PublicImage. Bundled SVG sample portraits skip the optimiser
 * (it refuses SVG by default); everything else gets responsive AVIF/WebP.
 */
export function MediaImage({
  image,
  sizes,
  priority,
  className,
  fill = true,
}: {
  image: PublicImage;
  sizes: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
}) {
  const unoptimized = image.src.endsWith(".svg");
  return fill ? (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={cn("object-cover", className)}
    />
  ) : (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={cn("h-auto w-full", className)}
    />
  );
}

/** Warm placeholder block when no image exists; shows initials. */
export function ImageFallback({ label, className }: { label: string; className?: string }) {
  const initials = label
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div aria-hidden className={cn("absolute inset-0 flex items-center justify-center bg-surface-sunk", className)}>
      <span className="font-serif text-5xl text-sage">{initials}</span>
    </div>
  );
}
