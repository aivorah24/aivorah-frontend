import HELP_SERVICE_URL from '../../../../config/helpServiceUrl';

// Moved off the monolith (SERVER_URL) onto aivorah-help-center-service,
// which already implements these exact two routes with no Supabase
// dependency (pure LLM + email, stateless) - part of removing the last
// monolith calls from the Parent persona's screens.

export async function sendChatMessage(message: string, userName: string): Promise<string> {
  const res = await fetch(`${HELP_SERVICE_URL}/help/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userName }),
  });
  const data = await res.json();
  return data.reply || 'Something went wrong.';
}

export async function submitTicket(email: string, subject: string, message: string): Promise<void> {
  const res = await fetch(`${HELP_SERVICE_URL}/help/ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, subject, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Could not submit ticket.');
}
