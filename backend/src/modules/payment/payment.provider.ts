// Payment gateway seam. Only a mock provider exists today — the user has explicitly
// deferred wiring up a real gateway. When one is added (Razorpay is the natural fit given
// INR pricing throughout this app), implement this same interface and swap the export
// below; nothing in payment.service.ts or the wallet/chat modules needs to change.

export interface CreateOrderResult {
  providerOrderId: string;
}

export interface PaymentProviderAdapter {
  createOrder(amountPaise: number): Promise<CreateOrderResult>;
}

/**
 * Fabricates an order id instantly and treats every recharge as immediately payable —
 * there is no real checkout step. `payment.service.confirmRechargeOrder` is still a
 * separate call from `createRechargeOrder` (mirroring a real gateway's create→webhook
 * shape), it just never fails here.
 */
export const mockPaymentProvider: PaymentProviderAdapter = {
  async createOrder(_amountPaise: number): Promise<CreateOrderResult> {
    return { providerOrderId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` };
  },
};

export const paymentProvider: PaymentProviderAdapter = mockPaymentProvider;
