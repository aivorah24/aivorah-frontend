// Unit tests for messagesService.ts — mocks global.fetch, verifies request
// shape/URL/method/body. This is the single seam for a future
// aivorah-messages-service extraction (mirrors scheduleService.test.ts's
// pattern) — catches URL-wiring regressions early.
import {
  fetchConversations, fetchThread, markThreadRead, fetchContacts,
  editMessage, deleteMessageApi, reactToMessage, sendMessageApi,
  triggerAivorahReply, uploadAttachment,
} from '../../services/messagesService';
import MESSAGES_SERVER_URL from '../../../../../config/messagesServerUrl';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('fetchConversations', () => {
  test('builds the URL with encoded email and role', async () => {
    await fetchConversations('teacher@aivorah.test', 'teacher');
    expect(global.fetch).toHaveBeenCalledWith(
      `${MESSAGES_SERVER_URL}/messages/conversations?userEmail=teacher%40aivorah.test&role=teacher`
    );
  });
});

describe('fetchThread', () => {
  test('builds the URL with both encoded emails', async () => {
    await fetchThread('me@x.com', 'them@x.com');
    expect(global.fetch).toHaveBeenCalledWith(
      `${MESSAGES_SERVER_URL}/messages/thread?userEmail=me%40x.com&otherEmail=them%40x.com`
    );
  });
});

describe('markThreadRead', () => {
  test('PATCHes the read endpoint with both emails', async () => {
    await markThreadRead('me@x.com', 'them@x.com');
    expect(global.fetch).toHaveBeenCalledWith(
      `${MESSAGES_SERVER_URL}/messages/read?userEmail=me%40x.com&otherEmail=them%40x.com`,
      { method: 'PATCH' }
    );
  });
});

describe('fetchContacts', () => {
  test('builds the URL with encoded email and role', async () => {
    await fetchContacts('parent@x.com', 'parent');
    expect(global.fetch).toHaveBeenCalledWith(
      `${MESSAGES_SERVER_URL}/messages/contacts?userEmail=parent%40x.com&role=parent`
    );
  });
});

describe('editMessage', () => {
  test('PATCHes the message id with sender + new content', async () => {
    await editMessage('m1', 'me@x.com', 'updated text');
    expect(global.fetch).toHaveBeenCalledWith(`${MESSAGES_SERVER_URL}/messages/m1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderEmail: 'me@x.com', content: 'updated text' }),
    });
  });
});

describe('deleteMessageApi', () => {
  test('DELETEs the message id with sender in the body', async () => {
    await deleteMessageApi('m1', 'me@x.com');
    expect(global.fetch).toHaveBeenCalledWith(`${MESSAGES_SERVER_URL}/messages/m1`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderEmail: 'me@x.com' }),
    });
  });
});

describe('reactToMessage', () => {
  test('POSTs the emoji reaction', async () => {
    await reactToMessage('m1', 'me@x.com', '👍');
    expect(global.fetch).toHaveBeenCalledWith(`${MESSAGES_SERVER_URL}/messages/m1/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: 'me@x.com', emoji: '👍' }),
    });
  });
});

describe('sendMessageApi', () => {
  test('POSTs the full payload as-is', async () => {
    const payload = {
      senderEmail: 'me@x.com', senderName: 'Me', senderRole: 'teacher',
      recipientEmail: 'them@x.com', content: 'hi',
    };
    await sendMessageApi(payload);
    expect(global.fetch).toHaveBeenCalledWith(`${MESSAGES_SERVER_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });
});

describe('triggerAivorahReply', () => {
  test('POSTs parent/message/role for an AI reply', async () => {
    await triggerAivorahReply('parent@x.com', 'Jane', 'help please', 'parent');
    expect(global.fetch).toHaveBeenCalledWith(`${MESSAGES_SERVER_URL}/messages/aivorah-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentEmail: 'parent@x.com', parentName: 'Jane', message: 'help please', role: 'parent' }),
    });
  });
});

describe('uploadAttachment', () => {
  test('POSTs the FormData as-is with no Content-Type override', async () => {
    const fd = new FormData();
    await uploadAttachment(fd);
    expect(global.fetch).toHaveBeenCalledWith(`${MESSAGES_SERVER_URL}/messages/upload`, {
      method: 'POST',
      body: fd,
    });
  });
});
