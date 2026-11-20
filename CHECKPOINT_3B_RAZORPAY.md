# Checkpoint 3b — Razorpay Payment Gateway Integration

Handoff doc for continuing this work (e.g. in Antigravity). It has two parts: **the original spec**
(verbatim intent, lightly organized) and **what's actually been done so far** in this repo, so a
fresh tool can pick up exactly where this session left off without re-deriving context.

Branch: `dev-nikhil`. Nothing in this checkpoint has been committed, deployed, or applied to
production/Neon. The disposable local test DB (`npm run test:db:*`, Postgres 17 in Docker) is the
only database anything here has touched.

---

## Part 1 — The spec (what was asked for)

> Proceed with Checkpoint 3b — Razorpay integration. We are continuing with Prisma `db push` for
> now. Do not repair migration history.

### Phase 1 — Inspect existing payment architecture (✅ done, see Part 2)

Review wallet/ledger, `PaymentOrder` model, recharge order/confirm endpoints, mock-payment gate,
promotional vs purchased buckets, idempotency keys, wallet reservation/settlement, auth/SUPERADMIN,
frontend wallet pages. **Identify what's reusable. Do not build a parallel wallet or ledger.**

### Phase 2 — Design Razorpay integration

Implement Razorpay Standard Checkout for coin purchases.

1. Backend creates Razorpay orders.
2. Server determines the amount and coin quantity — **never trust frontend-supplied prices.**
3. INR, integer paise throughout.
4. Store the internal `PaymentOrder` row before/alongside external order creation, via a
   **recoverable state machine** (so a crash mid-create never leaves an untrackable order).
5. Verify the Razorpay Checkout signature on the backend (`order_id|payment_id` HMAC-SHA256 with
   the key secret).
6. Verify the payment's **captured** status, order ID, amount and currency directly against
   Razorpay's API before crediting (don't trust the checkout callback alone).
7. Handle `payment.captured` and relevant order/payment failure webhook events.
8. Verify webhook signatures using the **exact raw request body** (HMAC-SHA256 with the webhook
   secret, timing-safe compare).
9. Mount the webhook raw-body handler **before** the global `express.json()` middleware — the
   signature is computed over raw bytes, not the re-serialized parsed body.
10. Credit purchased coins **exactly once** through the existing wallet ledger
    (`creditToBucket`/`credit` in `wallet.service.ts`), regardless of how many times
    confirm/webhook fire.
11. Frontend confirmation and webhook delivery must be **safe in any order** — whichever arrives
    first does the crediting; the other is a no-op.
12. Prevent duplicate credits from webhook retries, concurrent confirm+webhook races, or server
    restarts mid-processing.
13. Handle failed, expired, and abandoned payment attempts (user opens checkout, never pays).
14. Provide **read-only** payment reconciliation and a safe recovery path for missed webhooks
    (e.g. poll Razorpay for orders stuck in `CREATED` past some age).
15. Mock recharge must stay impossible to reach in production (already true — see Part 2).

### Phase 3 — Refunds and disputes

Design safe handling for: full refunds, partial refunds, duplicate refund events, chargebacks and
disputes, and the case where the purchased coins were **already spent**.

- **Never blindly subtract spent coins or allow a negative balance.**
- If the refund/chargeback wallet policy needs a business decision, **report it and leave the
  money-moving action gated** rather than inventing a rule (e.g. "always refund from purchased
  bucket first, cap at current balance, log the shortfall" is an invented rule — don't ship that
  without sign-off).

### Phase 4 — Frontend integration

