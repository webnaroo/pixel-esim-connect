import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Single button system for the whole site (shop, admin, shadcn primitives).
 * `components/ui-kit.tsx` (Button, LinkButton, btnClass) renders through this file.
 *
 * Sizes: sm 40px (compact), default 48px (standard), lg 56px (hero / checkout).
 * Hover utilities are already limited to hover-capable devices by Tailwind v4, so touch
 * devices never keep a stuck hover state. Press feedback uses the Phase 0 motion tokens.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium cursor-pointer select-none transition-[background-color,border-color,color,transform] duration-(--dur-hover) ease-ui-out active:scale-[0.97] active:duration-(--dur-press) disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-line-strong bg-surface text-ink hover:border-ink-muted",
        secondary: "border border-line-strong bg-surface text-ink hover:border-ink-muted",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        // Text-style action in the brand colour (previously the ui-kit "ghost").
        quiet: "px-3 text-primary hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 text-base",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-6 text-base",
        icon: "size-10",
      },
    },
    compoundVariants: [
      // Text-style action keeps its tighter horizontal padding at every size.
      { variant: "quiet", class: "px-3" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
