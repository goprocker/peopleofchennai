import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Eyebrow + serif title + optional intro and "see all" link. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  action,
  as: Heading = "h2",
  id,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  action?: { href: string; label: string };
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3 text-accent">{eyebrow}</p>}
        <Heading id={id} className={Heading === "h1" ? "display-lg" : "display-md"}>
          {title}
        </Heading>
        {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold underline-offset-4 hover:text-accent hover:underline"
        >
          {action.label}
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
