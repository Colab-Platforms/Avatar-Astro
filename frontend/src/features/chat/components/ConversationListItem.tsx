import type { ChatSessionStatus } from "../api/chatApi";

interface Props {
  name: string;
  photoUrl?: string | null;
  lastMessagePreview?: string | null;
  timestamp?: string | null;
  unreadCount?: number;
  statusLabel?: string;
  /** Drives the small presence dot on the avatar. */
  status?: ChatSessionStatus;
  active?: boolean;
  onClick: () => void;
}

const STATUS_DOT: Record<ChatSessionStatus, string> = {
  ACTIVE: "bg-emerald-500",
  REQUESTED: "bg-amber-500 animate-pulse",
  PAUSED: "bg-amber-500",
  ENDED: "bg-[#B2A08E]",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ConversationListItem({
  name,
  photoUrl,
  lastMessagePreview,
  timestamp,
  unreadCount = 0,
  statusLabel,
  status,
  active,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-[#592209]/10" : "hover:bg-[#592209]/5"
      }`}
    >
      <span className="relative shrink-0">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#592209]/10 font-home-serif font-semibold text-[#592209]">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        {status && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#FBF5EC] ${STATUS_DOT[status]}`}
            aria-hidden="true"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate font-home-serif text-sm ${unreadCount > 0 ? "font-bold" : "font-semibold"} text-[#301607]`}>{name}</p>
          {timestamp && <span className="shrink-0 text-[11px] text-[#6B4A37]">{formatTimestamp(timestamp)}</span>}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${unreadCount > 0 ? "font-medium text-[#301607]" : "text-[#6B4A37]"}`}>
            {lastMessagePreview ?? statusLabel ?? "No messages yet"}
          </p>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#592209] px-1.5 text-[11px] font-semibold text-[#F5E9D6]">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
