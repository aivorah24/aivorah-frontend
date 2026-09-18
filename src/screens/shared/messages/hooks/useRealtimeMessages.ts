import { useEffect, useRef } from 'react';
import MESSAGES_SERVER_URL from '../../../../config/messagesServerUrl';

// Live message delivery over WebSocket, bypassing useMessageThread's 5s poll.
// On any 'message' event addressed to this user, `onMessage` re-fetches the
// relevant thread/list rather than splicing the payload into state directly —
// simpler and avoids duplicating the server's own shaping/formatting logic.
export function useRealtimeMessages(userEmail: string, onMessage: () => void) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    if (!userEmail) return undefined;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    const wsUrl = MESSAGES_SERVER_URL.replace(/^http/, 'ws') + '/messages/realtime';

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: 'auth', email: userEmail }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'message') onMessageRef.current();
        } catch {}
      };

      ws.onclose = () => {
        if (closedByCleanup) return;
        reconnectTimer = setTimeout(connect, 3000);
      };

      // No explicit close() here — an error is always followed by a close
      // event (per the WebSocket spec), which already triggers the reconnect.
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [userEmail]);
}
