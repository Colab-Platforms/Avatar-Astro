import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { safeHref, usePublicContent } from "@/lib/publicContent";

const DISMISSED_KEY = "mb_dismissed_announcements";

const readDismissed = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

/** Shows the first published announcement from the admin panel, dismissible for the session. */
export default function AnnouncementBar() {
  const items = usePublicContent("ANNOUNCEMENT");
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const item = items.find((i) => !dismissed.includes(i.id));

  useEffect(() => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    } catch {
      /* storage unavailable */
    }
  }, [dismissed]);

  // Not inside the admin panel (it has its own full-height layout).
  if (!item || pathname.startsWith("/admin")) return null;
  const href = safeHref(item.linkUrl);
  const text = (
    <>
      <strong className="font-semibold">{item.title}</strong>
      {item.body && <span className="ml-2 opacity-90">{item.body}</span>}
    </>
  );

  return (
    <div role="region" aria-label="Announcement" className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-3 bg-[#803003] px-10 py-2.5 text-center text-sm text-[#F5E9D6] shadow-[0_-2px_12px_rgba(0,0,0,0.2)]">
      {href ? (
        href.startsWith("/") ? <Link to={href} className="underline-offset-2 hover:underline">{text}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{text}</a>
      ) : <span>{text}</span>}
      <button type="button" aria-label="Dismiss announcement" onClick={() => setDismissed((d) => [...d, item.id])} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/15">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
