import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface FeatureButtonProps {
  to: string;
  label: string;
  className?: string;
}

const FeatureButton = ({ to, label, className = "" }: FeatureButtonProps) => (
  <Link to={to} className={`hl-btn hl-btn-sm group/fbtn h-9 ${className}`}>
    {label}
    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/fbtn:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/fbtn:translate-x-0" />
  </Link>
);

export default FeatureButton;
