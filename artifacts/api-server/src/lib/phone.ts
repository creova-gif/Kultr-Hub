/**
 * Phone-number normalization keyed off the user's ISO-3166 country code.
 *
 * Replaces the previous hardcoded "254" (Kenya) prefix logic, which silently
 * produced invalid MSISDNs for every other country. Given the limited set of
 * markets the app serves, a focused dialing-code map is more robust (and far
 * lighter) than pulling in a full libphonenumber dataset.
 *
 * Add new markets here as `EA_COUNTRIES` / the backend country list expands.
 */
const DIALING_CODES: Record<string, string> = {
  // ── Currently live markets ──
  KE: "254", // Kenya
  UG: "256", // Uganda
  TZ: "255", // Tanzania
  RW: "250", // Rwanda
  ET: "251", // Ethiopia
  GH: "233", // Ghana
  NG: "234", // Nigeria
  // ── Near-term expansion ──
  ZA: "27", // South Africa
  EG: "20", // Egypt
  CI: "225", // Côte d'Ivoire
  SN: "221", // Senegal
  CM: "237", // Cameroon
  CD: "243", // DR Congo
  MA: "212", // Morocco
  ZM: "260", // Zambia
  ZW: "263", // Zimbabwe
  MW: "265", // Malawi
  // ── Key diaspora markets ──
  US: "1",
  CA: "1",
  GB: "44",
  FR: "33",
  DE: "49",
  IT: "39",
  ES: "34",
  NL: "31",
  BE: "32",
  PT: "351",
  AE: "971",
  SA: "966",
  QA: "974",
  KW: "965",
  AU: "61",
  SE: "46",
  CH: "41",
  IE: "353",
  CN: "86",
  BR: "55",
};

export function getDialingCode(countryCode: string | undefined): string | undefined {
  if (!countryCode) return undefined;
  return DIALING_CODES[countryCode.toUpperCase()];
}

/**
 * Normalize a raw, user-entered phone number into a bare E.164 MSISDN
 * (digits only, no leading "+"), e.g. "0712 345 678" + "KE" → "254712345678".
 *
 * Handles: international "+" / "00" prefixes, numbers already in full
 * international form, and national numbers with the local trunk "0".
 *
 * Throws if the country is unknown and the number is not already international.
 */
export function normalizeMsisdn(raw: string, countryCode?: string): string {
  if (!raw) throw new Error("Phone number is required");

  // Keep digits and a possible leading "+"
  let cleaned = raw.trim().replace(/[^\d+]/g, "");

  // International forms → strip the prefix, the remainder already carries the
  // country dialing code.
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("00")) return cleaned.slice(2);

  const dialing = getDialingCode(countryCode);

  // Already prefixed with the country dialing code (e.g. "254712...").
  if (dialing && cleaned.startsWith(dialing)) return cleaned;

  // National number with local trunk "0" (e.g. "0712..." → "254712...").
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);

  if (!dialing) {
    throw new Error(
      `Unknown country code "${countryCode ?? ""}". Provide an international number (+...) instead.`
    );
  }

  return `${dialing}${cleaned}`;
}

/** Same as {@link normalizeMsisdn} but returns the "+"-prefixed E.164 form. */
export function toE164(raw: string, countryCode?: string): string {
  return `+${normalizeMsisdn(raw, countryCode)}`;
}
