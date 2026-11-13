import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "../api/walletApi";
import { useAuthStore } from "@/store/authStore";

export const WALLET_QUERY_KEY = ["wallet", "summary"] as const;

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: () => walletApi.getSummary(),
    enabled,
    staleTime: 10_000,
  });
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type RechargeInput =
  | number
  | {
      amountPaise: number;
      onBeforeOpen?: () => void;
      onDismiss?: () => void;
    };

/**
 * Full recharge flow:
 * 1. Creates a server-priced order via POST /api/wallet/recharge/order.
 * 2. Launches Razorpay Standard Checkout in browser.
 * 3. On successful payment, sends payment_id, order_id, signature to POST /api/wallet/recharge/confirm.
 * 4. Invalidates the wallet query so the refreshed balance is shown immediately.
 */
export function useRecharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RechargeInput) => {
      const amountPaise = typeof input === "number" ? input : input.amountPaise;
      const onBeforeOpen = typeof input === "object" ? input.onBeforeOpen : undefined;
      const onDismiss = typeof input === "object" ? input.onDismiss : undefined;

      const order = await walletApi.createRechargeOrder(amountPaise);

      // If backend reports MOCK provider (dev/test sandbox), confirm immediately
      if (order.provider === "MOCK" || !order.providerOrderId) {
        return walletApi.confirmRechargeOrder({ orderId: order.orderId });
      }

      // Real Razorpay checkout flow
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Unable to load Razorpay payment gateway. Please check your internet connection.");
      }

      const key = order.keyId || (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        throw new Error("Payment gateway configuration missing. Please contact support.");
      }

      const user = useAuthStore.getState().user;

      return new Promise<{ status: string; balancePaise: number }>((resolve, reject) => {
        const options = {
          key,
          amount: order.amountPaise,
          currency: order.currency || "INR",
          name: "MyBhagya",
          description: "Wallet Coin Top-up",
          order_id: order.providerOrderId,
          prefill: {
            name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
            email: user?.email || undefined,
            contact: user?.phoneNo || undefined,
          },
          theme: {
            color: "#592209", // Warm devotional primary brand color
          },
          modal: {
            ondismiss: () => {
              onDismiss?.();
              reject(new Error("Payment cancelled by user"));
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const result = await walletApi.confirmRechargeOrder({
                orderId: order.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              });
              resolve(result);
            } catch (err) {
              onDismiss?.();
              reject(err);
            }
          },
        };

        try {
          const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { on: (event: string, handler: (data: unknown) => void) => void; open: () => void } }).Razorpay(options);
          rzp.on("payment.failed", (resp: unknown) => {
            const err = resp as { error?: { description?: string } };
            onDismiss?.();
            reject(new Error(err?.error?.description || "Payment failed"));
          });

          // Temporarily hide parent modal before opening Razorpay to prevent Radix focus traps
          onBeforeOpen?.();
          rzp.open();
        } catch (err) {
          onDismiss?.();
          reject(err);
        }
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY }),
  });
}
