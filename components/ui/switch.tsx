import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "./utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#195c70] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#195c70] data-[state=unchecked]:bg-[#bfd0ca]",
      className
    )}
    {...props}
    ref={ref}
    data-slot="switch"
  >
    <SwitchPrimitives.Thumb
      data-slot="switch-thumb"
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
