// Gate for the MOCK payment gateway (POST /api/wallet/recharge/order and /recharge/confirm).
//
// The mock gateway credits coins without any payment, so it must be impossible to reach on any
// deployed environment. It fails CLOSED: it is available only when BOTH
//   1. ALLOW_MOCK_PAYMENTS is exactly "true", and
//   2. NODE_ENV is exactly "development" or "test".
// An unset, misspelled or unexpected NODE_ENV ("staging", "preview", "Production", "") therefore
// leaves it locked. A real gateway must never be wired through this switch.

type Env = Record<string, string | undefined>;

export function isMockPaymentsEnabled(env: Env = process.env): boolean {
  return env.ALLOW_MOCK_PAYMENTS === "true" && (env.NODE_ENV === "development" || env.NODE_ENV === "test");
}

/** True when the flag is set but the environment forbids it — a misconfiguration worth a loud boot warning. */
export function isMockPaymentsMisconfigured(env: Env = process.env): boolean {
  return env.ALLOW_MOCK_PAYMENTS === "true" && !isMockPaymentsEnabled(env);
}
