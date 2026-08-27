import { useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation, ConvoFilter } from '../types';
import type { Channel } from '../../../../features/channels/api/channelsApi';
import { fetchChannels } from '../../../../features/channels/api/channelsApi';
import { fetchConversations } from '../services/messagesService';
import { isAivorah } from '../utils/messageFormat';

// Owns the conversation list (DMs) + channels (parallel path, merged into one
// unified, recency-sorted inbox) — load/refresh, filter, search. Channels stay
// 100% separate from the 1:1 messages API; if it errors, DMs still load.
export function useConversations(userEmail: string, userRole: string, activeConvoEmail: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [convoFilter, setConvoFilter] = useState<ConvoFilter>('all');
  const [convoSearch, setConvoSearch] = useState('');

  const showChannels = userRole !== 'student';
  // Always current, no stale closure — loadConversations reads this to force
  // the currently-open conversation's unread count to 0.
  const activeEmailRef = useRef<string | null>(null);
  useEffect(() => { activeEmailRef.current = activeConvoEmail; }, [activeConvoEmail]);

  const loadConversations = async () => {
    try {
      const res = await fetchConversations(userEmail, userRole);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Client-side role filter (belt-and-suspenders in case server hasn't restarted):
        // teacher sees parents + staff (colleagues, school admin); parent sees teachers
        const filtered = data.filter((c: Conversation) => {
          if (userRole === 'teacher') return ['parent', 'teacher', 'school_admin'].includes(c.otherRole);
          if (userRole === 'parent') return c.otherRole === 'teacher';
          return true;
        });
        // Always force the active conversation's unread count to 0 — we're looking at it
        setConversations(filtered.map((c: Conversation) =>
          c.otherEmail === activeEmailRef.current ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch {}
    finally { setLoadingConvos(false); }
  };

  // Channels load in parallel and never block the DM list (isolated try/catch).
  const loadChannels = async () => {
    if (!showChannels || !userEmail) return;
    try { setChannels(await fetchChannels(userEmail)); } catch {}
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount, external sync
  useEffect(() => { loadConversations(); loadChannels(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const convoSearchLower = convoSearch.trim().toLowerCase();
  const filteredConvos = conversations.filter(c => {
    // "Staff" = DMs with a teacher/school admin (colleague chat), same
    // people who show under the unified "Staff" role pill, plus staff-only
    // broadcast channels (handled separately below).
    if (convoFilter === 'staff' && !['teacher', 'school_admin'].includes(c.otherRole)) return false;
    if (convoFilter === 'unread' && c.unreadCount <= 0) return false;
    if (convoFilter === 'starred' && !isAivorah(c)) return false;
    if (convoSearchLower && !c.otherName.toLowerCase().includes(convoSearchLower)) return false;
    return true;
  });

  // ── Unified inbox — WhatsApp-style: channels and DMs share one list sorted
  // by whoever has the most recent activity, not "channels always on top". ──
  type InboxItem = { key: string; time: number } & ({ kind: 'channel'; data: Channel } | { kind: 'convo'; data: Conversation });
  const unifiedInbox: InboxItem[] = useMemo(() => {
    const items: InboxItem[] = [];
    if (showChannels && convoFilter !== 'starred') {
      let chList = channels;
      if (convoFilter === 'staff') chList = chList.filter(c => c.category === 'staff');
      else if (convoFilter === 'unread') chList = chList.filter(c => c.unread > 0);
      if (convoSearchLower) chList = chList.filter(c => c.name.toLowerCase().includes(convoSearchLower));
      for (const c of chList) {
        items.push({ kind: 'channel', data: c, key: `ch-${c.id}`, time: c.lastMessage ? new Date(c.lastMessage.at).getTime() : 0 });
      }
    }
    for (const c of filteredConvos) {
      items.push({ kind: 'convo', data: c, key: `dm-${c.otherEmail}`, time: new Date(c.lastMessageAt).getTime() });
    }
    items.sort((a, b) => b.time - a.time);
    return items;
  }, [channels, filteredConvos, convoFilter, convoSearchLower, showChannels]);

  return {
    conversations, setConversations, loadingConvos, loadConversations,
    channels, setChannels, loadChannels, showChannels,
    convoFilter, setConvoFilter, convoSearch, setConvoSearch,
    totalUnread, unifiedInbox,
  };
}
