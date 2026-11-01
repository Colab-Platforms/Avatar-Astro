import prisma from "@root/prisma.js";
import { safeMetadata } from "@/utils/usage.js";
import {
  ACTIVITY_LABELS, CONVERSATION_FEATURES, READING_FEATURES, featureName, isConversationFeature, isReadingFeature,
  type ActivityKind, type ConversationFeature, type ReadingFeature,
} from "@/config/readingFeatures.js";

/**
 * The user's personal library. Every function takes the user id from the VERIFIED token (never from the client) and every
 * query is scoped by it, so one user can never read, change or delete another user's records.
 */

const MAX_OUTPUT_BYTES = 400_000;

// ── helpers ──────────────────────────────────────────────────────────────────

const PREFERRED_SUMMARY_KEYS = [
  "overallMessage", "currentKarmaTheme", "karmicPattern", "meaning", "lifePathOverview", "horoscope", "summary", "analysis",
  "loveInsight", "overview", "interpretation", "answer", "text", "message", "description",
];

/** Short plain-text preview. Looks at well-known fields first, otherwise the first reasonably long string anywhere. */
export function summarize(output: unknown, max = 220): string {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const cut = (s: string) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
  const find = (v: unknown, depth: number): string | null => {
    if (typeof v === "string") return clean(v).length >= 20 ? clean(v) : null;
    if (!v || typeof v !== "object" || depth > 3) return null;
    const o = v as Record<string, unknown>;
    if (!Array.isArray(v)) {
      for (const k of PREFERRED_SUMMARY_KEYS) {
        const hit = typeof o[k] === "string" ? find(o[k], depth + 1) : o[k] && typeof o[k] === "object" ? find(o[k], depth + 1) : null;
        if (hit) return hit;
      }
    }
    for (const x of Object.values(o)) {
      const hit = find(x, depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  return cut(find(output, 0) ?? "");
}

export const clampPage = (page: unknown, size: unknown, def = 12, max = 50) => ({
  page: Math.max(1, Math.floor(Number(page)) || 1),
  pageSize: Math.min(max, Math.max(1, Math.floor(Number(size)) || def)),
});

const parseDay = (v: unknown): Date | null => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
/** Inclusive day range -> [from, toExclusive). Invalid or missing dates are ignored. */
export function dayRange(from: unknown, to: unknown): { gte?: Date; lt?: Date } {
  const f = parseDay(from), t = parseDay(to);
  return { ...(f ? { gte: f } : {}), ...(t ? { lt: new Date(t.getTime() + 86_400_000) } : {}) };
}

// ── activity ─────────────────────────────────────────────────────────────────

export interface ActivityInput {
  userId: string;
  kind: ActivityKind;
  feature?: string | null;
  refType?: "reading" | "conversation";
  refId?: string | null;
  title?: string | null;
  status?: "success" | "failed";
}

/** Fire-and-forget by default: the personal timeline must never break a feature. */
export function logActivity(e: ActivityInput): Promise<void> {
  return prisma.userActivityEvent
    .create({ data: { userId: e.userId, kind: e.kind, feature: e.feature ?? null, refType: e.refType ?? null, refId: e.refId ?? null, title: e.title ? e.title.slice(0, 160) : null, status: e.status ?? "success" }, select: { id: true } })
    .then(() => undefined)
    .catch((err: any) => console.warn("[library] activity not recorded:", err?.code ?? err?.message));
}

// ── readings ─────────────────────────────────────────────────────────────────

export interface NewReading {
  userId: string;
  feature: ReadingFeature;
  title: string;
  output: unknown;
  summary?: string;
  inputMeta?: Record<string, unknown>;
  provider?: string | null;
  model?: string | null;
  clientRequestId?: string | null;
}

export async function createReading(r: NewReading): Promise<{ id: string; created: boolean }> {
  if (!isReadingFeature(r.feature)) throw new Error("Unknown reading feature");
  const json = JSON.stringify(r.output ?? null);
  if (!json || json === "null") throw new Error("Nothing to save");
  if (Buffer.byteLength(json) > MAX_OUTPUT_BYTES) throw new Error("Output too large to save");
  const key = r.clientRequestId && /^[\w.-]{8,80}$/.test(r.clientRequestId) ? r.clientRequestId : null;
  if (key) {
    const existing = await prisma.generatedReading.findFirst({ where: { userId: r.userId, clientRequestId: key }, select: { id: true } });
    if (existing) return { id: existing.id, created: false };
  }
  const row = await prisma.generatedReading.create({
    data: {
      userId: r.userId, feature: r.feature, title: r.title.slice(0, 160), summary: (r.summary ?? summarize(r.output)).slice(0, 300),
      output: r.output as any, inputMeta: (safeMetadata(r.inputMeta) as any) ?? undefined,
      provider: r.provider ?? null, model: r.model ?? null, clientRequestId: key,
    },
    select: { id: true },
  });
  void logActivity({ userId: r.userId, kind: "reading.generated", feature: r.feature, refType: "reading", refId: row.id, title: r.title });
  return { id: row.id, created: true };
}

const READING_CARD = { id: true, feature: true, title: true, summary: true, isSaved: true, savedAt: true, provider: true, model: true, createdAt: true, inputMeta: true } as const;
const card = (r: any) => ({ ...r, featureLabel: featureName(r.feature) });

export interface ReadingQuery { q?: unknown; feature?: unknown; from?: unknown; to?: unknown; saved?: unknown; page?: unknown; pageSize?: unknown }

export async function listReadings(userId: string, query: ReadingQuery) {
  const { page, pageSize } = clampPage(query.page, query.pageSize);
  const where: any = { userId };
  if (typeof query.feature === "string" && isReadingFeature(query.feature)) where.feature = query.feature;
  if (query.saved === "true" || query.saved === "1") where.isSaved = true;
  const range = dayRange(query.from, query.to);
  if (range.gte || range.lt) where.createdAt = range;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }];
  const [total, rows] = await Promise.all([
    prisma.generatedReading.count({ where }),
    prisma.generatedReading.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: READING_CARD }),
  ]);
  return { items: rows.map(card), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), features: Object.entries(READING_FEATURES).map(([value, label]) => ({ value, label })) };
}

