"use client";

import * as React from "react";
import { Controller, FormProvider, useFormContext, useFormState } from "react-hook-form";

import { cn } from "./utils";

const Form = FormProvider;

const FormFieldContext = React.createContext(null);

function FormField({ name, children, ...props }) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <Controller name={name} {...props} render={children} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const form = useFormContext();
  const state = useFormState({ control: form.control });

  if (!fieldContext) {
    throw new Error("useFormField should be used within a FormField");
  }

  const name = fieldContext.name;
  const field = form.getFieldState ? form.getFieldState(name, state) : {};

  return { id: name, name, form, field, formState: state };
}

const FormItemContext = React.createContext({});

function FormItem({ className, children, ...props }) {
  return (
    <FormItemContext.Provider value={{}}>
      <div className={cn("space-y-2", className)} {...props}>
        {children}
      </div>
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, children, ...props }) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
      {children}
    </label>
  );
}

function FormControl({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

function FormDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

function FormMessage({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-destructive", className)} {...props}>
      {children}
    </p>
  );
}

export {
  Form,
  FormField,
  useFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
};
