import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#195c70] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#195c70] text-white hover:bg-[#144a5b]",
        secondary:
          "border-transparent bg-[#e7ede9] text-[#132e36] hover:bg-[#d8e2dc]",
        outline:
          "border border-[#b8c9c2] text-[#132e36] bg-white hover:bg-[#f3f4ee]",
        signal:
          "border-transparent bg-[#e3ed8c] text-[#132e36] hover:bg-[#d5e07a]",
        live: "bg-[#dff0e5] text-[#185432] border border-[#b4dcc2]",
        calibrated: "bg-[#e3eff1] text-[#195c70] border border-[#b8d4da]",
        warning: "bg-[#f9ecd2] text-[#6e4715] border border-[#e6cca0]",
        destructive: "bg-[#fae2e2] text-[#8a2021] border border-[#e8b4b4]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
