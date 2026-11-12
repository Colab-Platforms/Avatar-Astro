import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import ChatWindow from "@/features/chat/components/ChatWindow";
import ConversationListItem from "@/features/chat/components/ConversationListItem";
import { useAstrologerConversations } from "@/features/chat/hooks/useAstrologerConversations";
import type { AstrologerOutletContext } from "../AstrologerDashboardLayout";

/**
 * The astrologer's chat workspace: a WhatsApp/Slack-style split view — conversation list on
 * the left, the open chat on the right, filling the full-bleed main area reserved for it by
 * AstrologerDashboardLayout. The requireAstrologer gate and online/offline control both live
 * one level up in that layout.
 */
export default function AstrologerChatPage() {
  useOutletContext<AstrologerOutletContext>();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useAstrologerConversations();
  const hasConversations = !!conversations && conversations.length > 0;

  return (
    <div className="flex h-full overflow-hidden bg-[#FFFDF8]">
      <aside className={`${sessionId ? "hidden" : "flex"} w-full flex-col border-r border-[#E9DDC9] lg:flex lg:w-[380px] lg:shrink-0`}>
        <header className="shrink-0 border-b border-[#E9DDC9] px-4 py-4">
          <h1 className="font-home-serif text-xl font-semibold text-[#2A1A10]">Chats</h1>
          <p className="mt-0.5 text-xs text-[#6E5D4E]">People who've started a conversation with you.</p>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="flex justify-center py-10 text-[#6E5D4E]">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </div>
          )}
          {!isLoading && !hasConversations && (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#A8803A]/10 text-[#A8803A]">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="font-home-serif text-lg font-semibold text-[#2A1A10]">No conversations yet</p>
              <p className="max-w-sm text-sm text-[#6E5D4E]">Chats started with you by visitors will show up here.</p>
            </div>
          )}

          <div className="space-y-1">
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
                  status={c.status}
                  statusLabel={
                    c.status === "REQUESTED"
                      ? "New request — tap to respond"
                      : c.status === "ACTIVE"
                        ? "Active now"
                        : c.status === "PAUSED"
                          ? "Reconnecting…"
                          : "Chat ended"
                  }
                  active={c.sessionId === sessionId}
                  onClick={() => navigate(`/astrologer-dashboard/chat/${c.sessionId}`)}
                />
              );
            })}
          </div>
        </div>
      </aside>

      <div className={`${sessionId ? "flex" : "hidden"} flex-1 flex-col lg:flex`}>
        {sessionId ? (
          <ChatWindow sessionId={sessionId} role="ASTROLOGER" onBack={() => navigate("/astrologer-dashboard/chat")} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#A8803A]/10 text-[#A8803A]">
              <MessageCircle className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="font-home-serif text-lg font-semibold text-[#2A1A10]">Select a conversation</p>
            <p className="max-w-xs text-sm text-[#6E5D4E]">Choose a chat from the list to view its messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
