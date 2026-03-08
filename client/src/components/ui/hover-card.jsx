"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "./utils";

function HoverCard({ children, ...props }) {
  return <HoverCardPrimitive.Root {...props}>{children}</HoverCardPrimitive.Root>;
}

function HoverCardTrigger({ className, children, ...props }) {
  return (
    <HoverCardPrimitive.Trigger asChild data-slot="hover-card-trigger" {...props}>
      <div className={cn("inline-flex", className)}>{children}</div>
    </HoverCardPrimitive.Trigger>
  );
}

function HoverCardContent({ className, sideOffset = 6, ...props }) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
