import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import type { ChatMsg } from '../types';
import { sendChatMessage } from '../services/helpSupportService';

export function useSupportChat(firstName: string, greeting: string) {
  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { id: 0, role: 'ai', text: greeting },
  ]);
  const chatScrollRef = useRef<ScrollView>(null);

  async function sendSupportMessage(text?: string) {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMsgs((prev) => [...prev, { id: Date.now(), role: 'user', text: msg }]);
    setChatLoading(true);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const reply = await sendChatMessage(msg, firstName);
      setChatMsgs((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: reply }]);
    } catch {
      setChatMsgs((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Could not reach support. Please try again.' }]);
    }
    setChatLoading(false);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return { chatVisible, setChatVisible, chatInput, setChatInput, chatLoading, chatMsgs, chatScrollRef, sendSupportMessage };
}
