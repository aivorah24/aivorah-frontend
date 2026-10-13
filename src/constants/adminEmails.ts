// Client-side mirror of the same allowlist the backend services check
// (aivorah-platform-admin-service/middleware/auth.js,
// ai-mentor/server/routes/admin.js getAllowedAdminEmails). Used only to
// decide which navigator to mount — every actual data request is still
// re-checked server-side against its own copy of this list, so this being
// out of sync would at worst show/hide the Admin persona's shell, never
// grant real access to data.
// Only the dedicated admin account opens the console; personal accounts keep their normal role.
export const ADMIN_EMAILS = new Set(['admin@aivorah.ai']);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase().trim());
}
