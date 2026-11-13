// Read-only financial integrity checks. Nothing here writes: it reports, a human decides.
//
//  reconcileLedger()        — does the money add up? wallet vs ledger vs buckets vs reservations, every chat
//                             session's charge vs the ledger debits recorded against it and vs the billing
//                             formula, free-allowance usage vs sessions, settled tool runs vs debits.
//  findStaleReservations()  — which holds are genuinely stuck? A live chat's rolling hold is NEVER stale no
//                             matter how old; an in-flight tool run is not stale until it has outlived the window.
//
// Both accept `userIds` to scope the scan (tests, per-user support lookups); omit it to scan everything.
import { Prisma } from "@prisma/client";
import prisma from "@root/prisma.js";
import { cumulativeChargeDue } from "@/modules/chat/billingFormula.js";

export type ReconciliationIssueKind =
  | "WALLET_BUCKET_SUM"
  | "WALLET_RESERVED_MISMATCH"
  | "WALLET_LEDGER_MISMATCH"
  | "WALLET_BUCKET_LEDGER_MISMATCH"
  | "ALLOCATION_MISMATCH"
  | "SESSION_CHARGE_MISMATCH"
  | "SESSION_FORMULA_MISMATCH"
  | "ORPHAN_CHAT_RESERVATION"
  | "FREE_ALLOWANCE_MISMATCH"
  | "TOOL_SETTLED_WITHOUT_DEBIT";

export interface ReconciliationIssue {
  kind: ReconciliationIssueKind;
  userId?: string;
  walletId?: string;
  sessionId?: string;
  reference?: string;
  /** What the authoritative side says it should be. */
  expected?: number;
  /** What was found. */
  actual?: number;
  detail: string;
}

export interface ReconciliationReport {
  checkedWallets: number;
  checkedSessions: number;
  issues: ReconciliationIssue[];
}

type Scope = { userIds?: string[] };

function userFilter(column: Prisma.Sql, userIds?: string[]): Prisma.Sql {
  return userIds ? Prisma.sql`AND ${column} IN (${Prisma.join(userIds)})` : Prisma.empty;
}

