import { authRequest } from "@/lib/authClient";

export type WalletBalanceBucket = "PURCHASED" | "PROMOTIONAL";

export interface WalletLedgerAllocation {
  id: string;
  bucket: WalletBalanceBucket;
  amountPaise: number;
}

export interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  reason: "RECHARGE" | "CHAT_CONSUMPTION" | "REFUND" | "ADJUSTMENT" | "SIGNUP_BONUS" | "TOOL_EXECUTION" | "RESERVATION_RELEASE";
  amountPaise: number;
  balanceAfterPaise: number;
  referenceId: string | null;
  createdAt: string;
  allocations: WalletLedgerAllocation[];
}

export interface WalletSummary {
  balancePaise: number;
  purchasedBalancePaise: number;
  promotionalBalancePaise: number;
  reservedBalancePaise: number;
  transactions: WalletTransaction[];
}

const BASE = "/wallet";

export const walletApi = {
  getSummary() {
    return authRequest<WalletSummary>(BASE);
  },

  createRechargeOrder(amountPaise: number) {
    return authRequest<{ orderId: string; amountPaise: number; status: string }>(`${BASE}/recharge/order`, {
      method: "POST",
      body: { amountPaise },
    });
  },

  confirmRechargeOrder(orderId: string) {
    return authRequest<{ status: string; balancePaise: number }>(`${BASE}/recharge/confirm`, {
      method: "POST",
      body: { orderId },
    });
  },
};
