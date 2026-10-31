import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          "flex min-h-[88px] w-full rounded-lg border border-[#bfd0ca] bg-white px-3.5 py-2.5 text-sm text-[#132e36] placeholder:text-[#5c7476] focus-visible:outline-2 focus-visible:outline-[#195c70] focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
