import * as React from "react";
import { cn } from "./utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-[#e2e8e4]", className)}
      {...props}
    />
  );
}

export { Skeleton };
