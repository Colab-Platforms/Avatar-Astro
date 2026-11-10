interface Props {
  name: string;
  photoUrl?: string | null;
  lastMessagePreview?: string | null;
  timestamp?: string | null;
  unreadCount?: number;
  statusLabel?: string;
  active?: boolean;
  onClick: () => void;
}

export default function ConversationListItem({ name, photoUrl, lastMessagePreview, timestamp, unreadCount = 0, statusLabel, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-[#592209]/10" : "hover:bg-[#592209]/5"
      }`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#592209]/10 font-home-serif font-semibold text-[#592209]">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-home-serif text-sm font-semibold text-[#301607]">{name}</p>
          {timestamp && (
            <span className="shrink-0 text-[11px] text-[#6B4A37]">
              {new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-[#6B4A37]">{lastMessagePreview ?? statusLabel ?? "No messages yet"}</p>
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
