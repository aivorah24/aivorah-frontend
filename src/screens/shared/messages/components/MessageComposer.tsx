import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Attachment, Conversation, Message } from '../types';
import { fileIcon, formatFileSize, parseContent } from '../utils/messageFormat';

interface Props {
  activeConvo: Conversation;
  colors: AppColors;
  styles: any;
  userRole: string;
  userEmail: string;
  replyTo: Message | null;
  setReplyTo: (m: Message | null) => void;
  attachment: Attachment | null;
  removeAttachment: () => void;
  uploading: boolean;
  sending: boolean;
  pickFile: () => void;
  showEmoji: boolean;
  setShowEmoji: (v: boolean | ((prev: boolean) => boolean)) => void;
  inputText: string;
  setInputText: (v: string) => void;
  sendMessage: () => void;
}

export default function MessageComposer({
  activeConvo, colors, styles, userRole, userEmail, replyTo, setReplyTo, attachment, removeAttachment,
  uploading, sending, pickFile, showEmoji, setShowEmoji, inputText, setInputText, sendMessage,
}: Props) {
  if (userRole === 'student') {
    return (
      <View style={{ padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderColor }}>
        <Text style={{ fontSize: 12, color: colors.textDim }}>Messages from your teacher or parent appear here.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Reply preview — quoting the message being replied to */}
      {replyTo && (
        <View style={styles.replyPreviewRow}>
          <Feather name="corner-up-left" size={14} color={colors.accentYellow} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyPreviewName}>{replyTo.sender_email === userEmail ? 'You' : replyTo.sender_name}</Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>{parseContent(replyTo.content).text || 'Attachment'}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7}>
            <Feather name="x" size={16} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      )}

      {/* Attachment preview */}
      {attachment && (
        <View style={styles.attachPreviewRow}>
          <Feather name={fileIcon(attachment.type) as any} size={16} color={colors.accentYellow} />
          <Text style={styles.attachPreviewName} numberOfLines={1}>{attachment.name}</Text>
          <Text style={styles.attachPreviewSize}>{formatFileSize(attachment.size)}</Text>
          <TouchableOpacity onPress={removeAttachment} activeOpacity={0.7}>
            <Feather name="x" size={16} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            testID="messages-attach-button"
            style={styles.attachBtn}
            onPress={pickFile}
            disabled={uploading || sending}
            activeOpacity={0.7}
          >
            {uploading
              ? <ActivityIndicator size="small" color={colors.accentYellow} />
              : <Feather name="paperclip" size={18} color={colors.accentYellow} />
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowEmoji((v) => !v)}
          {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation?.() } : {})}
          activeOpacity={0.7}
        >
          <Feather name="smile" size={18} color={colors.accentYellow} />
        </TouchableOpacity>
        <TextInput
          testID="messages-input"
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={`Message ${activeConvo.otherName}...`}
          placeholderTextColor={colors.textDim}
          multiline
          maxLength={1000}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              if (inputText.trim() || attachment) sendMessage();
            }
          }}
        />
        <TouchableOpacity
          testID="messages-send-button"
          style={[styles.sendBtn, (!inputText.trim() && !attachment || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={(!inputText.trim() && !attachment) || sending}
          activeOpacity={0.7}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Feather name="send" size={16} color="white" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
