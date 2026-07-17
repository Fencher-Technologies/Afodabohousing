<!-- BEGIN:reactnative-agent-rules -->

# This is NOT the React Native you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/react-native/Libraries/` and any framework-specific docs (e.g. Expo SDK docs in `node_modules/expo/`) before writing any code. Heed deprecation notices.

<!-- END:reactnative-agent-rules -->

## Objective
- Fix payment flow end-to-end: backend subscription creation → sandbox auto-confirm → mobile polling → success state.

## Important Details
- Backend sandbox auto-confirm (`services/subscriptions.py`): `threading.Timer(30s)` calls `confirm_subscription()` to simulate NylonPay webhook when `nylonpay_environment == "sandbox"`.
- Mobile payment screen (`subscription-payment.tsx`): after API success → shows "Payment Initiated" with phone instructions; polls `GET /subscriptions/current` every 5s; shows success only on `status === "active"`; times out after 120s.
- `manager_subscriptions` table schema: no `amount_paid` column — uses `plan_id`, `status`, `payment_reference`, `payment_status`, `expires_at`.
- Run migration `015_subscriptions.sql` with **Run without RLS** (drops old table).

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features and scope.
2. `context/architecture.md` — system structure, boundaries, storage model and invariants.
3. `context/ui-context.md` — theme, colors, typography, screen/component design and conventions.
4. `context/code-standards.md` — implementation rules and conventions.
5. `context/ai-workflow-rules.md` — development workflow, scoping rules and delivery approach.
6. `context/progress-tracker.md` — current phase, completed work, open questions and next steps.

Update `context/progress-tracker.md` after each meaningful implementation change.

If an implementation change affects the architecture, scope, or standards documented in context files, update the relevant file before continuing.
