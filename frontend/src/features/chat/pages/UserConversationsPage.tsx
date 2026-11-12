import { Link, useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { useConversations } from "../hooks/useConversations";
import ConversationListItem from "../components/ConversationListItem";

export default function UserConversationsPage() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-6 border-b border-[#592209]/15 pb-4">
        <h1 className="font-home-serif text-2xl font-semibold text-[#301607]">Your chats</h1>
        <p className="mt-1 text-sm text-[#6B4A37]">Conversations you've started with astrologers.</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-10 text-[#6B4A37]">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </div>
      )}

      {!isLoading && (!conversations || conversations.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#592209]/25 bg-[#FBF5EC] px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#592209]/10 text-[#592209]">
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="font-home-serif text-lg font-semibold text-[#301607]">No chats yet</p>
          <p className="max-w-sm text-sm text-[#6B4A37]">Start a conversation from any astrologer's profile to see it here.</p>
          <Link to="/astrologers" className="mt-1 text-sm font-semibold text-[#592209] underline underline-offset-2">
            Browse astrologers
          </Link>
        </div>
      )}

      <div className="space-y-1 rounded-2xl border border-[#592209]/15 bg-[#FBF5EC] p-2">
        {conversations?.map((c) => (
          <ConversationListItem
            key={c.sessionId}
            name={c.astrologer.displayName}
            photoUrl={c.astrologer.profilePhotoUrl}
            lastMessagePreview={c.lastMessage?.content}
            timestamp={c.lastMessage?.createdAt}
            statusLabel={
              c.status === "REQUESTED"
                ? "Waiting for response…"
                : c.status === "ACTIVE"
                  ? "Active now"
                  : c.status === "PAUSED"
                    ? "Reconnecting…"
                    : "Chat ended"
            }
            onClick={() => navigate(`/chat/${c.sessionId}`)}
          />
        ))}
      </div>
    </section>
  );
}
