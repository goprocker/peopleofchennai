import { cn } from "@/lib/utils";

/**
 * Decorative rule between editorial sections. "kolam" draws a small dotted motif
 * at the centre, a nod to the threshold patterns drawn outside Chennai homes.
 */
export function EditorialDivider({
  variant = "rule",
  className,
}: {
  variant?: "rule" | "kolam";
  className?: string;
}) {
  if (variant === "rule") {
    return <hr className={cn("border-0 border-t border-border", className)} />;
  }
  return (
    <div role="separator" className={cn("flex items-center gap-4 text-sand", className)}>
      <span className="h-px flex-1 bg-border" />
      <svg aria-hidden viewBox="0 0 40 40" className="size-6" fill="currentColor">
        {[
          [20, 6], [6, 20], [34, 20], [20, 34], [20, 20],
          [13, 13], [27, 13], [13, 27], [27, 27],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={cx === 20 && cy === 20 ? 2.5 : 1.75} />
        ))}
      </svg>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
