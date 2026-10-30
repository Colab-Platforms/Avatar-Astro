import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useFeatureFlags } from "@/lib/featureFlags";

interface FeatureButtonProps {
  to: string;
  label: string;
  className?: string;
}

const FeatureButton = ({ to, label, className = "" }: FeatureButtonProps) => {
  const { isPathDisabled } = useFeatureFlags();
  // A tool the admin switched off is not offered as a link; say so instead of leading to a dead end.
  if (isPathDisabled(to)) {
    return (
      <span className={`inline-flex h-9 items-center rounded-lg border border-home-line px-3 font-home-sans text-sm text-home-muted ${className}`}>
        Temporarily unavailable
      </span>
    );
  }
  return (
  <Link to={to} className={`hl-btn hl-btn-sm group/fbtn h-9 ${className}`}>
    {label}
    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/fbtn:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/fbtn:translate-x-0" />
  </Link>
  );
};

export default FeatureButton;
