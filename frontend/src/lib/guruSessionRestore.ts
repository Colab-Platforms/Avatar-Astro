// Which AI Guru conversation should /inner-voice/chat show when it opens (or is refreshed)?
//
// The conversation itself lives in the server's Conversation table and the free-session timer in DailyChatUsage;
// this module only decides which stored conversation to reopen. The URL carries a per-tab pointer:
//   ?conversation=<id>  resume exactly this conversation (refresh, back/forward, shared with another tab)
//   ?new=1              the user explicitly pressed New Chat: do not auto-resume anything
//   (neither)           resume today's active conversation reported by the status endpoint, if there is one

export type RestoreTarget =
  | { kind: "conversation"; id: string; fromUrl: boolean }
  | { kind: "none" };

export function resolveRestoreTarget(input: {
  search: string;
  /** A "Need more guidance?" question is waiting to be sent as a brand-new consultation. */
  hasHandoff: boolean;
  /** `activeConversationId` from GET /inner-voice/chat/status (null when none / status unavailable). */
  activeConversationId: string | null;
}): RestoreTarget {
  const params = new URLSearchParams(input.search);
  const fromUrl = params.get("conversation")?.trim();
  if (fromUrl) return { kind: "conversation", id: fromUrl, fromUrl: true };
  if (params.get("new") === "1" || input.hasHandoff) return { kind: "none" };
  if (input.activeConversationId) return { kind: "conversation", id: input.activeConversationId, fromUrl: false };
  return { kind: "none" };
}

/** True when the URL alone settles what to show, so no wait for the status endpoint is needed. */
export function urlDecidesRestore(search: string): boolean {
  const params = new URLSearchParams(search);
  return !!params.get("conversation")?.trim() || params.get("new") === "1";
}

/** The URL (path + query + hash) that points at `conversationId`, or at an explicit fresh chat when null. */
export function conversationUrl(current: { pathname: string; search: string; hash: string }, conversationId: string | null): string {
  const params = new URLSearchParams(current.search);
  params.delete("conversation");
  params.delete("new");
  if (conversationId) params.set("conversation", conversationId);
  else params.set("new", "1");
  return `${current.pathname}?${params.toString()}${current.hash}`;
}
