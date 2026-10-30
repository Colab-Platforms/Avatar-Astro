import { motion } from "framer-motion";
import { Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationMethod = "email" | "mobile";

interface VerificationMethodPickerProps {
  value: VerificationMethod | null;
  onChange: (method: VerificationMethod) => void;
}

const options: {
  id: VerificationMethod;
  title: string;
  description: string;
  icon: typeof Mail;
}[] = [
  {
    id: "email",
    title: "Verify via Email",
    description: "We'll send a 6-digit OTP to your inbox.",
    icon: Mail,
  },
  {
    id: "mobile",
    title: "Verify via Mobile",
    description: "Confirm with an OTP on your registered number.",
    icon: Smartphone,
  },
];

export function VerificationMethodPicker({
  value,
  onChange,
}: VerificationMethodPickerProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const Icon = option.icon;
        const selected = value === option.id;

        return (
          <motion.button
            key={option.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300",
              selected
                ? "border-primary/60 bg-primary/10 shadow-[0_0_24px_rgba(89,34,9,0.12)]"
                : "border-border/40 bg-background/20 hover:border-primary/30",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                selected
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/40 text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-sm tracking-wider text-foreground">
                {option.title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </span>
            <span
              className={cn(
                "mt-1 h-4 w-4 shrink-0 rounded-full border-2",
                selected
                  ? "border-primary bg-primary"
                  : "border-border/60 bg-transparent",
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