export async function reconcileLedger(scope: Scope = {}): Promise<ReconciliationReport> {
  const issues: ReconciliationIssue[] = [];
  if (scope.userIds && scope.userIds.length === 0) return { checkedWallets: 0, checkedSessions: 0, issues };

  // ---- wallets: buckets, reservations, ledger ----
  const wallets = await prisma.$queryRaw<Array<{ walletId: string; userId: string; balance: number; purchased: number; promo: number; reserved: number; ledger: number; held: number; purchasedLedger: number; promoLedger: number }>>(Prisma.sql`
    SELECT w.id AS "walletId", w.user_id AS "userId",
           w.balance_paise AS balance, w.purchased_balance_paise AS purchased, w.promotional_balance_paise AS promo, w.reserved_balance_paise AS reserved,
           COALESCE((SELECT SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount_paise ELSE -t.amount_paise END) FROM wallet_transactions t WHERE t.wallet_id = w.id), 0)::int AS ledger,
           COALESCE((SELECT SUM(r.amount_paise) FROM wallet_reservations r WHERE r.wallet_id = w.id AND r.status = 'HELD'), 0)::int AS held,
           COALESCE((SELECT SUM(CASE WHEN t.type = 'CREDIT' THEN a.amount_paise ELSE -a.amount_paise END) FROM wallet_transactions t JOIN wallet_ledger_allocations a ON a.transaction_id = t.id WHERE t.wallet_id = w.id AND a.bucket = 'PURCHASED'), 0)::int AS "purchasedLedger",
           COALESCE((SELECT SUM(CASE WHEN t.type = 'CREDIT' THEN a.amount_paise ELSE -a.amount_paise END) FROM wallet_transactions t JOIN wallet_ledger_allocations a ON a.transaction_id = t.id WHERE t.wallet_id = w.id AND a.bucket = 'PROMOTIONAL'), 0)::int AS "promoLedger"
    FROM wallets w WHERE TRUE ${userFilter(Prisma.sql`w.user_id`, scope.userIds)}
  `);
  for (const w of wallets) {
    const base = { userId: w.userId, walletId: w.walletId };
    if (w.balance !== w.purchased + w.promo) issues.push({ ...base, kind: "WALLET_BUCKET_SUM", expected: w.purchased + w.promo, actual: w.balance, detail: "balance != purchased + promotional" });
    if (w.reserved !== w.held) issues.push({ ...base, kind: "WALLET_RESERVED_MISMATCH", expected: w.held, actual: w.reserved, detail: "wallet.reserved != sum of HELD reservations" });
    if (w.balance !== w.ledger) issues.push({ ...base, kind: "WALLET_LEDGER_MISMATCH", expected: w.ledger, actual: w.balance, detail: "balance != sum of ledger credits minus debits" });
    if (w.purchased !== w.purchasedLedger) issues.push({ ...base, kind: "WALLET_BUCKET_LEDGER_MISMATCH", expected: w.purchasedLedger, actual: w.purchased, detail: "purchased bucket != ledger allocations" });
    if (w.promo !== w.promoLedger) issues.push({ ...base, kind: "WALLET_BUCKET_LEDGER_MISMATCH", expected: w.promoLedger, actual: w.promo, detail: "promotional bucket != ledger allocations" });
  }

  // ---- ledger rows: allocations must add up to the transaction ----
  const allocations = await prisma.$queryRaw<Array<{ id: string; userId: string; amount: number; alloc: number }>>(Prisma.sql`
    SELECT t.id, w.user_id AS "userId", t.amount_paise AS amount, COALESCE(SUM(a.amount_paise), 0)::int AS alloc
    FROM wallet_transactions t
    JOIN wallets w ON w.id = t.wallet_id
    LEFT JOIN wallet_ledger_allocations a ON a.transaction_id = t.id
    WHERE TRUE ${userFilter(Prisma.sql`w.user_id`, scope.userIds)}
    GROUP BY t.id, w.user_id
    HAVING COALESCE(SUM(a.amount_paise), 0) <> t.amount_paise
  `);
  for (const a of allocations) issues.push({ kind: "ALLOCATION_MISMATCH", userId: a.userId, reference: a.id, expected: a.amount, actual: a.alloc, detail: "transaction amount != sum of its bucket allocations" });

  // ---- chat sessions: charge vs ledger vs formula ----
  const sessions = await prisma.$queryRaw<Array<{ id: string; userId: string; rate: number; billed: number; free: number; amount: number; debits: number }>>(Prisma.sql`
    SELECT s.id, s.user_id AS "userId", s.rate_per_minute_paise AS rate, s.billed_seconds AS billed, s.free_seconds_used AS free, s.amount_paise AS amount,
           COALESCE((SELECT SUM(t.amount_paise) FROM wallet_transactions t WHERE t.reference_id = s.id AND t.reason = 'CHAT_CONSUMPTION' AND t.type = 'DEBIT'), 0)::int AS debits
    FROM chat_sessions s WHERE s.type = 'PAID' ${userFilter(Prisma.sql`s.user_id`, scope.userIds)}
  `);
  for (const s of sessions) {
    const base = { userId: s.userId, sessionId: s.id };
    if (s.amount !== s.debits) issues.push({ ...base, kind: "SESSION_CHARGE_MISMATCH", expected: s.debits, actual: s.amount, detail: "session.amountPaise != ledger CHAT_CONSUMPTION debits" });
    const due = cumulativeChargeDue(s.billed - s.free, s.rate);
    if (s.amount !== due) issues.push({ ...base, kind: "SESSION_FORMULA_MISMATCH", expected: due, actual: s.amount, detail: "session charge != cumulativeChargeDue(billed - free, rate)" });
  }

  // ---- chat holds that outlived their session ----
  const orphans = await prisma.$queryRaw<Array<{ id: string; sessionId: string; userId: string; amount: number }>>(Prisma.sql`
    SELECT r.id, r.reference_id AS "sessionId", w.user_id AS "userId", r.amount_paise AS amount
    FROM wallet_reservations r
    JOIN wallets w ON w.id = r.wallet_id
    LEFT JOIN chat_sessions s ON s.id = r.reference_id
    WHERE r.purpose = 'CHAT_LOOKAHEAD' AND r.status = 'HELD' AND (s.id IS NULL OR s.status NOT IN ('ACTIVE', 'PAUSED'))
      ${userFilter(Prisma.sql`w.user_id`, scope.userIds)}
  `);
  for (const o of orphans) issues.push({ kind: "ORPHAN_CHAT_RESERVATION", userId: o.userId, sessionId: o.sessionId, reference: o.id, actual: o.amount, detail: "HELD chat reservation on a session that is not ACTIVE/PAUSED" });

  // ---- free allowance vs the sessions that consumed it ----
  const allowances = await prisma.$queryRaw<Array<{ userId: string; consumed: number; used: number }>>(Prisma.sql`
    SELECT a.user_id AS "userId", a.consumed_seconds AS consumed,
           COALESCE((SELECT SUM(s.free_seconds_used) FROM chat_sessions s WHERE s.user_id = a.user_id AND s.type = 'PAID'), 0)::int AS used
    FROM chat_free_allowances a WHERE TRUE ${userFilter(Prisma.sql`a.user_id`, scope.userIds)}
  `);
  for (const a of allowances) {
    if (a.consumed !== a.used) issues.push({ kind: "FREE_ALLOWANCE_MISMATCH", userId: a.userId, expected: a.used, actual: a.consumed, detail: "allowance consumed seconds != sum of sessions' freeSecondsUsed" });
  }

  // ---- settled tool executions must have exactly one matching debit ----
  const tools = await prisma.$queryRaw<Array<{ executionId: string; userId: string; debits: number }>>(Prisma.sql`
    SELECT e.execution_id AS "executionId", e.user_id AS "userId",
           (SELECT COUNT(*) FROM wallet_transactions t WHERE t.reference_id = e.execution_id AND t.reason = 'TOOL_EXECUTION' AND t.type = 'DEBIT')::int AS debits
    FROM tool_executions e WHERE e.status = 'SETTLED' ${userFilter(Prisma.sql`e.user_id`, scope.userIds)}
  `);
  for (const t of tools) {
    if (t.debits !== 1) issues.push({ kind: "TOOL_SETTLED_WITHOUT_DEBIT", userId: t.userId, reference: t.executionId, expected: 1, actual: t.debits, detail: "SETTLED tool execution without exactly one ledger debit" });
  }

  return { checkedWallets: wallets.length, checkedSessions: sessions.length, issues };
}

