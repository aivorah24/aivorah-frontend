import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useStudentData } from '../../../context/StudentDataContext';

import { useSuggestions } from './hooks/useSuggestions';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useVoiceInput } from './hooks/useVoiceInput';
import { useAICoachChat } from './hooks/useAICoachChat';

import WelcomeSection from './components/WelcomeSection';
import MessageList from './components/MessageList';
import FeedbackStrip from './components/FeedbackStrip';
import InputBar from './components/InputBar';
import ImageZoomModal from './components/ImageZoomModal';
import ClearChatModal from './components/ClearChatModal';

export default function AICoachScreen({ navigation }: any) {
  const { user } = useAuth();
  const { exploreTopic } = useStudentData();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const userGrade = user?.grade || 'Grade 3';
  const userCurriculum = user?.curriculum || 'IB PYP';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const suggestions = useSuggestions(userGrade, userCurriculum);
  const { speakingId, position: readPosition, speakMessage } = useTextToSpeech();

  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption: string } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToEnd = (animated: boolean) => scrollRef.current?.scrollToEnd({ animated });

  const {
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
  } = useAICoachChat({
    firstName,
    userGrade,
    userCurriculum,
    userEmail: user?.email,
    userRole: user?.role,
    exploreTopic,
    onScrollToEnd: scrollToEnd,
  });

  const { isListening, toggleVoice } = useVoiceInput(setInput);

  return (
    <ScreenLayout>
    <View style={styles.screenWrap}>
    <View style={styles.screen}>
      <Header
        title="AI Coach"
        subtitle={`Powered by Aivorah · ${userCurriculum}`}
        searchPlaceholder="Search conversations..."
        onMenuPress={() => navigation.openDrawer()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 1 && (
            <WelcomeSection
              userGrade={userGrade}
              suggestions={suggestions}
              onSuggestionPress={(s) => sendMessage(s)}
              styles={styles}
              colors={colors}
            />
          )}

          <MessageList
            messages={messages}
            streamingMsgId={streamingMsgId}
            isTyping={isTyping}
            speakingId={speakingId}
            readPosition={readPosition}
            onSpeak={speakMessage}
            failedImages={failedImages}
            onImageFail={(url) => setFailedImages(prev => new Set(prev).add(url))}
            onZoomImage={setZoomedImage}
            styles={styles}
            colors={colors}
          />

        </ScrollView>

        {showFeedback && (
          <FeedbackStrip
            feedbackAnim={feedbackAnim}
            onSubmit={submitFeedback}
            onDismiss={dismissFeedback}
            styles={styles}
            colors={colors}
          />
        )}

        <InputBar
          inputRef={inputRef}
          input={input}
          setInput={setInput}
          isListening={isListening}
          isTyping={isTyping}
          showClear={messages.length > 1}
          onSend={() => sendMessage()}
          onClear={clearChat}
          onToggleVoice={toggleVoice}
          styles={styles}
          colors={colors}
        />
      </KeyboardAvoidingView>
    </View>

    {zoomedImage && (
      <ImageZoomModal zoomedImage={zoomedImage} onClose={() => setZoomedImage(null)} />
    )}

    <ClearChatModal
      visible={showClearConfirm}
      onCancel={cancelClearChat}
      onConfirm={confirmClearChat}
      colors={colors}
      styles={styles}
    />

    </View>{/* screenWrap */}
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screenWrap: { flex: 1, backgroundColor: c.bgDark },
  screen: { flex: 1, backgroundColor: c.bgDark },
  keyboardView: { flex: 1 },

  messagesScroll: { flex: 1 },
  messagesContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    ...(Platform.OS === 'web' ? { maxWidth: 760, alignSelf: 'center', width: '100%' } as any : {}),
  },

  // ── Welcome / suggestions — centered like ChatGPT ──
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.xl,
  },
  welcomeIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.accentYellow + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: c.accentYellow + '30',
  },
  welcomeTitle: {
    fontSize: 22, fontWeight: '700', color: c.textMain, marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14, color: c.textMuted, marginBottom: 28,
  },
  suggestionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    justifyContent: 'center', maxWidth: 600,
  },
  suggestionCard: {
    width: 170, minHeight: 72,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
    borderColor: c.borderColor + '60',
    backgroundColor: c.cardDark,
    justifyContent: 'space-between',
  },
  suggestionText: { fontSize: 13, color: c.textMuted, lineHeight: 18 },

  // ── Messages ──
  messageRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  messageRowUser: {
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  messageRowAI: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },

  aiHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  aiAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: c.accentYellow,
    alignItems: 'center', justifyContent: 'center',
  },
  aiName: {
    fontSize: 13, fontWeight: '600', color: c.textMuted,
  },

  aiBody: {
    paddingLeft: 34,
    paddingRight: spacing.md,
    maxWidth: '100%',
  },

  userBubble: {
    maxWidth: '80%',
  },
  userBubbleStyle: {
    backgroundColor: c.cardDark,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: c.borderColor + '50',
  },
  userText: {
    fontSize: 15, color: c.textMain, lineHeight: 22,
  },

  errorText: {
    fontSize: 15, color: c.accentRed, lineHeight: 22,
  },

  streamCursor: {
    width: 2, height: 18,
    backgroundColor: c.accentYellow,
    borderRadius: 1,
    marginTop: 2,
    opacity: 0.8,
  },

  // ── Action buttons (listen, copy) ──
  actionRow: {
    flexDirection: 'row', gap: 4, marginTop: 10,
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actionBtnActive: {
    backgroundColor: c.accentYellow,
    borderRadius: 8,
  },

  // ── Images ──
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  imageCard: { width: 160, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  imageThumb: { width: 160, height: 100 },
  imageCaption: { fontSize: 11, lineHeight: 15, padding: 6 },

  // ── Input bar — modern, centered ──
  inputBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: c.bgDark,
    ...(Platform.OS === 'web' ? { maxWidth: 760, alignSelf: 'center', width: '100%' } as any : {}),
  },
  inputContainer: {
    flexDirection: 'column',
    backgroundColor: c.cardDark,
    borderWidth: 1,
    borderColor: c.borderColor + '60',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 52,
  },
  input: {
    fontSize: 15,
    color: c.textMain,
    maxHeight: 120,
    paddingVertical: 2,
    lineHeight: 22,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 4,
  },
  inputActionBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  micActive: {
    backgroundColor: c.accentYellow,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: c.accentYellow,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.25, backgroundColor: c.textDim },

  // ── Session feedback strip ──
  feedbackStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: c.cardDark,
    borderTopWidth: 1, borderTopColor: c.borderColor + '60',
    gap: 10,
    ...(Platform.OS === 'web' ? { maxWidth: 760, alignSelf: 'center', width: '100%' } as any : {}),
  },
  feedbackLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600', flex: 1 },
  feedbackBtns: { flexDirection: 'row', gap: 6 },
  feedbackBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: c.bgDark,
    borderWidth: 1, borderColor: c.borderColor + '80',
    gap: 1,
  },
  feedbackBtnText: { fontSize: 18 },
  feedbackBtnNum: { fontSize: 9, color: c.textDim, fontWeight: '700' },
  feedbackSkip: { padding: 6 },

  // ── Clear Chat confirmation ──
  clearChatOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.lg,
  },
  clearChatBox: {
    width: '100%', maxWidth: 360,
    backgroundColor: c.cardDark,
    borderRadius: 18, borderWidth: 1, borderColor: c.borderColor + '60',
    padding: 22, alignItems: 'center',
  },
  clearChatIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.accentRed + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  clearChatTitle: { fontSize: 17, fontWeight: '700', color: c.textMain, marginBottom: 6 },
  clearChatBody: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginBottom: 20 },
  clearChatConfirmBtn: {
    width: '100%', paddingVertical: 12, borderRadius: 12,
    backgroundColor: c.accentRed, alignItems: 'center', marginBottom: 10,
  },
  clearChatConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  clearChatCancelBtn: { width: '100%', paddingVertical: 10, alignItems: 'center' },
  clearChatCancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
});
