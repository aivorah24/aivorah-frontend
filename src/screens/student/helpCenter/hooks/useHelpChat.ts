import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import HELP_SERVICE_URL from '../../../../config/helpServiceUrl';
import type { ChatMsg } from '../types';

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function useHelpChat(firstName: string) {
  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { id: 0, role: 'ai', text: `Hi! I'm your Aivorah 24/7 Support Assistant. Ask me anything about how the platform works — XP, streaks, badges, learning paths, and more!`, time: nowTime() },
  ]);
  const chatScrollRef = useRef<ScrollView>(null);

  async function sendSupportMessage(text?: string) {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const userMsg: ChatMsg = { id: Date.now(), role: 'user', text: msg, time: nowTime() };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatLoading(true);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const res = await fetch(`${HELP_SERVICE_URL}/help/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, userName: firstName }),
      });
      const data = await res.json();
      const aiMsg: ChatMsg = { id: Date.now() + 1, role: 'ai', text: data.reply || data.error || 'Something went wrong.', time: nowTime() };
      setChatMsgs(prev => [...prev, aiMsg]);
    } catch {
      setChatMsgs(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Could not reach support. Please try again.', time: nowTime() }]);
    }
    setChatLoading(false);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return {
    chatVisible, setChatVisible,
    chatInput, setChatInput,
    chatLoading,
    chatMsgs,
    chatScrollRef,
    sendSupportMessage,
  };
}
