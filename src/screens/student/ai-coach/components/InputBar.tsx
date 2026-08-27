import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  inputRef: React.RefObject<TextInput | null>;
  input: string;
  setInput: (v: string) => void;
  isListening: boolean;
  isTyping: boolean;
  showClear: boolean;
  onSend: () => void;
  onClear: () => void;
  onToggleVoice: () => void;
  styles: any;
  colors: AppColors;
}

export default function InputBar({
  inputRef,
  input,
  setInput,
  isListening,
  isTyping,
  showClear,
  onSend,
  onClear,
  onToggleVoice,
  styles,
  colors,
}: Props) {
  return (
    <View style={styles.inputBar}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={isListening ? 'Listening...' : 'Message Aivorah...'}
          placeholderTextColor={isListening ? colors.accentYellow : colors.textDim}
          accessibilityLabel="Message Aivorah"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={onSend}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              onSend();
            }
          }}
          blurOnSubmit={false}
          editable={!isTyping}
        />
        <View style={styles.inputActions}>
          {showClear && (
            <TouchableOpacity
              style={styles.inputActionBtn}
              onPress={onClear}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Clear chat"
            >
              <Feather name="trash-2" size={16} color={colors.textDim} />
            </TouchableOpacity>
          )}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.inputActionBtn, isListening && styles.micActive]}
              onPress={onToggleVoice}
              disabled={isTyping}
              activeOpacity={0.8}
              accessible
              accessibilityRole="button"
              accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {isListening ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="mic" size={16} color={isTyping ? colors.textDim : colors.textMuted} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!input.trim() || isTyping}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Feather name="arrow-up" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
