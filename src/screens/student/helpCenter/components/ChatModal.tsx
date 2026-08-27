import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { ChatMsg } from '../types';
import { CHAT_SUGGESTIONS } from '../constants';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  isDark: boolean;
  chatMsgs: ChatMsg[];
  chatLoading: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  sendSupportMessage: (text?: string) => void;
  chatScrollRef: React.RefObject<ScrollView | null>;
}

export default function ChatModal({
  visible, onClose, colors, isDark, chatMsgs, chatLoading, chatInput, setChatInput, sendSupportMessage, chatScrollRef,
}: ChatModalProps) {
  const styles = makeStyles(colors, isDark);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.chatOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.chatBox, { backgroundColor: isDark ? '#0B0B0B' : '#F5F3EE', borderColor: colors.borderColor }]}>

          <View style={[styles.chatHeader, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.chatHeaderLeft}>
              <View style={styles.chatAvatar}>
                <Feather name="zap" size={16} color={colors.accentYellow} />
                <View style={styles.onlineDot} />
              </View>
              <View>
                <Text style={[styles.chatTitle, { color: colors.textMain }]}>Aivorah 24/7</Text>
                <Text style={[styles.chatSubtitle, { color: colors.accentYellow }]}>Your AI support assistant</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.chatCloseBtn} accessibilityRole="button" accessibilityLabel="Close chat">
              <Feather name="x" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView ref={chatScrollRef} testID="chat-messages" style={styles.chatMsgs} contentContainerStyle={styles.chatMsgsContent} showsVerticalScrollIndicator={false}>
            {chatMsgs.map((m, idx) => {
              const isFirst = idx === 0 && m.role === 'ai';
              if (isFirst) {
                return (
                  <View key={m.id} style={styles.firstMsgWrap}>
                    <View style={styles.mascotWrap}>
                      <View style={styles.mascotCircle}>
                        <Feather name="zap" size={36} color={colors.accentYellow} />
                      </View>
                    </View>
                    <View style={[styles.firstMsgBubble, { backgroundColor: isDark ? '#141414' : '#fff', borderColor: colors.borderColor }]}>
                      <Text style={[styles.firstMsgTitle, { color: colors.textMain }]}>Hi! I&apos;m your Aivorah 24/7{'\n'}Support Assistant.</Text>
                      <Text style={[styles.firstMsgBody, { color: colors.textMuted }]}>{m.text.replace("Hi! I'm your Aivorah 24/7 Support Assistant. ", '')}</Text>
                    </View>
                  </View>
                );
              }
              return (
                <View key={m.id} style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}>
                  {m.role === 'ai' && (
                    <View style={styles.msgAvatar}>
                      <Feather name="zap" size={10} color="#fff" />
                    </View>
                  )}
                  <View style={{ maxWidth: '72%' }}>
                    <View style={[
                      styles.msgBubble,
                      m.role === 'user'
                        ? [styles.msgBubbleUser, { backgroundColor: colors.accentYellow }]
                        : [styles.msgBubbleAi, { backgroundColor: isDark ? '#141414' : '#fff', borderColor: colors.borderColor }],
                    ]}>
                      <Text style={[styles.msgText, { color: m.role === 'user' ? '#fff' : colors.textMain }]}>{m.text}</Text>
                    </View>
                    <Text style={[styles.msgTime, { color: colors.textDim, textAlign: m.role === 'user' ? 'right' : 'left' }]}>{m.time}</Text>
                  </View>
                </View>
              );
            })}
            {chatLoading && (
              <View style={[styles.msgRow, styles.msgRowAi]}>
                <View style={styles.msgAvatar}>
                  <Feather name="zap" size={10} color={colors.accentYellow} />
                </View>
                <View style={[styles.msgBubble, styles.msgBubbleAi, { backgroundColor: isDark ? '#141414' : '#fff', borderColor: colors.borderColor }]}>
                  <ActivityIndicator size="small" color={colors.accentYellow} />
                </View>
              </View>
            )}
          </ScrollView>

          <ScrollView horizontal testID="chat-suggestions" showsHorizontalScrollIndicator={false} style={styles.suggestScroll} contentContainerStyle={styles.suggestContent}>
            {CHAT_SUGGESTIONS.map(s => (
              <TouchableOpacity key={s} testID={`chat-suggestion-${s}`} style={styles.suggestChip} onPress={() => sendSupportMessage(s)} activeOpacity={0.7} disabled={chatLoading}>
                <Feather name="zap" size={11} color={colors.accentYellow} />
                <Text style={[styles.suggestChipText, { color: colors.textMain }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.chatInputRow, { borderTopColor: colors.borderColor, backgroundColor: isDark ? '#0B0B0B' : '#F5F3EE' }]}>
            <Feather name="star" size={16} color={colors.accentYellow} style={{ marginHorizontal: 4 }} />
            <TextInput
              style={[styles.chatTextInput, { color: colors.textMain, backgroundColor: isDark ? '#141414' : '#fff', borderColor: colors.borderColor }]}
              placeholder="Ask about XP, streaks, badges..."
              placeholderTextColor={colors.textDim}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => sendSupportMessage()}
              returnKeyType="send"
              editable={!chatLoading}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, { backgroundColor: chatInput.trim() ? colors.accentYellow : colors.borderColor }]}
              onPress={() => sendSupportMessage()}
              disabled={!chatInput.trim() || chatLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Feather name="send" size={15} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: AppColors, isDark: boolean) => StyleSheet.create({
  chatOverlay: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: Platform.OS === 'web' ? 24 : 0,
  },
  chatBox: {
    borderRadius: Platform.OS === 'web' ? 20 : undefined,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: Platform.OS === 'web' ? 1 : 0,
    maxHeight: Platform.OS === 'web' ? 620 : ('82%' as any),
    minHeight: 440,
    ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 560 } as any : {}),
    overflow: 'hidden',
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: isDark ? '#1E1E1E' : '#2A2A2A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.accentYellow + '50' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: c.accentYellow, borderWidth: 2, borderColor: isDark ? '#0B0B0B' : '#F5F3EE' },
  chatTitle: { fontSize: 15, fontWeight: '800', fontFamily: fonts.serif },
  chatSubtitle: { fontSize: 11, marginTop: 1 },
  chatCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
  chatMsgs: { flex: 1 },
  chatMsgsContent: { padding: 16, gap: 12 },
  firstMsgWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 4 },
  mascotWrap: { flexShrink: 0 },
  mascotCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? '#1E1E1E' : '#2A2A2A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.accentYellow + '40' },
  firstMsgBubble: { flex: 1, borderRadius: 16, borderTopLeftRadius: 4, padding: 14, borderWidth: 1, gap: 6 },
  firstMsgTitle: { fontSize: 14, fontWeight: '800', lineHeight: 21, fontFamily: fonts.serif },
  firstMsgBody: { fontSize: 13, lineHeight: 19 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  msgAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: isDark ? '#1E1E1E' : '#2A2A2A', borderWidth: 1, borderColor: c.accentYellow + '40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgBubble: { borderRadius: 16, padding: 11, paddingHorizontal: 14, borderWidth: 1 },
  msgBubbleUser: { borderTopRightRadius: 4, borderColor: 'transparent' },
  msgBubbleAi: { borderTopLeftRadius: 4 },
  msgText: { fontSize: 13, lineHeight: 20 },
  msgTime: { fontSize: 10, color: c.textDim, marginTop: 3, paddingHorizontal: 2 },
  suggestScroll: { maxHeight: 48, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
  suggestContent: { gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.accentYellow + '40', backgroundColor: c.accentYellow + '0D' },
  suggestChipText: { fontSize: 12, fontWeight: '600', color: c.textMain },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1 },
  chatTextInput: { flex: 1, fontSize: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, maxHeight: 80 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
