/**
 * Currency handling for aggregate figures.
 *
 * Totals on the dashboard and reports sum across every property a manager
 * owns. Once listings can be priced in different currencies, those sums stop
 * having a single valid label: adding 300,000 UGX to 500 USD produces a number
 * that should not carry either code.
 *
 * Rather than invent an exchange rate, these helpers report the truth. When a
 * manager's portfolio is in one currency — which is the normal case — totals
 * are labelled with it. When it spans several, the amount is shown without a
 * currency code and callers surface `isMixed` so the UI can say so plainly.
 */

/** Currency shared by every item, or null when they differ or none is set. */
export function uniformCurrency(
  items: ReadonlyArray<{ currency?: string | null; rent_currency?: string | null }> | undefined,
): string | null {
  if (!items || items.length === 0) return null;
  const codes = new Set<string>();
  for (const item of items) {
    const code = (item.currency ?? item.rent_currency ?? "").toUpperCase();
    if (code) codes.add(code);
  }
  if (codes.size !== 1) return null;
  return [...codes][0];
}

export interface AggregateCurrency {
  /** Code to label totals with, or null when the portfolio is mixed. */
  code: string | null;
  /** True when items span more than one currency. */
  isMixed: boolean;
}

export function aggregateCurrency(
  items: ReadonlyArray<{ currency?: string | null; rent_currency?: string | null }> | undefined,
): AggregateCurrency {
  const code = uniformCurrency(items);
  const distinct = new Set(
    (items ?? [])
      .map((i) => (i.currency ?? i.rent_currency ?? "").toUpperCase())
      .filter(Boolean),
  );
  return { code: code ?? (distinct.size === 0 ? "UGX" : null), isMixed: distinct.size > 1 };
}

/**
 * Format an aggregate. With a known currency this matches formatMoney; when
 * the portfolio is mixed the code is omitted rather than guessed.
 */
export function formatAggregate(
  amount: number | string | null | undefined,
  currency: AggregateCurrency,
): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const formatted = n.toLocaleString("en-UG");
  return currency.code ? `${currency.code} ${formatted}` : formatted;
}

/** Short form, e.g. "USD 1.2M" or "1.2M" when mixed. */
export function formatAggregateShort(
  amount: number | string | null | undefined,
  currency: AggregateCurrency,
): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  let body: string;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    body = `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  } else if (n >= 1_000) {
    const k = n / 1_000;
    body = `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  } else {
    body = n.toLocaleString("en-UG");
  }
  return currency.code ? `${currency.code} ${body}` : body;
}
