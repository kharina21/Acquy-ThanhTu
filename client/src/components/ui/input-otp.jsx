"use client";

import * as React from "react";
import OTPInput, { OTPInputContext } from "input-otp";

import { cn } from "./utils";

function InputOTP({ className, ...props }) {
  return <OTPInput className={cn("flex gap-2", className)} {...props} />;
}

function InputOTPGroup({ children, ...props }) {
  return (
    <div data-slot="input-otp-group" {...props}>
      {children}
    </div>
  );
}

function InputOTPSlot({ children, className, ...props }) {
  return (
    <OTPInputContext.Slot className={cn("h-10 w-10 inline-flex items-center justify-center rounded-md border", className)} {...props}>
      {children}
    </OTPInputContext.Slot>
  );
}

function InputOTPSeparator({ className, ...props }) {
  return <span className={cn("mx-1 text-sm text-muted-foreground", className)} {...props} />;
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
