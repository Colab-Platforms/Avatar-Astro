import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

interface AdminHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function AdminHeader({ title, onMenuClick }: AdminHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E8E3DC] bg-white/90 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" className="text-[#1F1B16] hover:bg-[#F7F4EF] lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold tracking-tight text-[#1F1B16] sm:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/" className="hidden text-[#6B6259] underline-offset-4 hover:text-[#803003] hover:underline sm:block">View site</Link>
        <span className="hidden max-w-[14rem] truncate text-[#6B6259] sm:block">{displayName}</span>
      </div>
    </header>
  );
}
