import { renderHook, act } from '@testing-library/react-native';
import { useRealtimeMessages } from '../../hooks/useRealtimeMessages';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
  send(data: string) { this.sent.push(data); }
  close() { this.closed = true; this.onclose?.(); }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  (global as any).WebSocket = MockWebSocket;
});

test('connects to the realtime endpoint and authenticates with the user email', async () => {
  await renderHook(() => useRealtimeMessages('user@x.com', jest.fn()));

  const ws = MockWebSocket.instances[0];
  expect(ws.url).toMatch(/\/messages\/realtime$/);
  expect(ws.url.startsWith('ws')).toBe(true);

  ws.onopen?.();
  expect(ws.sent).toEqual([JSON.stringify({ type: 'auth', email: 'user@x.com' })]);
});

test('calls onMessage when a message-type payload arrives', async () => {
  const onMessage = jest.fn();
  await renderHook(() => useRealtimeMessages('user@x.com', onMessage));

  const ws = MockWebSocket.instances[0];
  ws.onmessage?.({ data: JSON.stringify({ type: 'message', message: { id: 1 } }) });

  expect(onMessage).toHaveBeenCalledTimes(1);
});

test('ignores non-message payloads', async () => {
  const onMessage = jest.fn();
  await renderHook(() => useRealtimeMessages('user@x.com', onMessage));

  const ws = MockWebSocket.instances[0];
  ws.onmessage?.({ data: JSON.stringify({ type: 'ping' }) });

  expect(onMessage).not.toHaveBeenCalled();
});

test('does not connect when userEmail is empty', async () => {
  await renderHook(() => useRealtimeMessages('', jest.fn()));
  expect(MockWebSocket.instances).toHaveLength(0);
});

test('closes the socket on unmount', async () => {
  const { unmount } = await renderHook(() => useRealtimeMessages('user@x.com', jest.fn()));
  const ws = MockWebSocket.instances[0];
  await act(async () => { unmount(); });
  expect(ws.closed).toBe(true);
});
