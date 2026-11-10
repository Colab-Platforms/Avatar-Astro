import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "../api/walletApi";

export const WALLET_QUERY_KEY = ["wallet", "summary"] as const;

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: () => walletApi.getSummary(),
    enabled,
    staleTime: 10_000,
  });
}

/** Full recharge flow: create an order, then (today) immediately confirm it against the
 * mock provider. A real gateway later only changes what happens between these two calls
 * (a hosted checkout, a signed webhook) — this hook's shape stays the same. */
export function useRecharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amountPaise: number) => {
      const order = await walletApi.createRechargeOrder(amountPaise);
      return walletApi.confirmRechargeOrder(order.orderId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_QUERY_KEY }),
  });
}
