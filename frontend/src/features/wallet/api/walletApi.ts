import { authRequest } from "@/lib/authClient";

export interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  reason: "RECHARGE" | "CHAT_CONSUMPTION" | "REFUND" | "ADJUSTMENT";
  amountPaise: number;
  balanceAfterPaise: number;
  referenceId: string | null;
  createdAt: string;
}

export interface WalletSummary {
  balancePaise: number;
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
