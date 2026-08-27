// Every /messages backend call this feature makes lives here — the single
// seam for a future aivorah-messages-service extraction (channels already
// have their own separate services/api boundary under features/channels).
import MESSAGES_SERVER_URL from '../../../../config/messagesServerUrl';

export function fetchConversations(userEmail: string, role: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/conversations?userEmail=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(role)}`);
}

export function fetchThread(userEmail: string, otherEmail: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/thread?userEmail=${encodeURIComponent(userEmail)}&otherEmail=${encodeURIComponent(otherEmail)}`);
}

export function markThreadRead(userEmail: string, otherEmail: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/read?userEmail=${encodeURIComponent(userEmail)}&otherEmail=${encodeURIComponent(otherEmail)}`, {
    method: 'PATCH',
  });
}

export function fetchContacts(userEmail: string, role: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/contacts?userEmail=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(role)}`);
}

export function editMessage(messageId: string, senderEmail: string, content: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderEmail, content }),
  });
}

export function deleteMessageApi(messageId: string, senderEmail: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderEmail }),
  });
}

export function reactToMessage(messageId: string, userEmail: string, emoji: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/${messageId}/react`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail, emoji }),
  });
}

export interface SendMessagePayload {
  senderEmail: string;
  senderName: string;
  senderRole: string;
  recipientEmail: string;
  recipientName?: string;
  content: string;
  replyToId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentType?: string;
}

export function sendMessageApi(payload: SendMessagePayload): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function triggerAivorahReply(parentEmail: string, parentName: string, message: string, role: string): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/aivorah-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentEmail, parentName, message, role }),
  });
}

export function uploadAttachment(formData: FormData): Promise<Response> {
  return fetch(`${MESSAGES_SERVER_URL}/messages/upload`, { method: 'POST', body: formData });
}
