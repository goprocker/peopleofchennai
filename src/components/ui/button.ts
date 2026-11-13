import { cva, type VariantProps } from "class-variance-authority";

/** Shared button/link styling. Apply to <button> or <Link>. Min height 44px for touch targets. */
export const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-terracotta text-white hover:bg-terracotta-dark",
        outline: "border border-foreground/80 hover:bg-foreground hover:text-background",
        ghost: "hover:bg-surface-sunk",
      },
      size: { md: "", lg: "min-h-12 px-7 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type ButtonStyleProps = VariantProps<typeof buttonStyles>;
