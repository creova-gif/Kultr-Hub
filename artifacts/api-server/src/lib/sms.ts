/**
 * SMS delivery via Africa's Talking (best deliverability across African
 * networks). Mirrors the Paystack/M-Pesa pattern: when credentials are absent
 * the client runs in "simulated" mode — it logs instead of sending and signals
 * the caller so flows stay testable in dev/demo without a live gateway.
 *
 * Env:
 *   AT_API_KEY     — Africa's Talking API key
 *   AT_USERNAME    — Africa's Talking username ("sandbox" for the sandbox)
 *   AT_SENDER_ID   — optional alphanumeric sender ID / shortcode
 *   AT_ENVIRONMENT — "sandbox" | "production" (defaults to sandbox)
 */
const AT_API_KEY = process.env.AT_API_KEY ?? "";
const AT_USERNAME = process.env.AT_USERNAME ?? "";
const AT_SENDER_ID = process.env.AT_SENDER_ID ?? "";
const AT_ENVIRONMENT = process.env.AT_ENVIRONMENT ?? "sandbox";

const BASE_URL =
  AT_ENVIRONMENT === "production"
    ? "https://api.africastalking.com/version1/messaging"
    : "https://api.sandbox.africastalking.com/version1/messaging";

export interface SendSmsParams {
  /** Recipient in E.164 form, e.g. "+254712345678". */
  to: string;
  message: string;
}

export interface SendSmsResult {
  recipients: number;
  messageId?: string;
}

export function isSmsConfigured(): boolean {
  return Boolean(AT_API_KEY && AT_USERNAME);
}

/**
 * Send a single SMS. Returns null when running in simulated mode (no creds),
 * otherwise the gateway result. Throws on a hard gateway error.
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult | null> {
  if (!isSmsConfigured()) {
    // Simulated mode — never log full message bodies in production paths, but
    // dev visibility is useful here.
    console.log(`[sms:simulated] to=${params.to} message="${params.message}"`);
    return null;
  }

  const form = new URLSearchParams();
  form.set("username", AT_USERNAME);
  form.set("to", params.to);
  form.set("message", params.message);
  if (AT_SENDER_ID) form.set("from", AT_SENDER_ID);

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      apiKey: AT_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new Error(`SMS gateway error: ${res.status}`);
  }

  const json = (await res.json()) as {
    SMSMessageData?: {
      Recipients?: Array<{ messageId?: string; status?: string }>;
    };
  };

  const recipients = json.SMSMessageData?.Recipients ?? [];
  return {
    recipients: recipients.length,
    messageId: recipients[0]?.messageId,
  };
}