Update the recharge experience: package/amount selection, show INR price + coins received, launch
Razorpay Checkout, handle success/failure/cancellation, refresh wallet balance from the backend
(never trust the client's own idea of the new balance), show a "pending verification" state when
appropriate, prevent duplicate checkout submissions, show transaction history/receipts where the
UI already supports it. **Preserve the existing wallet UI** (`WalletPage.tsx`, `RechargeModal.tsx`,
`useWallet.ts`) rather than rebuilding it.

### Phase 5 — Security

- Razorpay secrets (`KEY_SECRET`, `WEBHOOK_SECRET`) are backend-only, never shipped to the client.
- Only `RAZORPAY_KEY_ID` (publishable) may reach the frontend.
- Separate test-mode and live-mode credentials.
- Validate every incoming webhook payload (shape + signature) before touching it.
- Never log full payment payloads / card data / secrets.
- Rate-limit order creation (reuse `createRateLimiter`, same pattern as auth/chat routes).
- Enforce ownership checks on payment orders (a user can only confirm/view their own order).
- Integer paise only — no floating-point money math anywhere.

### Phase 6 — Testing

Disposable Postgres test DB, same harness as Checkpoints 1–2
(`src/__tests__/financial/helpers.ts`, `npm run test:db:run`). **Mock Razorpay's external HTTP
API** in automated tests (order creation, payment fetch) but use **real Postgres transactions and
constraints** for everything else. **Never call live Razorpay APIs in automated tests.**

Coverage required: order creation, invalid amounts, Checkout signature verification, payment
capture verification, webhook signature validation, duplicate webhooks, concurrent
confirmation-vs-webhook race, failed payments, partial transaction failures (DB error mid-credit),
idempotent wallet crediting, refund events, reconciliation, unauthorized order access.

### Phase 7 — Configuration (docs only, no real secrets in repo)

Document: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, test vs live mode,
the webhook URL, which events to enable in the Razorpay dashboard, Render env vars, Vercel frontend
env vars (just the key id).

### Phase 8 — Final report (owed at the end of this checkpoint)

Architecture summary, changed files, API endpoints, Prisma schema changes, webhook configuration,
test results, security review, refund/chargeback decisions still needed, deployment order,
rollback plan.

### Hard constraints (apply to the whole checkpoint)

- Do not deploy, push, modify the production Neon schema, or process real payments without
  explicit approval.
- Do not create a parallel wallet/ledger system — extend `Wallet` / `WalletTransaction` /
  `WalletLedgerAllocation` / `PaymentOrder`.
- Implement and test **locally** against the disposable test DB, then **stop for review**.

---

## Part 2 — What's already in this repo (reusable architecture, from Phase 1's inspection)

Everything below already exists and was deliberately built so a real gateway could be swapped in
without changing the money model:

- **`backend/prisma/schema/payment.prisma`**
  - `Wallet` — `balancePaise = purchasedBalancePaise + promotionalBalancePaise`,
    `reservedBalancePaise` for in-flight holds. One row per user, lazily upserted.
  - `WalletTransaction` — append-only ledger, `type` (CREDIT/DEBIT), `reason`
    (`RECHARGE`, `CHAT_CONSUMPTION`, `REFUND`, `ADJUSTMENT`, `SIGNUP_BONUS`, `TOOL_EXECUTION`,
    `RESERVATION_RELEASE`), `referenceId` (points at the `PaymentOrder`/`ChatSession`/tool
    execution it's for), **`idempotencyKey` (unique, nullable)** — the exact mechanism Razorpay
    crediting needs to reuse for exactly-once behavior.
  - `WalletLedgerAllocation` — splits one transaction across PURCHASED/PROMOTIONAL buckets;
    `reversalOfId` on `WalletTransaction` exists specifically so a refund can mirror the original
    charge's bucket split rather than re-deciding it.
  - `WalletReservation` — holds against a wallet for in-flight chat/tool spend; irrelevant to
    recharge itself but is what "coins already spent" (Phase 3) has to respect — a refund must not
    push `reservedBalancePaise` below what's actually held.
  - `PaymentOrder` — `userId`, `amountPaise`, `provider` (enum `MOCK | RAZORPAY`), `status`,
    `providerOrderId`, `providerPaymentId`, `completedAt`. This is the row Razorpay's order should
    be stored alongside/before external creation, per spec requirement 4.
  - **Already added this session** (uncommitted): `PaymentOrderStatus` gained `EXPIRED` (abandoned
    checkout, swept after a timeout — a later capture webhook still honors it); two new enums
    `PaymentRefundKind` (`REFUND | DISPUTE`) and `PaymentRefundHandling`
    (`ACTION_REQUIRED | WALLET_ADJUSTED | RESOLVED_NO_ACTION`) for Phase 3 — **the `PaymentRefund`
    model itself has not been written yet**, see "Where this session stopped" below.

- **`backend/src/modules/payment/payment.provider.ts`** — the gateway seam. Defines
  `PaymentProviderAdapter` (`createOrder(amountPaise): Promise<{ providerOrderId }>`) with a
  comment already anticipating Razorpay: *"implement this same interface and swap the export
  below; nothing in payment.service.ts or the wallet/chat modules needs to change."* In practice
  Razorpay needs a richer interface (order creation returns more fields, plus payment-fetch and
  signature verification) — extend this file, don't bypass it.

- **`backend/src/modules/payment/payment.service.ts`** — `createRechargeOrder` (validates amount
  ₹20–₹10,000, calls the provider, inserts `PaymentOrder`) and `confirmRechargeOrder` (idempotent:
  a `SUCCESS` order just re-returns the balance, a `FAILED` order 409s, otherwise flips to SUCCESS
  and calls `credit()`). **This idempotent-confirm shape is exactly what the webhook handler and
  the frontend-confirm handler both need to funnel through** — the crediting step itself should be
  one shared function both paths call, guarded by the order's current status under a row lock (or
  the `idempotencyKey` unique constraint) so neither path can double-credit.

- **`backend/src/modules/payment/mockPayments.ts`** — `isMockPaymentsEnabled()` fails closed unless
  `ALLOW_MOCK_PAYMENTS=true` **and** `NODE_ENV` is exactly `development`/`test`. This already
  satisfies "mock recharge must be impossible in production" — nothing to change here, just don't
  let the Razorpay path share this gate.

- **`backend/src/modules/payment/wallet.service.ts`** — `getOrCreateWallet`, `creditToBucket`
  (takes `idempotencyKey`, does the balance math inside a transaction), `credit` (thin wrapper
  defaulting to the PURCHASED bucket unless reason is `SIGNUP_BONUS`). **Reuse `creditToBucket`
  directly for Razorpay crediting** — pass `idempotencyKey: `razorpay_payment:${razorpayPaymentId}``
  or similar so a webhook retry is a safe no-op at the ledger layer too (defense in depth under the
  `PaymentOrder.status` guard).

- **`backend/src/modules/payment/wallet.route.ts`** — `POST /api/wallet/recharge/order` and
  `POST /api/wallet/recharge/confirm`, both behind `auth("USER")` + a 60/min rate limiter. The new
  Razorpay routes should sit alongside these (keep `/recharge/order` and `/recharge/confirm` as the
  contract if possible — see the frontend section below — and add a separate unauthenticated
  `/webhook` route mounted *before* `express.json()` in `index.ts`).

- **`backend/src/modules/payment/reconciliation.ts`** + **`reconciliation.job.ts`** (built in
  Checkpoint 3a) — read-only ledger integrity checks, already scheduled daily in-process. Phase
  2's "safe recovery for missed webhooks" and Phase 8's reconciliation reporting should extend
  this file with a Razorpay-specific check (e.g. "any `PaymentOrder` in `CREATED` older than N
  minutes — poll Razorpay's order/payment API for its real status") rather than starting a new
  reconciliation surface.

- **Auth/SUPERADMIN** — `auth("USER")` / `auth("SUPERADMIN")` middleware
  (`middleware/authMiddleware.js`) and `requireMainAdmin` (used by the admin billing-failures
  router) are the existing patterns. Any new admin-only refund/dispute review endpoint should mount
  under the existing `admin.route.ts` router (already SUPERADMIN-gated), not invent new auth.

- **Frontend** (`frontend/src/features/wallet/`):
  - `api/walletApi.ts` — `createRechargeOrder(amountPaise)` →
    `POST /wallet/recharge/order`, `confirmRechargeOrder(orderId)` →
    `POST /wallet/recharge/confirm`.
  - `hooks/useWallet.ts` — `useRecharge()` mutation currently does
    `createRechargeOrder` → immediately `confirmRechargeOrder` (that's the mock flow: no real
    checkout step). **For Razorpay this hook's `mutationFn` needs to open Razorpay Checkout
    between those two calls** (load `razorpay-checkout.js`, call `new window.Razorpay(options).open()`,
    only call `confirmRechargeOrder` from the Checkout success handler, passing along the
    Razorpay-provided `razorpay_payment_id`/`razorpay_order_id`/`razorpay_signature` instead of
    just `orderId`).
  - `components/RechargeModal.tsx` — preset ₹49/99/199/499 + custom amount (₹20–₹10,000), calls
    `recharge.mutate(amountInPaise)`. Currently shows *"Payments are simulated for now…"* — that
    copy needs to go once Razorpay is live, and the modal needs a "pending verification" state for
    the window between Checkout closing and the webhook/confirm landing.
  - `pages/WalletPage.tsx` — hosts the modal, shows balance + transaction history from
    `getWalletSummary()`. No changes anticipated beyond what `useWallet`/`RechargeModal` already
    feed it.

### Prior checkpoints this one builds on (for context, not to redo)

- **Checkpoint 1** — financial correctness: atomic settlement, idempotent billing ticks, the
  `idempotencyKey` pattern this checkpoint reuses.
- **Checkpoint 2** — chat lifecycle/socket security: cancel flow, offline/busy gates,
  `clientMessageId` dedupe, per-socket rate limiting, suspension-mid-chat enforcement. Unrelated to
  payments but same codebase/test harness conventions.
- **Checkpoint 3a** — reliability: helmet, trimmed body limits, CORS gated on `NODE_ENV`, auth rate
  limits + enumeration fix, bcrypt cost 12, fail-fast env validation in production, `/api/ready`,
  the daily reconciliation job, CI workflow (`.github/workflows/backend-ci.yml`), draft Render
  config (`render.draft.yaml` — intentionally not `render.yaml`, inert until deployment facts are
  verified and someone renames it).

---

## Implementation status — COMPLETE (pending review and deployment approval)

The full integration landed in commit `713361a` (built with Antigravity) plus follow-up fixes in
this session. All 201 database-backed tests pass, including 13 Razorpay-specific ones.

What exists now:

- **Schema** (`payment.prisma`): `PaymentOrderStatus.EXPIRED`; `PaymentRefund` model (unique
  provider refund/dispute ids, `ACTION_REQUIRED` handling default); `PaymentWebhookEvent`
  (unique `eventId` = webhook dedupe); unique `providerOrderId`/`providerPaymentId` on
  `PaymentOrder`. Applied to the disposable test DB only — **production Neon still needs
  approval + `prisma db push`**.
- **Provider** (`payment.provider.ts`): `RazorpayPaymentProvider` (official `razorpay` npm
  package, hand-written types in `src/types/razorpay.d.ts`) — order create, payment fetch,
  order-payments fetch, timing-safe Checkout + webhook signature verification;
  `MockPaymentProvider` for dev/test; `setPaymentProviderForTest()` injection point used by tests.
- **Service** (`payment.service.ts`): `assertPaymentsAvailable()` (Razorpay when configured, mock
  only in dev/test, otherwise 503); `createRechargeOrder` (internal row FIRST, then provider
  order — recoverable); `creditOrderOnce` (row lock + `razorpay_payment:<id>` idempotency key +
  webhook-event insert, all one transaction — the single crediting path for confirm, webhook, and
  sweeper); `confirmRechargeOrder` (ownership check, signature verify, API fetch verifying
  captured/amount/currency/order); `markOrderFailed`; `sweepAbandonedOrders` (recovers missed
  captures via the provider API before expiring — wired into the daily reconciliation job);
  `recordRefundOrDispute` (record-only, never debits); `listPaymentRefunds`.
- **Webhook** (`payment.webhook.ts` + `index.ts`): `POST /api/payments/razorpay/webhook`, raw-body
  parser mounted before `express.json()`, timing-safe signature check, event dedupe, handlers for
  `payment.captured` / `payment.failed` / `refund.created|processed` / `payment.dispute.created`.
- **Admin**: `GET /api/admin/refunds` (+ `/:id`) — SUPERADMIN read-only refund/dispute review.
- **Routes** (`wallet.route.ts`): order/confirm updated for the Razorpay contract; order creation
  has a dedicated 10-per-15-min rate limit on top of the router-wide 60/min.
- **Frontend**: `useRecharge()` loads checkout.js, opens Razorpay Checkout, confirms with
  payment id/order id/signature, falls back to instant-confirm for MOCK; `RechargeModal` has
  checkout-active state, duplicate-submit prevention, cancellation handling; `VITE_RAZORPAY_KEY_ID`
  documented in `frontend/.env.example` (optional — backend returns the key id per order).
- **Tests** (`razorpayPayments.node-test.ts`, 13 tests): order creation/validation, signature
  rejection matrix, concurrent confirm-vs-webhook race, duplicate webhooks, failed→late-capture,
  sweep + recovery, 3-way race (sweep vs webhook vs confirm), rollback-on-credit-failure,
  refund/dispute recording without debits, ownership. `mockPayments.node-test.ts` was updated to
  deconfigure Razorpay for its gate matrix (a local `.env` with real test keys legitimately opens
  the RAZORPAY path, which broke the 503 expectation).
- **Config docs**: `docs/RAZORPAY_SETUP.md` — env vars, test/live modes, webhook URL + events,
  Render/Vercel setup, deployment order, rollback.

### Open business decisions to raise before/while building Phase 3

Per the spec's own instruction ("report it and leave the action gated" rather than invent a rule):

- When a dispute/chargeback arrives for coins **already spent** on a chat/tool, is the policy
  "absorb the loss" (no wallet debit, cost eaten by the business), "debit the wallet down to zero
  only, track the shortfall separately," or "debit even negative" (explicitly disallowed by the
  spec's "never allow a negative balance")? **Needs your decision — nothing should debit
  automatically until this is answered.**
- Partial refunds: does a partial refund reduce the `PURCHASED` bucket proportionally, or does an
  admin pick the bucket manually per case?
- Does a successful refund/chargeback affect the user's ability to start new paid chats while
  `ACTION_REQUIRED` rows are outstanding against their account?

---

## How to resume

```bash
cd backend
npm run test:db:up      # disposable Postgres 17 in Docker
npm run test:db:init    # prisma db push + custom SQL objects, against 127.0.0.1:54329 ONLY
```

Then pick up at "Not yet done" step 1 (the `PaymentRefund` model) — the enum groundwork is already
in `backend/prisma/schema/payment.prisma` waiting for it. Everything in Part 2 above is existing,
working code to extend; nothing there should be rewritten from scratch.
