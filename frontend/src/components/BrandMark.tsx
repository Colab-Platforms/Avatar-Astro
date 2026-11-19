import { cn } from "@/lib/utils";

/**
 * The Bhagya sun-and-moon logo (transparent PNG, champagne gold). Shown as-is: no filters, box or border.
 * Pass `alt` where the logo is the only brand label; omit it when the brand name sits beside it (the image is then decorative).
 */
export function BrandMark({ className, size = 32, alt = "" }: { className?: string; size?: number; alt?: string }) {
  return (
    <img
      src="/bhagya-logo-sm.png"
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={Math.round(size * 0.9)}
      height={size}
      decoding="async"
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}
