import crypto from "node:crypto";
import Razorpay from "razorpay";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

export interface CreateOrderParams {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  providerOrderId: string;
  amountPaise: number;
  currency: string;
}

export interface FetchPaymentResult {
  id: string;
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  captured: boolean;
  method?: string;
  email?: string;
  contact?: string;
}

export interface PaymentProviderAdapter {
  isConfigured(): boolean;
  getPublishableKey(): string | null;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  fetchPayment(paymentId: string): Promise<FetchPaymentResult>;
  fetchOrderPayments(providerOrderId: string): Promise<FetchPaymentResult[]>;
  verifyCheckoutSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean;
}

/**
 * Timing-safe string comparison to protect against timing attacks on HMAC signatures.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Razorpay Live/Test Gateway Adapter
 */
export class RazorpayPaymentProvider implements PaymentProviderAdapter {
  private keyId: string | null = null;
  private keySecret: string | null = null;
  private webhookSecret: string | null = null;
  private client: Razorpay | null = null;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.reloadConfig(env);
  }

  public reloadConfig(env: Record<string, string | undefined> = process.env): void {
    this.keyId = env.RAZORPAY_KEY_ID?.trim() || null;
    this.keySecret = env.RAZORPAY_KEY_SECRET?.trim() || null;
    this.webhookSecret = env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;

    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    if (!this.keyId || !this.keySecret || !this.client) return false;
    // Guard against literal template/placeholder strings
    const isPlaceholder =
      this.keyId.includes("YourTestKey") ||
      this.keyId.includes("your_key") ||
      this.keySecret.includes("YourTestKey") ||
      this.keySecret.includes("your_razorpay");
    return !isPlaceholder;
  }

  public isWebhookConfigured(): boolean {
    return Boolean(this.webhookSecret);
  }

  public getPublishableKey(): string | null {
    return this.keyId;
  }

  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!this.client || !this.keyId) {
      throw new ApiError("Razorpay is not configured", STATUS_CODES.SERVICE_UNAVAILABLE);
    }

    try {
      const order = await this.client.orders.create({
        amount: params.amountPaise,
        currency: "INR",
        receipt: params.receipt,
        notes: params.notes,
        payment_capture: 1, // automatic capture
      });

      return {
        providerOrderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
      };
    } catch (err: unknown) {
      const rzpErr = err as { statusCode?: number; error?: { code?: string; description?: string }; message?: string };
      const description = rzpErr?.error?.description || rzpErr?.message || String(err);
      console.error("[razorpay.createOrder] failed:", description);
      const isDev = process.env.NODE_ENV !== "production";
      const message = isDev
        ? `Failed to initiate payment with Razorpay: ${description}`
        : "Failed to initiate payment with Razorpay. Please try again.";
      throw new ApiError(message, STATUS_CODES.SERVER_ERROR);
    }
  }

  public async fetchPayment(paymentId: string): Promise<FetchPaymentResult> {
    if (!this.client) {
      throw new ApiError("Razorpay is not configured", STATUS_CODES.SERVICE_UNAVAILABLE);
    }

    try {
      const payment = await this.client.payments.fetch(paymentId);
      return {
        id: payment.id,
        providerOrderId: payment.order_id,
        amountPaise: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        captured: Boolean(payment.captured),
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay.fetchPayment] failed for paymentId:", paymentId, msg);
      throw new ApiError("Failed to verify payment with Razorpay.", STATUS_CODES.SERVER_ERROR);
    }
  }

  public async fetchOrderPayments(providerOrderId: string): Promise<FetchPaymentResult[]> {
    if (!this.client) {
      throw new ApiError("Razorpay is not configured", STATUS_CODES.SERVICE_UNAVAILABLE);
    }

    try {
      const res = await this.client.orders.fetchPayments(providerOrderId);
      return (res.items || []).map((payment) => ({
        id: payment.id,
        providerOrderId: payment.order_id,
        amountPaise: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        captured: Boolean(payment.captured),
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay.fetchOrderPayments] failed for orderId:", providerOrderId, msg);
      return [];
    }
  }

  public verifyCheckoutSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    if (!this.keySecret) return false;
    const body = `${params.orderId}|${params.paymentId}`;
    const expected = crypto.createHmac("sha256", this.keySecret).update(body).digest("hex");
    return timingSafeEqualString(params.signature, expected);
  }

  public verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!this.webhookSecret || !signature) return false;
    const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(body).digest("hex");
    return timingSafeEqualString(signature, expected);
  }
}

/**
 * Mock provider for local development / testing without live gateway credentials.
 */
export class MockPaymentProvider implements PaymentProviderAdapter {
  isConfigured(): boolean {
    return true;
  }

  getPublishableKey(): string | null {
    return "rzp_test_mock_key";
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const providerOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      providerOrderId,
      amountPaise: params.amountPaise,
      currency: "INR",
    };
  }

  async fetchPayment(paymentId: string): Promise<FetchPaymentResult> {
    return {
      id: paymentId,
      providerOrderId: `order_mock_${paymentId.slice(0, 10)}`,
      amountPaise: 10000,
      currency: "INR",
      status: "captured",
      captured: true,
    };
  }

  async fetchOrderPayments(_providerOrderId: string): Promise<FetchPaymentResult[]> {
    return [];
  }

  verifyCheckoutSignature(_params: { orderId: string; paymentId: string; signature: string }): boolean {
    return true;
  }

  verifyWebhookSignature(_rawBody: Buffer | string, _signature: string): boolean {
    return true;
  }
}

export const defaultRazorpayProvider = new RazorpayPaymentProvider();
export const mockPaymentProvider = new MockPaymentProvider();

let activeProvider: PaymentProviderAdapter = defaultRazorpayProvider;

export function getPaymentProvider(): PaymentProviderAdapter {
  return activeProvider;
}

export function setPaymentProviderForTest(provider: PaymentProviderAdapter | null): void {
  activeProvider = provider ?? defaultRazorpayProvider;
}
