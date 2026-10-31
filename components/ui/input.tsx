import * as React from "react";
import { cn } from "./utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex min-h-[42px] w-full rounded-lg border border-[#bfd0ca] bg-white px-3.5 py-2 text-sm text-[#132e36] placeholder:text-[#5c7476] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#132e36] focus-visible:outline-2 focus-visible:outline-[#195c70] focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
