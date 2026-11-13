import { cn } from "@/lib/utils";

type Width = "default" | "narrow" | "wide";

const widths: Record<Width, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

export function PageContainer({
  as: Tag = "div",
  width = "default",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "header" | "footer" | "article" | "nav";
  width?: Width;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width], className)} {...rest}>
      {children}
    </Tag>
  );
}
