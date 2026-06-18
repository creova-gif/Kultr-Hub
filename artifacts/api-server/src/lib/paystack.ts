const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const BASE_URL = "https://api.paystack.co";

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned" | "pending";
    reference: string;
    amount: number;
    currency: string;
    metadata: Record<string, unknown>;
  };
}

async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = (await res.json()) as T;
  return json;
}

export async function initializePayment(params: {
  email: string;
  amountKobo: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; reference: string } | null> {
  if (!PAYSTACK_SECRET) return null;

  const result = await paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  if (!result.status) return null;
  return { authorizationUrl: result.data.authorization_url, reference: result.data.reference };
}

export async function verifyPayment(reference: string): Promise<{
  success: boolean;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
} | null> {
  if (!PAYSTACK_SECRET) return null;

  const result = await paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
  if (!result.status || result.data.status !== "success") return null;

  return {
    success: true,
    amount: result.data.amount,
    currency: result.data.currency,
    metadata: result.data.metadata,
  };
}
