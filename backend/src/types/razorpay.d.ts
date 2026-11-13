declare module "razorpay" {
  export interface RazorpayOrderOptions {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
    payment_capture?: boolean | number;
  }

  export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt?: string;
    status: "created" | "attempted" | "paid";
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
  }

  export interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: "created" | "authorized" | "captured" | "refunded" | "failed";
    order_id: string;
    invoice_id?: string | null;
    international: boolean;
    method: string;
    amount_refunded: number;
    refund_status?: string | null;
    captured: boolean;
    description?: string;
    card_id?: string;
    bank?: string;
    wallet?: string;
    vpa?: string;
    email?: string;
    contact?: string;
    notes: Record<string, string>;
    fee?: number;
    tax?: number;
    error_code?: string | null;
    error_description?: string | null;
    created_at: number;
  }

  export interface RazorpayRefundOptions {
    amount?: number;
    speed?: "normal" | "optimum";
    notes?: Record<string, string>;
    receipt?: string;
  }

  export interface RazorpayRefund {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    payment_id: string;
    notes: Record<string, string>;
    receipt?: string;
    status: "pending" | "processed" | "failed";
    speed_processed?: string;
    speed_requested?: string;
    created_at: number;
  }

  export interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  export default class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create(params: RazorpayOrderOptions): Promise<RazorpayOrder>;
      fetch(orderId: string): Promise<RazorpayOrder>;
      fetchPayments(orderId: string): Promise<{ entity: string; count: number; items: RazorpayPayment[] }>;
    };
    payments: {
      fetch(paymentId: string): Promise<RazorpayPayment>;
      refund(paymentId: string, params?: RazorpayRefundOptions): Promise<RazorpayRefund>;
    };
  }
}
