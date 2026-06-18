export interface EACountry {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  phonePrefix: string;
  /** Approx units of this currency per 1 KES (for display conversion) */
  ratePerKES: number;
  paymentMethods: PaymentMethod[];
}

export type PaymentMethodType = "mobile_money" | "card" | "bank" | "ussd";

export interface PaymentMethod {
  id: string;
  label: string;
  sub: string;
  icon: string;
  type: PaymentMethodType;
  operator?: string;
  phonePrefix?: string;
  phonePlaceholder?: string;
  color: string;
}

export const EA_COUNTRIES: EACountry[] = [
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    currencyCode: "KES",
    currencySymbol: "KSh",
    currencyName: "Kenyan Shilling",
    phonePrefix: "+254",
    ratePerKES: 1,
    paymentMethods: [
      {
        id: "mpesa",
        label: "M-Pesa",
        sub: "Safaricom mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Safaricom",
        phonePrefix: "+254",
        phonePlaceholder: "712 345 678",
        color: "#4CAF50",
      },
      {
        id: "airtel_ke",
        label: "Airtel Money",
        sub: "Airtel Kenya mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Airtel",
        phonePrefix: "+254",
        phonePlaceholder: "733 456 789",
        color: "#F44336",
      },
      {
        id: "pesalink",
        label: "PesaLink",
        sub: "Bank transfer via PesaLink",
        icon: "credit-card",
        type: "bank",
        color: "#1565C0",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard / Amex",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  {
    code: "UG",
    name: "Uganda",
    flag: "🇺🇬",
    currencyCode: "UGX",
    currencySymbol: "USh",
    currencyName: "Ugandan Shilling",
    phonePrefix: "+256",
    ratePerKES: 28.7,
    paymentMethods: [
      {
        id: "mtn_ug",
        label: "MTN Mobile Money",
        sub: "MTN Uganda MoMo",
        icon: "smartphone",
        type: "mobile_money",
        operator: "MTN",
        phonePrefix: "+256",
        phonePlaceholder: "77 123 4567",
        color: "#FFD600",
      },
      {
        id: "airtel_ug",
        label: "Airtel Money Uganda",
        sub: "Airtel Uganda mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Airtel",
        phonePrefix: "+256",
        phonePlaceholder: "70 234 5678",
        color: "#F44336",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
      {
        id: "bank_ug",
        label: "Bank Transfer",
        sub: "RTGS / local bank transfer",
        icon: "credit-card",
        type: "bank",
        color: "#1565C0",
      },
    ],
  },
  {
    code: "TZ",
    name: "Tanzania",
    flag: "🇹🇿",
    currencyCode: "TZS",
    currencySymbol: "TSh",
    currencyName: "Tanzanian Shilling",
    phonePrefix: "+255",
    ratePerKES: 20.9,
    paymentMethods: [
      {
        id: "mpesa_tz",
        label: "M-Pesa Tanzania",
        sub: "Vodacom Tanzania mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Vodacom",
        phonePrefix: "+255",
        phonePlaceholder: "74 123 4567",
        color: "#E53935",
      },
      {
        id: "tigopesa",
        label: "Tigo Pesa",
        sub: "Tigo Tanzania mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Tigo",
        phonePrefix: "+255",
        phonePlaceholder: "71 234 5678",
        color: "#0091EA",
      },
      {
        id: "airtel_tz",
        label: "Airtel Money TZ",
        sub: "Airtel Tanzania mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Airtel",
        phonePrefix: "+255",
        phonePlaceholder: "78 345 6789",
        color: "#F44336",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  {
    code: "RW",
    name: "Rwanda",
    flag: "🇷🇼",
    currencyCode: "RWF",
    currencySymbol: "RF",
    currencyName: "Rwandan Franc",
    phonePrefix: "+250",
    ratePerKES: 10.5,
    paymentMethods: [
      {
        id: "mtn_rw",
        label: "MTN Mobile Money",
        sub: "MTN Rwanda MoMo",
        icon: "smartphone",
        type: "mobile_money",
        operator: "MTN",
        phonePrefix: "+250",
        phonePlaceholder: "78 123 4567",
        color: "#FFD600",
      },
      {
        id: "airtel_rw",
        label: "Airtel Money Rwanda",
        sub: "Airtel Rwanda mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Airtel",
        phonePrefix: "+250",
        phonePlaceholder: "73 234 5678",
        color: "#F44336",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  {
    code: "ET",
    name: "Ethiopia",
    flag: "🇪🇹",
    currencyCode: "ETB",
    currencySymbol: "Br",
    currencyName: "Ethiopian Birr",
    phonePrefix: "+251",
    ratePerKES: 1.01,
    paymentMethods: [
      {
        id: "telebirr",
        label: "Telebirr",
        sub: "Ethio Telecom mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Ethio Telecom",
        phonePrefix: "+251",
        phonePlaceholder: "91 123 4567",
        color: "#00897B",
      },
      {
        id: "amole",
        label: "Amole",
        sub: "Dashen Bank digital wallet",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Dashen Bank",
        phonePrefix: "+251",
        phonePlaceholder: "91 234 5678",
        color: "#0277BD",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
      {
        id: "cbe_birr",
        label: "CBE Birr",
        sub: "Commercial Bank of Ethiopia",
        icon: "credit-card",
        type: "bank",
        color: "#1565C0",
      },
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    currencyCode: "GHS",
    currencySymbol: "GH₵",
    currencyName: "Ghanaian Cedi",
    phonePrefix: "+233",
    ratePerKES: 0.109,
    paymentMethods: [
      {
        id: "mtn_gh",
        label: "MTN Mobile Money",
        sub: "MTN Ghana MoMo",
        icon: "smartphone",
        type: "mobile_money",
        operator: "MTN",
        phonePrefix: "+233",
        phonePlaceholder: "24 123 4567",
        color: "#FFD600",
      },
      {
        id: "vodafone_cash",
        label: "Vodafone Cash",
        sub: "Vodafone Ghana mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Vodafone",
        phonePrefix: "+233",
        phonePlaceholder: "20 234 5678",
        color: "#E53935",
      },
      {
        id: "airteltigo",
        label: "AirtelTigo Money",
        sub: "AirtelTigo Ghana mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "AirtelTigo",
        phonePrefix: "+233",
        phonePlaceholder: "26 345 6789",
        color: "#F44336",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard / Verve",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    currencyCode: "NGN",
    currencySymbol: "₦",
    currencyName: "Nigerian Naira",
    phonePrefix: "+234",
    ratePerKES: 12.4,
    paymentMethods: [
      {
        id: "bank_ng",
        label: "Bank Transfer",
        sub: "Instant bank transfer (NIP)",
        icon: "credit-card",
        type: "bank",
        color: "#1565C0",
      },
      {
        id: "ussd_ng",
        label: "USSD",
        sub: "Pay with *737# or *894#",
        icon: "smartphone",
        type: "ussd",
        color: "#4CAF50",
      },
      {
        id: "opay",
        label: "OPay",
        sub: "OPay digital wallet",
        icon: "smartphone",
        type: "mobile_money",
        operator: "OPay",
        phonePrefix: "+234",
        phonePlaceholder: "803 123 4567",
        color: "#4CAF50",
      },
      {
        id: "palmpay",
        label: "PalmPay",
        sub: "PalmPay digital wallet",
        icon: "smartphone",
        type: "mobile_money",
        operator: "PalmPay",
        phonePrefix: "+234",
        phonePlaceholder: "812 345 6789",
        color: "#43A047",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard / Verve",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  // ── South Africa ──────────────────────────────────────────────────────────
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    currencyCode: "ZAR",
    currencySymbol: "R",
    currencyName: "South African Rand",
    phonePrefix: "+27",
    ratePerKES: 0.14,
    paymentMethods: [
      {
        id: "snapscan",
        label: "SnapScan",
        sub: "QR code payment",
        icon: "smartphone",
        type: "mobile_money",
        operator: "SnapScan",
        phonePrefix: "+27",
        phonePlaceholder: "82 123 4567",
        color: "#1A237E",
      },
      {
        id: "ozow",
        label: "Ozow",
        sub: "Instant EFT payment",
        icon: "credit-card",
        type: "bank",
        color: "#00897B",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard / Amex",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  // ── Egypt ─────────────────────────────────────────────────────────────────
  {
    code: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    currencyCode: "EGP",
    currencySymbol: "E£",
    currencyName: "Egyptian Pound",
    phonePrefix: "+20",
    ratePerKES: 0.38,
    paymentMethods: [
      {
        id: "vodafone_cash_eg",
        label: "Vodafone Cash",
        sub: "Vodafone Egypt mobile wallet",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Vodafone",
        phonePrefix: "+20",
        phonePlaceholder: "100 123 4567",
        color: "#E53935",
      },
      {
        id: "instapay_eg",
        label: "InstaPay",
        sub: "Central Bank of Egypt instant transfer",
        icon: "credit-card",
        type: "bank",
        color: "#0277BD",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  // ── Côte d'Ivoire ─────────────────────────────────────────────────────────
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    currencyCode: "XOF",
    currencySymbol: "CFA",
    currencyName: "West African CFA Franc",
    phonePrefix: "+225",
    ratePerKES: 4.65,
    paymentMethods: [
      {
        id: "orange_money_ci",
        label: "Orange Money",
        sub: "Orange Côte d'Ivoire mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Orange",
        phonePrefix: "+225",
        phonePlaceholder: "07 12 34 56",
        color: "#FF6600",
      },
      {
        id: "mtn_momo_ci",
        label: "MTN MoMo",
        sub: "MTN Côte d'Ivoire mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "MTN",
        phonePrefix: "+225",
        phonePlaceholder: "05 12 34 56",
        color: "#FFD600",
      },
      {
        id: "wave_ci",
        label: "Wave",
        sub: "Wave mobile wallet",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Wave",
        phonePrefix: "+225",
        phonePlaceholder: "01 12 34 56",
        color: "#1565C0",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  // ── Senegal ───────────────────────────────────────────────────────────────
  {
    code: "SN",
    name: "Senegal",
    flag: "🇸🇳",
    currencyCode: "XOF",
    currencySymbol: "CFA",
    currencyName: "West African CFA Franc",
    phonePrefix: "+221",
    ratePerKES: 4.65,
    paymentMethods: [
      {
        id: "orange_money_sn",
        label: "Orange Money",
        sub: "Orange Senegal mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Orange",
        phonePrefix: "+221",
        phonePlaceholder: "77 123 4567",
        color: "#FF6600",
      },
      {
        id: "wave_sn",
        label: "Wave",
        sub: "Wave mobile wallet",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Wave",
        phonePrefix: "+221",
        phonePlaceholder: "70 234 5678",
        color: "#1565C0",
      },
      {
        id: "free_money_sn",
        label: "Free Money",
        sub: "Free Senegal mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Free",
        phonePrefix: "+221",
        phonePlaceholder: "76 345 6789",
        color: "#00897B",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
  // ── Cameroon ──────────────────────────────────────────────────────────────
  {
    code: "CM",
    name: "Cameroon",
    flag: "🇨🇲",
    currencyCode: "XAF",
    currencySymbol: "FCFA",
    currencyName: "Central African CFA Franc",
    phonePrefix: "+237",
    ratePerKES: 4.65,
    paymentMethods: [
      {
        id: "mtn_momo_cm",
        label: "MTN MoMo",
        sub: "MTN Cameroon mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "MTN",
        phonePrefix: "+237",
        phonePlaceholder: "6 71 23 45 67",
        color: "#FFD600",
      },
      {
        id: "orange_money_cm",
        label: "Orange Money",
        sub: "Orange Cameroon mobile money",
        icon: "smartphone",
        type: "mobile_money",
        operator: "Orange",
        phonePrefix: "+237",
        phonePlaceholder: "6 99 12 34 56",
        color: "#FF6600",
      },
      {
        id: "card",
        label: "Card",
        sub: "Visa / Mastercard",
        icon: "credit-card",
        type: "card",
        color: "#FF6B00",
      },
    ],
  },
];

export function getCountryByCode(code: string): EACountry | undefined {
  return EA_COUNTRIES.find((c) => c.code === code);
}

export function getCountryByCurrency(currencyCode: string): EACountry | undefined {
  return EA_COUNTRIES.find((c) => c.currencyCode === currencyCode);
}

/** Convert an amount in KES to the target currency */
export function convertFromKES(amountKES: number, targetCountryCode: string): number {
  const country = getCountryByCode(targetCountryCode);
  if (!country) return amountKES;
  return Math.round(amountKES * country.ratePerKES);
}

/** Convert an amount in a source currency to KES */
export function convertToKES(amount: number, sourceCountryCode: string): number {
  const country = getCountryByCode(sourceCountryCode);
  if (!country || country.ratePerKES === 0) return amount;
  return Math.round(amount / country.ratePerKES);
}

/** Convert between any two EA currencies via KES as base */
export function convertCurrency(
  amount: number,
  fromCurrencyCode: string,
  toCountryCode: string
): number {
  const fromCountry = EA_COUNTRIES.find((c) => c.currencyCode === fromCurrencyCode);
  if (!fromCountry) return amount;
  const amountInKES = amount / fromCountry.ratePerKES;
  return convertFromKES(amountInKES, toCountryCode);
}
