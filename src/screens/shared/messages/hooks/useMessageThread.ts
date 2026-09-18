import { useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import type { FlatList } from 'react-native';
import type { Attachment, Contact, ContextMenuState, Conversation, Message } from '../types';
import type { Channel } from '../../../../features/channels/api/channelsApi';
import { markChannelRead, sendChannelMessage } from '../../../../features/channels/api/channelsApi';
import {
  fetchThread, markThreadRead, editMessage, deleteMessageApi, reactToMessage,
  sendMessageApi, triggerAivorahReply, uploadAttachment,
} from '../services/messagesService';
import { isAivorah, parseContent } from '../utils/messageFormat';
import { useRealtimeMessages } from './useRealtimeMessages';

interface Args {
  userEmail: string;
  userName: string;
  userRole: string;
  isFocused: boolean;
  refreshNotifications: () => Promise<void>;
  loadConversations: () => Promise<void>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  loadChannels: () => Promise<void>;
}

// Owns the open thread — active convo/channel (mutual exclusion), messages,
// polling, send/edit/delete/react/reply/forward, attachment upload, and the
// message-level UI state (context menu, emoji picker, focused/copied ids).
// Kept as one hook rather than split further: nearly every action here reads
// or mutates several of these pieces of state together (e.g. sendMessage
// touches inputText, replyTo, attachment, AND triggers an Aivorah reply), so
// splitting them apart would just move the coupling into extra hook-to-hook
// wiring without actually decoupling anything.
export function useMessageThread({
  userEmail, userName, userRole, isFocused, refreshNotifications,
  loadConversations, setConversations, setChannels, loadChannels,
}: Args) {
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');

  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<any>(null);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [focusedMsgId, setFocusedMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);

  const loadThread = async (otherEmail: string, markRead = false) => {
    try {
      const res = await fetchThread(userEmail, otherEmail);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
      if (markRead) {
        const markReadRes = await markThreadRead(userEmail, otherEmail);
        if (!markReadRes.ok) {
          const errText = await markReadRes.text().catch(() => '');
          console.error(`[MessagesScreen] Failed to mark conversation read (${markReadRes.status}):`, errText);
        } else {
          await refreshNotifications();
        }
        loadConversations();
      }
    } catch (err) {
      console.error('[MessagesScreen] Failed to load conversation thread:', err);
    }
    finally { setLoadingThread(false); }
  };

  // Only auto-mark the open conversation read while the Messages screen is the
  // FOCUSED route. Without this, the screen stays mounted after navigating away
  // (React Navigation keeps tab/drawer screens alive) and its loop silently marks
  // new messages "seen" in the background — so the bell never notifies. We also
  // require the browser tab to be visible+focused (web), so a background tab won't
  // mark messages read either.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (activeConvo && isFocused) {
      pollRef.current = setInterval(() => {
        const tabActive = Platform.OS !== 'web'
          || (typeof document !== 'undefined' && document.visibilityState === 'visible'
              && (typeof document.hasFocus !== 'function' || document.hasFocus()));
        loadThread(activeConvo.otherEmail, tabActive);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConvo, isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live delivery: on any incoming message, immediately refresh the open
  // thread (if any) and the conversation list, instead of waiting up to 5s
  // for the next poll tick. The 5s poll above stays as a fallback for when
  // the socket is reconnecting.
  const activeConvoRef = useRef(activeConvo);
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);
  useRealtimeMessages(userEmail, () => {
    if (activeConvoRef.current && isFocused) loadThread(activeConvoRef.current.otherEmail);
    loadConversations();
  });

  const openConversation = (convo: Conversation) => {
    setActiveChannel(null); // parallel-path mutual exclusion
    setReplyTo(null);
    // Optimistically clear the badge on this conversation immediately
    setConversations(prev => prev.map(c =>
      c.otherEmail === convo.otherEmail ? { ...c, unreadCount: 0 } : c
    ));
    setActiveConvo(convo);
    setLoadingThread(true);
    loadThread(convo.otherEmail, true);
  };

  const openChannel = (ch: Channel) => {
    setActiveConvo(null); // parallel-path mutual exclusion
    setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, unread: 0 } : c));
    markChannelRead(userEmail, ch.id);
    setActiveChannel(ch);
  };

  const startConversation = (contact: Contact) => {
    setActiveChannel(null);
    setReplyTo(null);
    const convo: Conversation = {
      otherEmail: contact.email,
      otherName: contact.name,
      otherRole: contact.role,
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };
    setActiveConvo(convo);
    setLoadingThread(true);
    loadThread(contact.email, false);
  };

  const startEdit = (msg: Message) => {
    setEditingMsg(msg);
    setEditText(msg.content);
  };

  const saveEdit = async () => {
    if (!editingMsg || !editText.trim()) return;
    try {
      await editMessage(editingMsg.id, userEmail, editText.trim());
      setEditingMsg(null);
      setEditText('');
      if (activeConvo) loadThread(activeConvo.otherEmail);
    } catch {}
  };

  const copyMessageText = async (text: string, msgId: string) => {
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(text);
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId((v) => (v === msgId ? null : v)), 1500);
      }
    } catch {}
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    try {
      await reactToMessage(msgId, userEmail, emoji);
      if (activeConvo) await loadThread(activeConvo.otherEmail);
    } catch {}
  };

  const forwardMessage = async (target: { kind: 'convo'; email: string; name: string } | { kind: 'channel'; id: string }) => {
    if (!forwardMsg) return;
    const text = parseContent(forwardMsg.content).text || '';
    try {
      if (target.kind === 'convo') {
        await sendMessageApi({
          senderEmail: userEmail, senderName: userName, senderRole: userRole,
          recipientEmail: target.email, recipientName: target.name, content: forwardMsg.content,
        });
      } else {
        await sendChannelMessage(userEmail, target.id, text);
      }
    } catch {}
    setForwardMsg(null);
  };

  // ── File picker + upload ────────────────────────────────
  const pickFile = () => {
    if (Platform.OS !== 'web') return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
    input.style.display = 'none';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Maximum file size is 10 MB.');
        return;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadAttachment(formData);
        const data = await res.json();
        if (data.url) {
          setAttachment(data);
        } else {
          Alert.alert('Upload failed', data.error || 'Could not upload file.');
        }
      } catch {
        Alert.alert('Upload failed', 'Could not upload file. Please try again.');
      } finally {
        setUploading(false);
      }
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  };

  const removeAttachment = () => setAttachment(null);

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteMessageApi(msgId, userEmail);
      if (activeConvo) {
        await loadThread(activeConvo.otherEmail);
        await loadConversations();
      }
    } catch {}
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && !attachment) || !activeConvo || sending) return;
    setSending(true);
    const text = inputText.trim();
    const replyToId = replyTo?.id;
    setInputText('');
    setReplyTo(null);
    setShowEmoji(false);
    const att = attachment;
    setAttachment(null);
    try {
      await sendMessageApi({
        senderEmail: userEmail,
        senderName: userName,
        senderRole: userRole,
        recipientEmail: activeConvo.otherEmail,
        recipientName: activeConvo.otherName,
        content: text,
        ...(replyToId ? { replyToId } : {}),
        ...(att ? {
          attachmentUrl: att.url,
          attachmentName: att.name,
          attachmentSize: att.size,
          attachmentType: att.type,
        } : {}),
      });
      await loadThread(activeConvo.otherEmail);
      await loadConversations();

      // If chatting with Aivorah, trigger AI reply
      if (isAivorah(activeConvo) && text) {
        triggerAivorahReply(userEmail, userName, text, userRole)
          .then(() => loadThread(activeConvo.otherEmail)).catch(() => {});
      }
    } catch {}
    finally { setSending(false); }
  };

  return {
    activeConvo, setActiveConvo, activeChannel, setActiveChannel,
    messages, inputText, setInputText, loadingThread, sending,
    editingMsg, setEditingMsg, editText, setEditText,
    uploading, attachment, setAttachment, fileInputRef,
    flatListRef,
    focusedMsgId, setFocusedMsgId, contextMenu, setContextMenu,
    replyTo, setReplyTo, showEmoji, setShowEmoji, emojiCategory, setEmojiCategory,
    copiedMsgId, forwardMsg, setForwardMsg,
    loadThread, openConversation, openChannel, startConversation,
    startEdit, saveEdit, copyMessageText, toggleReaction, forwardMessage,
    pickFile, removeAttachment, deleteMessage, sendMessage,
  };
}
