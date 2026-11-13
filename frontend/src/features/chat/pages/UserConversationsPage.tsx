import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageCircle, Search } from "lucide-react";
import { useConversations } from "../hooks/useConversations";
import ConversationListItem from "../components/ConversationListItem";
import ChatWindow from "../components/ChatWindow";

/** Split-pane chat home for signed-in users, mounted at /dashboard/chats and
 * /dashboard/chats/:sessionId — the list stays visible alongside the open conversation on
 * desktop (WhatsApp/Slack-style), and the two swap on mobile based on whether a session is
 * selected. */
export default function UserConversationsPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { data: conversations, isLoading } = useConversations();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!conversations) return conversations;
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.astrologer.displayName.toLowerCase().includes(q) || (c.lastMessage?.content.toLowerCase().includes(q) ?? false)
    );
  }, [conversations, query]);

  const hasConversations = !!conversations && conversations.length > 0;

  return (
    <div className="flex h-full overflow-hidden bg-[#FBF5EC]">
      <aside
        className={`${sessionId ? "hidden" : "flex"} w-full flex-col border-r border-[#592209]/15 bg-[#FBF5EC] lg:flex lg:w-[380px] lg:shrink-0`}
      >
        <header className="shrink-0 border-b border-[#592209]/15 px-4 py-4">
          <h1 className="font-home-serif text-xl font-semibold text-[#301607]">Chats</h1>
          <p className="mt-0.5 text-xs text-[#6B4A37]">Conversations you've started with astrologers.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#592209]/20 bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#6B4A37]" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full bg-transparent text-sm text-[#2C1810] placeholder:text-[#6B4A37]/60 focus:outline-none"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="flex justify-center py-10 text-[#6B4A37]">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </div>
          )}

          {!isLoading && (!filtered || filtered.length === 0) && (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#592209]/10 text-[#592209]">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="font-home-serif text-lg font-semibold text-[#301607]">{hasConversations ? "No matches" : "No chats yet"}</p>
              <p className="max-w-sm text-sm text-[#6B4A37]">
                {hasConversations ? "Try a different search." : "Start a conversation from any astrologer's profile to see it here."}
              </p>
              {!hasConversations && (
                <Link to="/astrologers" className="mt-1 text-sm font-semibold text-[#592209] underline underline-offset-2">
                  Browse astrologers
                </Link>
              )}
            </div>
          )}

          <div className="space-y-1">
            {filtered?.map((c) => (
              <ConversationListItem
                key={c.sessionId}
                name={c.astrologer.displayName}
                photoUrl={c.astrologer.profilePhotoUrl}
                lastMessagePreview={c.lastMessage?.content}
                timestamp={c.lastMessage?.createdAt}
                status={c.status}
                statusLabel={
                  c.status === "REQUESTED"
                    ? "Waiting for response…"
                    : c.status === "ACTIVE"
                      ? "Active now"
                      : c.status === "PAUSED"
                        ? "Reconnecting…"
                        : "Chat ended"
                }
                active={c.sessionId === sessionId}
                onClick={() => navigate(`/dashboard/chats/${c.sessionId}`)}
              />
            ))}
          </div>
        </div>
      </aside>

      <div className={`${sessionId ? "flex" : "hidden"} flex-1 flex-col lg:flex`}>
        {sessionId ? (
          <ChatWindow sessionId={sessionId} role="USER" basePath="/dashboard/chats" onBack={() => navigate("/dashboard/chats")} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#592209]/10 text-[#592209]">
              <MessageCircle className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="font-home-serif text-lg font-semibold text-[#301607]">Select a conversation</p>
            <p className="max-w-xs text-sm text-[#6B4A37]">Choose a chat from the list to view its messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
