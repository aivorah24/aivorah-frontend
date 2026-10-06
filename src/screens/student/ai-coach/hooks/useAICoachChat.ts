import { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { askAIMentorStream, type ChatHistoryTurn } from '../../../../services/aiMentorApi';
import SERVER_URL from '../../../../config/aiCoachServerUrl';
import type { Message } from '../types';

interface UseAICoachChatParams {
  firstName: string;
  userGrade: string;
  userCurriculum: string;
  userEmail: string | undefined;
  userRole: string | undefined;
  exploreTopic: () => void;
  onScrollToEnd: (animated: boolean) => void;
}

export function useAICoachChat({
  firstName,
  userGrade,
  userCurriculum,
  userEmail,
  userRole,
  exploreTopic,
  onScrollToEnd,
}: UseAICoachChatParams) {
  const INITIAL_MESSAGES: Message[] = [
    {
      id: 1,
      role: 'ai',
      text: `Hi ${firstName}! I'm your Aivorah AI Coach for ${userCurriculum}. I can help you with ${userGrade} topics. Ask me anything from your curriculum!`,
    },
  ];

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackAnim] = useState(new Animated.Value(0));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const aiResponseCount = useRef(0);

  async function sendMessage(text?: string) {
    const msgText = (text ?? input).trim();
    if (!msgText || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: msgText };
    const aiMsgId = Date.now() + 1;

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setStreamingMsgId(aiMsgId);
    setTimeout(() => onScrollToEnd(true), 80);

    const history: ChatHistoryTurn[] = messages
      .slice(-8)
      .map(m => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, text: m.text }));

    // Add placeholder AI message for streaming
    const aiPlaceholder: Message = { id: aiMsgId, role: 'ai', text: '' };
    setMessages(prev => [...prev, aiPlaceholder]);

    const { answer, images: answerImages, error } = await askAIMentorStream(
      msgText,
      userGrade,
      undefined,
      userCurriculum,
      undefined,
      userEmail,
      userRole,
      history,
      (token: string) => {
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + token } : m)
        );
        onScrollToEnd(false);
      }
    );

    if (!error) exploreTopic();

    setMessages(prev =>
      prev.map(m => m.id === aiMsgId ? {
        ...m,
        text: error ? error : (answer || m.text),
        isError: !!error,
        images: !error && answerImages && answerImages.length > 0 ? answerImages : undefined,
      } : m)
    );
    setIsTyping(false);
    setStreamingMsgId(null);
    setTimeout(() => onScrollToEnd(true), 100);

    // Show feedback strip after 3rd AI response (once per session)
    if (!error && !feedbackDone) {
      aiResponseCount.current += 1;
      if (aiResponseCount.current === 3) {
        setTimeout(() => {
          setShowFeedback(true);
          Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }, 800);
      }
    }
  }

  function submitFeedback(rating: number) {
    setFeedbackDone(true);
    Animated.timing(feedbackAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setShowFeedback(false));
    fetch(`${SERVER_URL}/ask/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: userEmail,
        rating,
        grade: userGrade,
        messageCount: aiResponseCount.current,
      }),
    }).catch(() => {});
  }

  function dismissFeedback() {
    setFeedbackDone(true);
    Animated.timing(feedbackAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setShowFeedback(false));
  }

  // Alert.alert is a documented no-op on React Native Web - the confirmation
  // never appeared and Clear Chat silently did nothing there. Route through
  // real state + a modal (rendered by the screen) instead, so it works on
  // every platform, not just native.
  function clearChat() {
    setShowClearConfirm(true);
  }

  function cancelClearChat() {
    setShowClearConfirm(false);
  }

  function confirmClearChat() {
    setMessages(INITIAL_MESSAGES);
    aiResponseCount.current = 0;
    setFeedbackDone(false);
    setShowFeedback(false);
    feedbackAnim.setValue(0);
    setShowClearConfirm(false);
  }

  return {
    messages,
    input,
    setInput,
    isTyping,
    streamingMsgId,
    showFeedback,
    feedbackAnim,
    sendMessage,
    submitFeedback,
    dismissFeedback,
    clearChat,
    showClearConfirm,
    cancelClearChat,
    confirmClearChat,
  };
}
