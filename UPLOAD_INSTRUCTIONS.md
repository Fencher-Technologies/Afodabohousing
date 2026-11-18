# Subscription recovery fix — upload instructions

Repository: Fencher-Technologies/Afodabohousing
Prepared against commit: 5b0c1d2d0d091235fbef6bb8a9f893789e62d0fa

## Upload the files

1. Extract this ZIP.
2. Copy the .github, backend, and supabase folders into your existing repository folder. Merge folders and replace the matching files; keep all other project files.
3. In GitHub Desktop, review the changes, commit them with the message "Fix subscription payment activation and recovery", then push.
   Alternatively, use GitHub's Add file > Upload files at the repository root, preserving every folder path.
4. Upload the extracted files, not the ZIP itself. UPLOAD_INSTRUCTIONS.md is a guide; it does not need to be uploaded.
5. Deploy the updated Python backend from the new commit. A GitHub upload alone does not update a running backend unless automatic deployments are configured.
6. Check the deployment logs and confirm the deployed commit matches your upload. The existing web and mobile apps use the corrected API; this fix does not require rebuilding either client.

## Database status

Migration 20261118203408_subscription_verified_activation has ALREADY been applied to the Supabase project qloypyemldkrwfhcwvnq.
The migration file is included to keep repository history aligned. Do NOT manually execute its SQL again on that project.
For another database, apply the migration through your normal migration workflow before deploying the backend.

Eric's manual recovery remains active. His two original orders have separately been linked to that recovery so later confirmations cannot grant duplicate time. No gateway receipts are claimed to have been independently verified.

## What changes

- Accept Pesapal API 3 notifications without requiring the legacy optional signature header; verify payment status and merchant reference through the gateway.
- Store the exact checkout amount, currency, and duration for confirmation.
- Reconcile pending and failed orders independently of the currently active subscription.
- Activate subscriptions in one database transaction, with a manager lock and permanent protection against duplicate time credits.
- Preserve existing access when a renewal fails.
- Verify administrator recovery against the recorded gateway order rather than trusting a typed amount.
- Prevent managers from polling another manager's payment.

## Validation already completed

- 60 primary subscription/payment/admin regression tests passed.
- 4 payment polling regression tests passed.
- 12 currency conversion and active-subscription selection tests passed.
- PostgreSQL transaction assertions passed and were rolled back, including amount/currency/tracking rejection, failed-payment recovery, renewal carryover, expired-order replay, support credit protection, rollback on activation failure, and restricted function permissions.
- Changed Python modules passed syntax checks; patch formatting passed.
- The full repository test suite and a live end-to-end payment after deployment were not completed.

A backend test workflow is included for future pull requests.
