import { useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageCircle, ShieldAlert } from "lucide-react";
import { ErrorBox, Loading } from "@/features/dashboard/library/ui";
import ChatWindow from "@/features/chat/components/ChatWindow";
import ConversationListItem from "@/features/chat/components/ConversationListItem";
import { useAstrologerConversations, useSetAstrologerOnline } from "@/features/chat/hooks/useAstrologerConversations";
import { useAstrologerAccess } from "../hooks/useAstrologerWorkspace";

/**
 * The astrologer's chat workspace: a WhatsApp-Web-style split view — conversation list on
 * the left, the open chat on the right. Reachable only through the same requireAstrologer
 * gate as the rest of the workspace (see AstrologerDashboardPage).
 */
export default function AstrologerChatPage() {
  const access = useAstrologerAccess();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useAstrologerConversations();
  const setOnline = useSetAstrologerOnline();

  if (access.isLoading) return <Loading label="Loading your chat workspace…" />;

  if (access.denied) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="h-8 w-8 text-[#A8803A]" aria-hidden="true" />
        <h1 className="font-home-serif text-xl font-semibold text-[#2A1A10]">Astrologer access required</h1>
      </section>
    );
  }

  if (access.error || !access.profile) {
    return <ErrorBox error={access.error} onRetry={() => access.refetch()} />;
  }

  const profile = access.profile;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E9DDC9] pb-5">
        <div>
          <h1 className="font-home-serif text-[1.65rem] font-semibold text-[#2A1A10]">Chats</h1>
          <p className="mt-1 text-sm text-[#6E5D4E]">People who've started a conversation with you.</p>
        </div>
        <button
          type="button"
          onClick={() => setOnline.mutate(!profile.isOnline)}
          disabled={setOnline.isPending}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
            profile.isOnline ? "border-[#2F7D4B]/40 bg-[#2F7D4B]/10 text-[#2F7D4B]" : "border-[#E0D2BA] bg-white text-[#6E5D4E]"
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${profile.isOnline ? "bg-[#2F7D4B]" : "bg-[#9A8575]"}`} aria-hidden="true" />
          {profile.isOnline ? "Online" : "Offline"}
        </button>
      </header>

      <div className="grid overflow-hidden rounded-2xl border border-[#E9DDC9] bg-[#FFFDF8] md:grid-cols-[320px_1fr]" style={{ minHeight: "32rem" }}>
        <div className={`border-r border-[#E9DDC9] ${sessionId ? "hidden md:block" : ""}`}>
          <div className="max-h-[32rem] overflow-y-auto p-2">
            {isLoading && (
              <div className="flex justify-center py-8 text-[#6E5D4E]">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </div>
            )}
            {!isLoading && (!conversations || conversations.length === 0) && (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-[#6E5D4E]">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
                <p className="text-sm">No conversations yet.</p>
              </div>
            )}
            {conversations?.map((c) => {
              const name = [c.user.firstName, c.user.lastName].filter(Boolean).join(" ") || "User";
              return (
                <ConversationListItem
                  key={c.sessionId}
                  name={name}
                  photoUrl={c.user.profileImage}
                  lastMessagePreview={c.lastMessage?.content}
                  timestamp={c.lastMessage?.createdAt}
                  unreadCount={c.unreadCount}
                  statusLabel={c.status === "ACTIVE" ? "Active now" : "Chat ended"}
                  active={c.sessionId === sessionId}
                  onClick={() => navigate(`/astrologer-dashboard/chat/${c.sessionId}`)}
                />
              );
            })}
          </div>
        </div>

        <div className={sessionId ? "" : "hidden items-center justify-center text-[#6E5D4E] md:flex"}>
          {sessionId ? (
            <ChatWindow sessionId={sessionId} role="ASTROLOGER" onBack={() => navigate("/astrologer-dashboard/chat")} />
          ) : (
            <p className="p-10 text-sm">Select a conversation to view the chat.</p>
          )}
        </div>
      </div>
    </section>
  );
}
