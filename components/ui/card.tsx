import * as React from "react";
import { cn } from "./utils";
function Card({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card" className={cn("card", className)} {...props} />; }
export { Card };
