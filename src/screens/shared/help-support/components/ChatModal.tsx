import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatMsg } from '../types';

export function ChatModal({
  colors, styles, visible, onClose, chatSuggestions, placeholder,
  chatMsgs, chatLoading, chatInput, setChatInput, chatScrollRef, sendSupportMessage,
}: {
  colors: any; styles: any; visible: boolean; onClose: () => void; chatSuggestions: string[]; placeholder: string;
  chatMsgs: ChatMsg[]; chatLoading: boolean; chatInput: string; setChatInput: (v: string) => void;
  chatScrollRef: React.RefObject<ScrollView | null>; sendSupportMessage: (text?: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.chatOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.chatBox, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderLeft}>
              <View style={[styles.chatAiOrb, { backgroundColor: colors.accentYellow + '18' }]}>
                <Feather name="zap" size={16} color={colors.accentYellow} />
              </View>
              <View>
                <Text style={[styles.chatTitle, { color: colors.textMain }]}>Aivorah 24/7</Text>
                <Text style={[styles.chatSubtitle, { color: colors.accentGreen }]}>Support Assistant · Online</Text>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close chat" onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView ref={chatScrollRef} style={styles.chatMsgs} contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>
            {chatMsgs.map((m) => (
              <View key={m.id} style={[styles.chatBubble, m.role === 'user'
                ? [styles.chatBubbleUser, { backgroundColor: colors.accentYellow }]
                : [styles.chatBubbleAi, { backgroundColor: colors.bgDark, borderColor: colors.borderColor }]]}>
                <Text style={[styles.chatBubbleTxt, { color: m.role === 'user' ? '#fff' : colors.textMain }]}>{m.text}</Text>
              </View>
            ))}
            {chatLoading && (
              <View style={[styles.chatBubble, styles.chatBubbleAi, { backgroundColor: colors.bgDark, borderColor: colors.borderColor }]}>
                <ActivityIndicator size="small" color={colors.accentYellow} />
              </View>
            )}
          </ScrollView>
          {chatMsgs.length <= 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chatSuggestScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 8 }}>
              {chatSuggestions.map((s) => (
                <TouchableOpacity key={s} accessibilityRole="button" style={[styles.chatSuggestChip, { backgroundColor: colors.accentYellow + '18', borderColor: colors.accentYellow + '40' }]} onPress={() => sendSupportMessage(s)} activeOpacity={0.7}>
                  <Text style={[styles.chatSuggestTxt, { color: colors.accentYellow }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={[styles.chatInputRow, { borderTopColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
            <TextInput
              style={[styles.chatTextInput, { color: colors.textMain }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textDim}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => sendSupportMessage()}
              returnKeyType="send"
              editable={!chatLoading}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[styles.chatSendBtn, { backgroundColor: chatInput.trim() ? colors.accentYellow : colors.borderColor }]}
              onPress={() => sendSupportMessage()}
              disabled={!chatInput.trim() || chatLoading}
              activeOpacity={0.8}
            >
              <Feather name="send" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