/** The stored original output. Ownership is part of the query: someone else's id looks exactly like a missing one. */
export async function getReading(userId: string, id: string) {
  const r = await prisma.generatedReading.findFirst({ where: { id, userId }, select: { ...READING_CARD, output: true, updatedAt: true } });
  return r ? card(r) : null;
}

export async function setReadingSaved(userId: string, id: string, saved: boolean) {
  const found = await prisma.generatedReading.findFirst({ where: { id, userId }, select: { id: true, feature: true, title: true, isSaved: true } });
  if (!found) return null;
  if (found.isSaved === saved) return { id, isSaved: saved, changed: false };
  await prisma.generatedReading.updateMany({ where: { id, userId }, data: { isSaved: saved, savedAt: saved ? new Date() : null } });
  void logActivity({ userId, kind: saved ? "reading.saved" : "reading.unsaved", feature: found.feature, refType: "reading", refId: id, title: found.title });
  return { id, isSaved: saved, changed: true };
}

export async function deleteReading(userId: string, id: string): Promise<boolean> {
  const found = await prisma.generatedReading.findFirst({ where: { id, userId }, select: { feature: true, title: true } });
  if (!found) return false;
  const res = await prisma.generatedReading.deleteMany({ where: { id, userId } });
  if (res.count) void logActivity({ userId, kind: "reading.removed", feature: found.feature, title: found.title });
  return res.count > 0;
}

// ── conversations ────────────────────────────────────────────────────────────

const MAX_MESSAGE_CHARS = 8000;
const trimMsg = (s: string) => s.replace(/\u0000/g, "").trim().slice(0, MAX_MESSAGE_CHARS);

/**
 * Appends one exchange (the user's message and the assistant's reply) to a conversation the user OWNS, or starts a new one.
 * A conversation id that is missing, unknown or belongs to someone else starts a NEW conversation: it can never attach to another
 * user's conversation.
 */
