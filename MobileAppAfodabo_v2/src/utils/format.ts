/**
 * Formatting utilities — currency, dates, phone, labels.
 */

/**
 * Format an amount in whatever currency it was recorded in.
 *
 * Properties may be listed in different currencies, so every amount is
 * formatted with the currency it was recorded in.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined = "UGX",
): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const code = (currency || "UGX").toUpperCase();
  return `${code} ${n.toLocaleString("en-UG")}`;
}

/**
 * Price shown on a listing card.
 *
 * A property can hold several units at different rents, so the card shows the
 * range across them ("UGX 300K – 800K") rather than the property-level rent,
 * which would misrepresent a multi-unit building. Falls back to the single
 * rent when the property has no units.
 */
export function formatListingPrice(
  fallbackAmount: number | string | null | undefined,
  currency: string | null | undefined,
  unitMin?: number | null,
  unitMax?: number | null,
): string {
  if (unitMin != null && unitMax != null) {
    if (Number(unitMin) === Number(unitMax)) {
      return formatMoneyShort(unitMin, currency);
    }
    return `${formatMoneyShort(unitMin, currency)} – ${formatMoneyShort(unitMax, currency)}`;
  }
  return formatMoneyShort(fallbackAmount, currency);
}

/** Compact form of formatMoney, e.g. "USD 1.2M". */
export function formatMoneyShort(
  amount: number | string | null | undefined,
  currency: string | null | undefined = "UGX",
): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const code = (currency || "UGX").toUpperCase();
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${code} ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${code} ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${code} ${n.toLocaleString("en-UG")}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatPeriod(period: string): string {
  switch (period) {
    case "monthly": return "/month";
    case "quarterly": return "/qtr";
    case "annually": return "/yr";
    default: return "";
  }
}

export function formatMethod(method: string | null): string {
  switch (method) {
    case "cash": return "Cash";
    case "bank": return "Bank Deposit";
    case "bank_transfer": return "Bank Transfer";
    case "mobile_money": return "Mobile Money";
    case "credit_card": return "Credit Card";
    case "check": return "Cheque";
    case "other": return "Other";
    default: return method ?? "—";
  }
}

export function formatPropertyType(type: string | null | undefined): string {
  if (!type) return "N/A";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatAmenity(amenity: string | null | undefined): string {
  if (!amenity) return "—";
  const map: Record<string, string> = {
    water: "Water",
    electricity: "Electricity",
    parking: "Parking",
    security: "Security",
    wifi: "WiFi",
    garden: "Garden",
    balcony: "Balcony",
    furnished: "Furnished",
    borehole: "Borehole",
    solar: "Solar",
  };
  return map[amenity] ?? amenity;
}

export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const days = daysSince(dateStr);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 4) return phone ?? "—";
  return phone.slice(0, 4) + "••••" + phone.slice(-3);
}
