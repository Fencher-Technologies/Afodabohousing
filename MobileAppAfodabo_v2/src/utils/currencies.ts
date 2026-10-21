/**
 * The platform's currency.
 *
 * Axis prices and records everything in US$: subscriptions, boosts, rents,
 * deposits, payments, receipts and reports. The only place another currency
 * appears is the payment gateway, which can bill the shilling equivalent for
 * mobile money (see backend/services/forex.py charge_amount).
 */
export const DEFAULT_CURRENCY = "USD";