export async function appendExchange(input: { userId: string; feature: ConversationFeature; conversationId?: string | null; user: string; assistant: string }) {
  const user = trimMsg(input.user), assistant = trimMsg(input.assistant);
  if (!user || !assistant) throw new Error("Empty message");
  const owned = input.conversationId
    ? await prisma.conversation.findFirst({ where: { id: input.conversationId, userId: input.userId, feature: input.feature }, select: { id: true } })
    : null;
  const now = new Date();
  const preview = assistant.replace(/\s+/g, " ").slice(0, 140);
  if (owned) {
    await prisma.$transaction([
      prisma.conversationMessage.createMany({ data: [{ conversationId: owned.id, role: "user", content: user, createdAt: now }, { conversationId: owned.id, role: "assistant", content: assistant, createdAt: new Date(now.getTime() + 1) }] }),
      prisma.conversation.updateMany({ where: { id: owned.id, userId: input.userId }, data: { preview, lastMessageAt: now } }),
    ]);
    void logActivity({ userId: input.userId, kind: "conversation.continued", feature: input.feature, refType: "conversation", refId: owned.id, title: CONVERSATION_FEATURES[input.feature] });
    return { id: owned.id, created: false };
  }
  const title = user.replace(/\s+/g, " ").slice(0, 60) || CONVERSATION_FEATURES[input.feature];
  const conv = await prisma.conversation.create({
    data: {
      userId: input.userId, feature: input.feature, title, preview, lastMessageAt: now,
      messages: { create: [{ role: "user", content: user, createdAt: now }, { role: "assistant", content: assistant, createdAt: new Date(now.getTime() + 1) }] },
    },
    select: { id: true },
  });
  void logActivity({ userId: input.userId, kind: "conversation.started", feature: input.feature, refType: "conversation", refId: conv.id, title: CONVERSATION_FEATURES[input.feature] });
  return { id: conv.id, created: true };
}

export async function listConversations(userId: string, query: { feature?: unknown; q?: unknown; page?: unknown; pageSize?: unknown }) {
  const { page, pageSize } = clampPage(query.page, query.pageSize);
  const where: any = { userId };
  if (isConversationFeature(query.feature)) where.feature = query.feature;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { preview: { contains: q, mode: "insensitive" } }];
  const [total, rows] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, feature: true, title: true, preview: true, createdAt: true, lastMessageAt: true, _count: { select: { messages: true } } } }),
  ]);
  return {
    items: rows.map(({ _count, ...c }) => ({ ...c, featureLabel: featureName(c.feature), messageCount: _count.messages })),
    page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getConversation(userId: string, id: string) {
  const c = await prisma.conversation.findFirst({
    where: { id, userId },
    select: { id: true, feature: true, title: true, createdAt: true, lastMessageAt: true, messages: { orderBy: { createdAt: "asc" }, take: 500, select: { id: true, role: true, content: true, createdAt: true } } },
  });
  return c ? { ...c, featureLabel: featureName(c.feature) } : null;
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const found = await prisma.conversation.findFirst({ where: { id, userId }, select: { feature: true } });
  if (!found) return false;
  const res = await prisma.conversation.deleteMany({ where: { id, userId } });
  if (res.count) void logActivity({ userId, kind: "conversation.removed", feature: found.feature, title: featureName(found.feature) });
  return res.count > 0;
}

// ── activity timeline ────────────────────────────────────────────────────────

export interface TimelineItem { id: string; at: Date; kind: string; label: string; feature: string | null; featureLabel: string; title: string | null; status: string; link: { type: "reading" | "conversation"; id: string } | null }

/**
 * The user's own timeline: personal events (readings, saves, conversations, profile) plus page opens and failed attempts from the
 * shared usage trail. Both sources are time-ordered, so each is read up to the cursor and merged: correct paging without a UNION table.
 */
export async function timeline(userId: string, query: { q?: unknown; feature?: unknown; kind?: unknown; from?: unknown; to?: unknown; before?: unknown; pageSize?: unknown }) {
  const { pageSize } = clampPage(1, query.pageSize, 20, 50);
  const range = dayRange(query.from, query.to);
  const before = typeof query.before === "string" && !Number.isNaN(Date.parse(query.before)) ? new Date(query.before) : null;
  const createdAt: any = { ...range, ...(before ? { lt: range.lt && range.lt < before ? range.lt : before } : {}) };
  const feature = typeof query.feature === "string" && query.feature.length <= 40 ? query.feature : null;
  const kind = typeof query.kind === "string" ? query.kind : null;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";

  const personalWhere: any = { userId, ...(Object.keys(createdAt).length ? { createdAt } : {}), ...(feature ? { feature } : {}), ...(kind ? { kind } : {}) };
  if (q) personalWhere.OR = [{ title: { contains: q, mode: "insensitive" } }, { kind: { contains: q, mode: "insensitive" } }, { feature: { contains: q, mode: "insensitive" } }];
  // usage_events duplicates what personal events already say for successes, so only opens (when no personal "opened" exists yet) and failures are added
  const usageWhere: any = { userId, OR: [{ eventType: "feature.opened" }, { eventType: "feature.request", status: { not: "success" } }], ...(Object.keys(createdAt).length ? { createdAt } : {}), ...(feature ? { feature } : {}) };
  const wantUsage = !kind || kind === "feature.opened" || kind === "feature.failed";
  if (q) usageWhere.feature = { contains: q, mode: "insensitive" };

  const [personal, usage] = await Promise.all([
    prisma.userActivityEvent.findMany({ where: personalWhere, orderBy: { createdAt: "desc" }, take: pageSize + 1 }),
    wantUsage ? prisma.usageEvent.findMany({ where: usageWhere, orderBy: { createdAt: "desc" }, take: pageSize + 1, select: { id: true, feature: true, eventType: true, status: true, createdAt: true } }) : Promise.resolve([]),
  ]);
  // A personal "feature.opened" row and the usage row for the same open would double up: keep the personal one.
  const personalOpens = new Set(personal.filter((p) => p.kind === "feature.opened").map((p) => `${p.feature}|${Math.floor(p.createdAt.getTime() / 2000)}`));
  const items: TimelineItem[] = [
    ...personal.map((p): TimelineItem => ({
      id: `p_${p.id}`, at: p.createdAt, kind: p.kind, label: ACTIVITY_LABELS[p.kind as ActivityKind] ?? p.kind, feature: p.feature, featureLabel: featureName(p.feature),
      title: p.title, status: p.status, link: p.refType && p.refId ? { type: p.refType as "reading" | "conversation", id: p.refId } : null,
    })),
    ...usage
      .filter((u) => !(u.eventType === "feature.opened" && personalOpens.has(`${u.feature}|${Math.floor(u.createdAt.getTime() / 2000)}`)))
      .map((u): TimelineItem => ({
        id: `u_${u.id}`, at: u.createdAt, kind: u.eventType === "feature.opened" ? "feature.opened" : "feature.failed",
        label: u.eventType === "feature.opened" ? ACTIVITY_LABELS["feature.opened"] : "Request did not complete", feature: u.feature, featureLabel: featureName(u.feature), title: null,
        status: u.eventType === "feature.opened" ? "success" : "failed", link: null,
      })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const page = items.slice(0, pageSize);
  const hasMore = items.length > pageSize || personal.length > pageSize || usage.length > pageSize;
  return { items: page, nextBefore: hasMore && page.length ? page[page.length - 1].at.toISOString() : null, kinds: [...Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label })), { value: "feature.failed", label: "Request did not complete" }] };
}

