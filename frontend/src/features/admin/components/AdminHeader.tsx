import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

interface AdminHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function AdminHeader({ title, onMenuClick }: AdminHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-primary/15 bg-[#FBF5EC]/90 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-foreground/70 hover:bg-primary/10 hover:text-foreground lg:hidden"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg tracking-wide text-foreground sm:text-xl">
          {title}
        </h1>
      </div>
      <p className="hidden truncate text-sm text-foreground/70 sm:block">{displayName}</p>
    </header>
  );
}
