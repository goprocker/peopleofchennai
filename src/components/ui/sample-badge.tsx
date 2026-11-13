import { cn } from "@/lib/utils";

/** Visible marker on fictional development content, so it can never pass for a real person. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center rounded-full bg-sand px-2.5 py-1 text-[0.65rem] text-ink",
        className,
      )}
      title="Fictional sample content for development"
    >
      Sample
    </span>
  );
}