// ── overview ─────────────────────────────────────────────────────────────────

export async function overview(userId: string) {
  const [readings, saved, conversations, recentReadings, lastConversation, recentActivity, readingFeatures, convFeatures, openedFeatures, lastUsage] = await Promise.all([
    prisma.generatedReading.count({ where: { userId } }),
    prisma.generatedReading.count({ where: { userId, isSaved: true } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.generatedReading.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5, select: READING_CARD }),
    prisma.conversation.findFirst({ where: { userId }, orderBy: { lastMessageAt: "desc" }, select: { id: true, feature: true, title: true, preview: true, lastMessageAt: true } }),
    timeline(userId, { pageSize: 6 }),
    prisma.generatedReading.findMany({ where: { userId }, distinct: ["feature"], select: { feature: true } }),
    prisma.conversation.findMany({ where: { userId }, distinct: ["feature"], select: { feature: true } }),
    prisma.userActivityEvent.findMany({ where: { userId, kind: "feature.opened" }, distinct: ["feature"], select: { feature: true } }),
    prisma.usageEvent.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true, feature: true } }),
  ]);
  const explored = new Set<string>([...readingFeatures, ...convFeatures, ...openedFeatures].map((f) => f.feature).filter((f): f is string => !!f));
  const lastEvent = recentActivity.items[0];
  const lastActiveAt = [lastEvent?.at, lastUsage?.createdAt].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const lastFeatureKey = recentActivity.items.find((i) => i.feature)?.feature ?? lastUsage?.feature ?? null;
  return {
    stats: { readings, savedReadings: saved, featuresExplored: explored.size, conversations, lastActiveAt },
    continue: {
      reading: recentReadings[0] ? card(recentReadings[0]) : null,
      conversation: lastConversation ? { ...lastConversation, featureLabel: featureName(lastConversation.feature) } : null,
      lastFeature: lastFeatureKey ? { key: lastFeatureKey, label: featureName(lastFeatureKey) } : null,
    },
    recentReadings: recentReadings.map(card),
    recentActivity: recentActivity.items,
  };
}

/** Privacy controls. */
export async function clearPersonalActivity(userId: string): Promise<number> {
  return (await prisma.userActivityEvent.deleteMany({ where: { userId } })).count;
}
