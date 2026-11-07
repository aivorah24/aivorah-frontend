/**
 * MicButton - speak into a chat box instead of typing. Tap to talk, the words
 * appear in the input as they are spoken (after anything already typed), tap
 * again to stop. Hidden where the browser has no speech recognition (native
 * app, Firefox), so the chat simply stays type-only there.
 */
import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../theme';
import { useSpeechToText, speechErrorMessage } from '../../hooks/useSpeechToText';

export default function MicButton({ value, onChangeText, colors, size = 38, disabled, style }: {
  value: string;
  onChangeText: (text: string) => void;
  colors: Pick<AppColors, 'accentYellow' | 'borderColor' | 'textMuted' | 'accentRed'>;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const speech = useSpeechToText();
  const baseRef = useRef('');

  // While listening, the input shows what was typed before + what is being said.
  useEffect(() => {
    if (!speech.listening && !speech.transcript) return;
    onChangeText([baseRef.current, speech.transcript].filter((s) => s.trim()).join(' '));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChangeText identity may change every render
  }, [speech.transcript]);

  if (!speech.supported) return null;

  const toggle = () => {
    if (speech.listening) { speech.stop(); return; }
    baseRef.current = value.trim();
    speech.start();
  };
  const on = speech.listening;
  const message = speechErrorMessage(speech.error);

  return (
    <View style={style}>
      <TouchableOpacity
        testID="chat-mic"
        onPress={toggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={on ? 'Stop voice input' : 'Speak your message'}
        accessibilityState={{ selected: on }}
        activeOpacity={0.75}
        style={[s.btn, {
          width: size, height: size, borderRadius: size / 2,
          borderColor: on ? colors.accentRed : colors.borderColor,
          backgroundColor: on ? colors.accentRed + '1F' : 'transparent',
          opacity: disabled ? 0.5 : 1,
        }]}
      >
        <Feather name={on ? 'square' : 'mic'} size={Math.round(size * 0.42)} color={on ? colors.accentRed : colors.accentYellow} />
      </TouchableOpacity>
      {!!message && (
        <Text style={[s.err, { color: colors.accentRed }]} numberOfLines={3}>{message}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  err: { position: 'absolute', bottom: '100%', right: 0, width: 220, fontSize: 11, marginBottom: 6 },
});
