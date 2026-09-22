/**
 * Ask the browser's password manager (Google Password Manager, etc.) to save
 * the email and password after a successful sign-in or sign-up.
 *
 * In a single-page app the browser often misses the moment a login succeeds,
 * because the page never reloads, so it never offers to save the password and
 * cannot autofill it next time. The Credential Management API tells it
 * directly. Supported in Chrome/Edge/Android; a silent no-op elsewhere, where
 * the autocomplete attributes on the form still do the work.
 */
export async function savePasswordCredential(email: string, password: string, name?: string) {
  try {
    const w = window as unknown as { PasswordCredential?: new (data: object) => Credential };
    if (!w.PasswordCredential || !navigator.credentials?.store || !email || !password) return;
    const cred = new w.PasswordCredential({ id: email, password, name: name || email });
    await navigator.credentials.store(cred);
  } catch {
    // Never block sign-in over this.
  }
}
