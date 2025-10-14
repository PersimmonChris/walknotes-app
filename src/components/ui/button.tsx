import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-[#0b1e3f] text-white hover:bg-[#102b5d] focus-visible:ring-[#0b1e3f] focus-visible:ring-offset-white",
        secondary:
          "bg-white text-[#0b1e3f] border border-[#0b1e3f]/20 hover:bg-[#0b1e3f]/5 focus-visible:ring-[#0b1e3f]",
        ghost:
          "bg-transparent text-[#0b1e3f] hover:bg-[#0b1e3f]/10 focus-visible:ring-[#0b1e3f]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 focus-visible:ring-offset-white",
        subtle:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-12 w-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const componentProps = asChild
      ? props
      : {
          type: type ?? "button",
          ...props,
        };

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...componentProps}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
