/**
 * Live foreign-exchange rates via Open Exchange Rates, with an in-memory cache
 * and a static fallback. Replaces the mobile app's hardcoded `ratePerKES`
 * table, which silently drifts from the market and risks mischarging.
 *
 * Env:
 *   OPEN_EXCHANGE_RATES_APP_ID — app id from openexchangerates.org
 *
 * When the app id is absent we serve the static fallback table and flag the
 * response `source: "static"` so clients can surface an "indicative rate" note.
 */
const APP_ID = process.env.OPEN_EXCHANGE_RATES_APP_ID ?? "";
const LATEST_URL = "https://openexchangerates.org/api/latest.json";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Static fallback rates expressed as units per 1 USD. Kept deliberately small
 * — just the live + near-term markets and key diaspora currencies. Approximate;
 * used only when no live feed is configured.
 */
const STATIC_USD_RATES: Record<string, number> = {
  USD: 1,
  KES: 129,
  UGX: 3700,
  TZS: 2550,
  RWF: 1380,
  ETB: 123,
  GHS: 15.3,
  NGN: 1600,
  ZAR: 18.2,
  EGP: 49,
  XOF: 600, // West African CFA franc (CI, SN, …)
  XAF: 600, // Central African CFA franc (CM, …)
  MAD: 9.9,
  ZMW: 26,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AED: 3.67,
  SAR: 3.75,
  AUD: 1.5,
};

interface FxCache {
  fetchedAt: number;
  rates: Record<string, number>; // units per 1 USD
}

let cache: FxCache | null = null;

export function isFxConfigured(): boolean {
  return Boolean(APP_ID);
}

async function getUsdRates(): Promise<{ rates: Record<string, number>; source: "live" | "static"; fetchedAt: number }> {
  if (!isFxConfigured()) {
    return { rates: STATIC_USD_RATES, source: "static", fetchedAt: Date.now() };
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { rates: cache.rates, source: "live", fetchedAt: cache.fetchedAt };
  }

  try {
    const res = await fetch(`${LATEST_URL}?app_id=${APP_ID}`);
    if (!res.ok) throw new Error(`FX provider error: ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json.rates) throw new Error("FX provider returned no rates");
    cache = { fetchedAt: Date.now(), rates: json.rates };
    return { rates: json.rates, source: "live", fetchedAt: cache.fetchedAt };
  } catch {
    // Network/provider failure — degrade gracefully to the static table.
    return { rates: STATIC_USD_RATES, source: "static", fetchedAt: Date.now() };
  }
}

export interface FxRatesResult {
  base: string;
  rates: Record<string, number>; // units of each currency per 1 unit of base
  source: "live" | "static";
  fetchedAt: string;
}

/**
 * Return exchange rates rebased to `base` (default KES — the app's home
 * currency). `rates[X]` = how many X per 1 `base`.
 */
export async function getRates(base = "KES"): Promise<FxRatesResult> {
  const baseCode = base.toUpperCase();
  const { rates: usdRates, source, fetchedAt } = await getUsdRates();

  const basePerUsd = usdRates[baseCode];
  const rebased: Record<string, number> = {};
  if (basePerUsd) {
    for (const [code, perUsd] of Object.entries(usdRates)) {
      rebased[code] = perUsd / basePerUsd;
    }
  }

  return {
    base: baseCode,
    rates: rebased,
    source,
    fetchedAt: new Date(fetchedAt).toISOString(),
  };
}
