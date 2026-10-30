import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthTextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthTextField = React.forwardRef<
  HTMLInputElement,
  AuthTextFieldProps
>(function AuthTextField(
  { label, error, className, id, name, ...props },
  ref,
) {
  const inputId = id ?? name;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm text-muted-foreground"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={cn(
          "input-cosmic w-full rounded-xl px-4 py-3 text-foreground",
          error && "ring-1 ring-red-400/60",
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-red-800">{error}</p> : null}
    </div>
  );
});
