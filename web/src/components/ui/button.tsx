import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-sm)] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] shadow-[var(--shadow-xs)]",
        outline:
          "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)]",
        ghost:
          "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
        soft:
          "bg-[var(--primary-soft)] text-[var(--primary-soft-fg)] hover:brightness-97",
        danger:
          "bg-[var(--danger)] text-white hover:brightness-110",
        link:
          "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-sm [&_svg]:size-3.5",
        md: "h-[var(--field-h)] px-4 text-base [&_svg]:size-4",
        lg: "h-11 px-5 text-md [&_svg]:size-4",
        icon: "h-[var(--field-h)] w-[var(--field-h)] [&_svg]:size-4",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
