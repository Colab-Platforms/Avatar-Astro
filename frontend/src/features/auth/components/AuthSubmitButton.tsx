import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function AuthSubmitButton({
  loading,
  loadingText = "Please wait…",
  children,
  className,
  disabled,
  type = "submit",
  ...props
}: AuthSubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        // Utilities rather than the .btn-cosmic components-layer class, so these
        // always sort after preflight. Note the `_/_` in the arbitrary colour
        // values: a bare `/` there reads as Tailwind's opacity-modifier
        // separator and the candidate is silently dropped from the build.
        "flex w-full items-center justify-center gap-2 rounded-xl py-3.5",
        "bg-primary text-primary-foreground border border-transparent shadow-sm",
        "font-display text-sm font-semibold tracking-wide",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:bg-[#461B07]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E58A45] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-primary",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
