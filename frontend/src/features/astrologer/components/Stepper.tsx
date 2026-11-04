import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  key: string;
  label: string;
}

/** Small, dependency-free step indicator — no stepper component exists elsewhere in the codebase. */
export function Stepper({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Application progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done ? "bg-[#592209] text-[#F5E9D6]" : active ? "border-2 border-[#592209] text-[#592209]" : "border border-[#592209]/30 text-[#9A8575]",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("hidden text-sm font-medium sm:inline", active ? "text-[#592209]" : done ? "text-[#301607]" : "text-[#9A8575]")}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <span className={cn("h-px flex-1", done ? "bg-[#592209]" : "bg-[#592209]/20")} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
