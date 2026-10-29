import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(function PasswordField(
  { label, error, className, id, name, autoComplete, ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(false);
  const inputId = id ?? name;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete ?? "current-password"}
          className={cn(
            "input-cosmic w-full rounded-xl px-4 py-3 pr-11 text-foreground",
            error && "ring-1 ring-red-400/60",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-800">{error}</p> : null}
    </div>
  );
});
