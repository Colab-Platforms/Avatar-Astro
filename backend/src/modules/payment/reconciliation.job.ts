// In-process daily reconciliation sweep — the automated counterpart of the SUPERADMIN
// /admin/billing/reconciliation endpoint. Runs the same READ-ONLY checks (reconcileLedger,
// findStaleReservations) on a schedule and logs what it finds; it never mutates money —
// repairs stay a human decision, made through the admin surface.
//
// Single-instance rule applies (see modules/chat/billing.ts): this is a plain interval in the
// one backend process. First run is delayed a few minutes after boot so it never competes with
// startup recovery.
import { reconcileLedger, findStaleReservations } from "./reconciliation.js";
import { sweepAbandonedOrders } from "./payment.service.js";

const FIRST_RUN_DELAY_MS = 5 * 60_000;
const INTERVAL_MS = 24 * 60 * 60_000;

let firstRunTimer: NodeJS.Timeout | null = null;
let intervalTimer: NodeJS.Timeout | null = null;

export async function runReconciliationSweep(): Promise<void> {
  const startedAt = Date.now();
  const report = await reconcileLedger();
  const { reservations } = await findStaleReservations();
  const { sweptCount } = await sweepAbandonedOrders(60);
  const tookMs = Date.now() - startedAt;

  if (sweptCount > 0) {
    console.log(`[reconciliation] swept ${sweptCount} abandoned recharge order(s)`);
  }

  if (report.issues.length === 0 && reservations.length === 0) {
    console.log(`[reconciliation] clean: ${report.checkedWallets} wallets, ${report.checkedSessions} sessions checked in ${tookMs}ms`);
    return;
  }
  // Loud but bounded: counts and kinds always; full detail only for the first few of each, so a
  // systemic failure doesn't flood the log while still being unmissable.
  console.error(`[reconciliation] ATTENTION: ${report.issues.length} ledger issue(s), ${reservations.length} stale hold(s) — review via the SUPERADMIN billing-failures endpoint`);
  for (const issue of report.issues.slice(0, 20)) {
    console.error(`[reconciliation] ${issue.kind}: ${issue.detail}`);
  }
  if (report.issues.length > 20) console.error(`[reconciliation] …and ${report.issues.length - 20} more issue(s)`);
  for (const r of reservations.slice(0, 20)) {
    console.error(`[reconciliation] stale hold ${r.id} (${r.purpose}, ${r.amountPaise} paise, ref ${r.referenceId})`);
  }
}

export function startReconciliationJob(): void {
  if (firstRunTimer || intervalTimer) return;
  firstRunTimer = setTimeout(() => {
    firstRunTimer = null;
    runReconciliationSweep().catch((err) => console.error("[reconciliation] sweep failed:", err));
    intervalTimer = setInterval(() => {
      runReconciliationSweep().catch((err) => console.error("[reconciliation] sweep failed:", err));
    }, INTERVAL_MS);
  }, FIRST_RUN_DELAY_MS);
}

export function stopReconciliationJob(): void {
  if (firstRunTimer) {
    clearTimeout(firstRunTimer);
    firstRunTimer = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
