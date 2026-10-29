import * as React from "react";
import { cn } from "@/lib/utils";
import { INDIAN_STATES } from "../constants/indianStates";

interface StateSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const StateSelect = React.forwardRef<
  HTMLSelectElement,
  StateSelectProps
>(function StateSelect(
  { label = "State", error, className, id, name, ...props },
  ref,
) {
  const selectId = id ?? name ?? "state";

  return (
    <div>
      <label
        htmlFor={selectId}
        className="mb-2 block text-sm text-muted-foreground"
      >
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        name={name}
        className={cn(
          "input-cosmic w-full appearance-none rounded-xl px-4 py-3 text-foreground",
          error && "ring-1 ring-red-400/60",
          className,
        )}
        {...props}
      >
        <option value="">Select state</option>
        {INDIAN_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-xs text-red-800">{error}</p> : null}
    </div>
  );
});
