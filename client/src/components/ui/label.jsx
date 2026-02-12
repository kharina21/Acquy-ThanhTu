"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

const Label = React.forwardRef(({ className, ...props }, ref) => {
  return <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />;
});
Label.displayName = "Label";

export { Label };
