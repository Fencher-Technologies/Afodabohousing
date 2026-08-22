// Maps raw Postgres / Supabase error messages to clean, user-safe text.
// Prevents internal constraint details from leaking into the UI.
export function cleanDbError(err: unknown): string {
  const raw =
    (err as any)?.message ||
    (err as any)?.error_description ||
    (err as any)?.details ||
    'Something went wrong. Please try again.';
  const msg: string = String(raw);

  const notNull = msg.match(/column "([^"]+)"/);
  if (/violates not-null constraint|null value in column/.test(msg)) {
    return notNull
      ? `Missing required value: "${notNull[1]}". Please complete all fields.`
      : 'A required field is missing. Please complete all fields.';
  }
  if (/duplicate key/.test(msg)) return 'This record already exists.';
  if (/foreign key constraint/.test(msg)) return 'A related record could not be found.';
  if (/violates check constraint/.test(msg)) return 'One of the values provided is invalid.';
  if (/does not exist/.test(msg)) return 'A required field is missing from the request.';
  if (/permission denied|row-level security/.test(msg)) {
    return 'You do not have permission to perform this action.';
  }
  return 'Could not save your changes. Please check the form and try again.';
}
