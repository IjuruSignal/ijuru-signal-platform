import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#195c70] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#195c70] text-white hover:bg-[#144a5b]",
        ink: "bg-[#132e36] text-[#f3f4ee] hover:bg-[#1b3f49]",
        signal: "bg-[#e3ed8c] text-[#132e36] hover:bg-[#d4e172]",
        destructive: "bg-[#9e2a2b] text-white hover:bg-[#822021]",
        outline:
          "border border-[#bfd0ca] bg-white text-[#132e36] hover:bg-[#eef2ed]",
        secondary:
          "bg-[#e5ece8] text-[#132e36] hover:bg-[#d7e2dc]",
        ghost: "text-[#132e36] hover:bg-[#e5ece8]",
        link: "text-[#195c70] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] px-4 py-2.5",
        sm: "min-h-[36px] rounded-md px-3 py-1.5 text-xs",
        lg: "min-h-[48px] rounded-xl px-6 py-3 text-base",
        icon: "size-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