// ============================================================================
// Stale reservations
// ============================================================================
export type StaleReason = "ORPHAN_CHAT_HOLD" | "ABANDONED_TOOL_HOLD" | "LEAKED_TOOL_HOLD" | "ORPHAN_TOOL_HOLD" | "UNKNOWN_PURPOSE_HOLD";

export interface StaleReservation {
  id: string;
  purpose: string;
  referenceId: string;
  userId: string;
  status: string;
  amountPaise: number;
  createdAt: Date;
  reason: StaleReason;
}

/** Default window after which an unresolved hold is suspicious. Normal operations resolve within seconds. */
export const STALE_AFTER_MS = 5 * 60 * 1000;

export async function findStaleReservations(opts: { olderThanMs?: number; now?: Date; userIds?: string[] } = {}): Promise<{ reservations: StaleReservation[] }> {
  if (opts.userIds && opts.userIds.length === 0) return { reservations: [] };
  const cutoff = new Date((opts.now ?? new Date()).getTime() - (opts.olderThanMs ?? STALE_AFTER_MS));

  const rows = await prisma.$queryRaw<Array<{
    id: string; purpose: string; referenceId: string; userId: string; status: string; amountPaise: number; createdAt: Date;
    sessionStatus: string | null; toolStatus: string | null; toolCreatedAt: Date | null;
  }>>(Prisma.sql`
    SELECT r.id, r.purpose::text AS purpose, r.reference_id AS "referenceId", w.user_id AS "userId", r.status::text AS status,
           r.amount_paise AS "amountPaise", r.created_at AS "createdAt",
           s.status::text AS "sessionStatus", te.status::text AS "toolStatus", te.created_at AS "toolCreatedAt"
    FROM wallet_reservations r
    JOIN wallets w ON w.id = r.wallet_id
    LEFT JOIN chat_sessions s ON r.purpose = 'CHAT_LOOKAHEAD' AND s.id = r.reference_id
    LEFT JOIN tool_executions te ON r.purpose = 'TOOL_EXECUTION' AND te.execution_id = r.reference_id
    WHERE r.status IN ('HELD', 'RECONCILIATION_REQUIRED') AND r.created_at < ${cutoff}
      ${userFilter(Prisma.sql`w.user_id`, opts.userIds)}
    ORDER BY r.created_at ASC
  `);

  const reservations: StaleReservation[] = [];
  for (const r of rows) {
    let reason: StaleReason | null = null;
    if (r.purpose === "CHAT_LOOKAHEAD") {
      // A live chat's rolling hold lives as long as the chat does — never stale while ACTIVE or PAUSED.
      if (r.sessionStatus !== "ACTIVE" && r.sessionStatus !== "PAUSED") reason = "ORPHAN_CHAT_HOLD";
    } else if (r.purpose === "TOOL_EXECUTION") {
      if (!r.toolStatus) reason = "ORPHAN_TOOL_HOLD";
      else if (r.toolStatus === "COINS_RESERVED" || r.toolStatus === "EXECUTING" || r.toolStatus === "PRICE_QUOTED") {
        // Still legitimately in flight until the EXECUTION itself has outlived the window.
        if (r.toolCreatedAt && r.toolCreatedAt < cutoff) reason = "ABANDONED_TOOL_HOLD";
      } else reason = "LEAKED_TOOL_HOLD"; // the execution finished (settled/failed/released) but its hold never closed
    } else {
      reason = "UNKNOWN_PURPOSE_HOLD";
    }
    if (reason) reservations.push({ id: r.id, purpose: r.purpose, referenceId: r.referenceId, userId: r.userId, status: r.status, amountPaise: r.amountPaise, createdAt: r.createdAt, reason });
  }
  return { reservations };
}
