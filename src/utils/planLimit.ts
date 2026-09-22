/**
 * Plan-limit errors, from either route a property can be created by:
 *  - the backend API, which returns {code, message, plan_name, …}
 *  - a direct Supabase insert, blocked by the database trigger with a
 *    message starting "PLAN_LIMIT_PROPERTIES:" / "PLAN_LIMIT_NO_SUBSCRIPTION:"
 */
export type PlanLimitInfo = {
  message: string;
  needsSubscription: boolean;
};

export function planLimitFromError(err: unknown): PlanLimitInfo | null {
  const detail = (err as any)?.detail ?? err;

  if (detail && typeof detail === 'object') {
    const code = (detail as any).code;
    if (code === 'property_limit_reached' || code === 'no_active_subscription') {
      return {
        message: (detail as any).message || 'Your plan does not allow more properties.',
        needsSubscription: code === 'no_active_subscription',
      };
    }
  }

  const raw = String((detail as any)?.message ?? detail ?? '');
  const match = raw.match(/PLAN_LIMIT_(PROPERTIES|NO_SUBSCRIPTION):\s*(.*)/);
  if (match) {
    return { message: match[2].trim(), needsSubscription: match[1] === 'NO_SUBSCRIPTION' };
  }
  return null;
}
