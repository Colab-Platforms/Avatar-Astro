import { describe, it, expect } from "vitest";
import { resolveRestoreTarget, urlDecidesRestore, conversationUrl } from "@/lib/guruSessionRestore";

const none = { hasHandoff: false, activeConversationId: null };

describe("resolveRestoreTarget", () => {
  it("resumes the conversation named in the URL, even if the server reports another", () => {
    expect(resolveRestoreTarget({ search: "?conversation=abc", hasHandoff: false, activeConversationId: "zzz" })).toEqual({ kind: "conversation", id: "abc", fromUrl: true });
  });
  it("resumes today's active conversation when the URL has no pointer (new tab, plain navigation)", () => {
    expect(resolveRestoreTarget({ search: "", hasHandoff: false, activeConversationId: "zzz" })).toEqual({ kind: "conversation", id: "zzz", fromUrl: false });
  });
  it("does not auto-resume after an explicit New Chat (?new=1)", () => {
    expect(resolveRestoreTarget({ search: "?new=1", hasHandoff: false, activeConversationId: "zzz" })).toEqual({ kind: "none" });
  });
  it("does not resume when a hand-off question is about to start a new consultation", () => {
    expect(resolveRestoreTarget({ search: "", hasHandoff: true, activeConversationId: "zzz" })).toEqual({ kind: "none" });
  });
  it("starts empty when there is nothing to resume", () => {
    expect(resolveRestoreTarget({ search: "", ...none })).toEqual({ kind: "none" });
    expect(resolveRestoreTarget({ search: "?conversation=%20", ...none })).toEqual({ kind: "none" });
  });
});

describe("urlDecidesRestore", () => {
  it("is true only when the URL carries a pointer", () => {
    expect(urlDecidesRestore("?conversation=a")).toBe(true);
    expect(urlDecidesRestore("?new=1")).toBe(true);
    expect(urlDecidesRestore("")).toBe(false);
  });
});

describe("conversationUrl", () => {
  const cur = { pathname: "/inner-voice/chat", search: "?x=1&new=1", hash: "#top" };
  it("points at the conversation and drops ?new", () => {
    expect(conversationUrl(cur, "abc")).toBe("/inner-voice/chat?x=1&conversation=abc#top");
  });
  it("marks an explicit new chat and drops the old pointer", () => {
    expect(conversationUrl({ ...cur, search: "?conversation=abc" }, null)).toBe("/inner-voice/chat?new=1#top");
  });
});
