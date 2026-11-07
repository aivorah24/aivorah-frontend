/**
 * SpokenQuestion - the last practice question: the student explains the topic
 * out loud. Mic on -> their words appear as they speak; Stop -> the full text
 * stays on screen to read through; "Record again" starts over; Submit sends it
 * to be graded (useQuiz.submitSpoken).
 *
 * Without speech recognition (native app, Firefox) it falls back to typing, so
 * the question can always be answered.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { useSpeechToText, speechErrorMessage } from '../../../../../hooks/useSpeechToText';
import { countWords, MIN_SPOKEN_WORDS } from '../utils';
import type { SpokenStatus } from '../types';

export default function SpokenQuestion({ hint, text, setText, status, error, onSubmit, colors, isDark }: {
  hint: string;
  text: string;
  setText: (t: string) => void;
  status: SpokenStatus;
  error: string;
  onSubmit: () => void;
  colors: AppColors;
  isDark: boolean;
}) {
  const accent = colors.accentYellow;
  const red = colors.accentRed;
  const speech = useSpeechToText();
  const checking = status === 'checking';

  // What is being said shows up as it is spoken, and stays after Stop.
  useEffect(() => {
    if (speech.listening || speech.transcript) setText(speech.transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setText identity may change every render
  }, [speech.transcript, speech.listening]);

  const words = countWords(text);
  const canSubmit = !speech.listening && !checking && words >= MIN_SPOKEN_WORDS;
  const micMessage = speechErrorMessage(speech.error);
  const startOver = () => { setText(''); speech.start(); };
  const boxBg = isDark ? colors.bgDark : '#F8FAFA';

  return (
    <View style={s.wrap}>
      <Text style={[s.lead, { color: colors.textMuted }]}>
        {speech.supported
          ? 'Press the mic and explain the topic in your own words. Your words will appear below as you speak.'
          : 'Voice input is not available in this browser, so type your explanation instead.'}
      </Text>
      <View style={[s.hint, { backgroundColor: accent + '10', borderColor: accent + '40' }]}>
        <Feather name="zap" size={12} color={accent} />
        <Text style={[s.hintText, { color: colors.textMain }]}>{hint}</Text>
      </View>

      {speech.supported ? (
        <>
          <View style={s.controls}>
            {speech.listening ? (
              <TouchableOpacity testID="spoken-stop" style={[s.micBtn, { backgroundColor: red }]} onPress={speech.stop} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Stop recording">
                <Feather name="square" size={16} color="#fff" />
                <Text style={s.micBtnText}>Stop</Text>
              </TouchableOpacity>
            ) : text ? (
              <TouchableOpacity testID="spoken-rerecord" style={[s.micBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: accent }]} onPress={startOver} disabled={checking} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Record again">
                <Feather name="rotate-ccw" size={16} color={accent} />
                <Text style={[s.micBtnText, { color: accent }]}>Record again</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="spoken-start" style={[s.micBtn, { backgroundColor: accent }]} onPress={startOver} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Start speaking">
                <Feather name="mic" size={16} color="#fff" />
                <Text style={s.micBtnText}>Start speaking</Text>
              </TouchableOpacity>
            )}
            {speech.listening && (
              <View style={s.live} accessibilityLiveRegion="polite">
                <View style={[s.dot, { backgroundColor: red }]} />
                <Text style={[s.liveText, { color: red }]}>Listening… speak now</Text>
              </View>
            )}
          </View>

          <View testID="spoken-transcript" style={[s.transcript, { borderColor: speech.listening ? red + '70' : accent + '50', backgroundColor: boxBg }]}>
            {text ? (
              <Text style={[s.transcriptText, { color: colors.textMain }]} selectable>{text}</Text>
            ) : (
              <Text style={[s.transcriptText, { color: colors.textDim }]}>
                {speech.listening ? 'Start talking. Your words will appear here.' : 'Your explanation will appear here.'}
              </Text>
            )}
          </View>
          {!!micMessage && <Text style={[s.err, { color: red }]}>{micMessage}</Text>}
        </>
      ) : (
        <TextInput
          testID="spoken-typed"
          style={[s.transcript, s.typed, { borderColor: accent + '50', backgroundColor: boxBg, color: colors.textMain }]}
          multiline
          value={text}
          onChangeText={setText}
          editable={!checking}
          placeholder="Explain the topic in your own words…"
          placeholderTextColor={colors.textDim}
        />
      )}

      {!!text && !speech.listening && words < MIN_SPOKEN_WORDS && (
        <Text style={[s.note, { color: colors.textMuted }]}>Say a little more, then submit.</Text>
      )}
      {status === 'error' && !!error && <Text style={[s.err, { color: red }]}>{error}</Text>}

      <TouchableOpacity
        testID="spoken-submit"
        style={[s.submit, { backgroundColor: canSubmit ? accent : accent + '45' }]}
        onPress={onSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        {checking ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={s.submitText}>Aivorah is checking your answer…</Text>
          </>
        ) : (
          <>
            <Feather name="send" size={14} color="#fff" />
            <Text style={s.submitText}>Submit & See Results</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 4 },
  lead: { fontSize: 14, lineHeight: 21 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 19 },
  controls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  micBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 24 },
  micBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  liveText: { fontSize: 13, fontWeight: '700' },
  transcript: { minHeight: 120, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  typed: { textAlignVertical: 'top', fontSize: 15, lineHeight: 23 },
  transcriptText: { fontSize: 15, lineHeight: 23 },
  note: { fontSize: 12.5 },
  err: { fontSize: 12.5, lineHeight: 18 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
});
