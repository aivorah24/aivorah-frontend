import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import { TeacherMathTutor, TeacherMathTutorExample } from '../types';

// Edits the Maths AI Tutor script exactly as the student's AI Tutor tab plays it: an intro, then one board per book
// example — what the tutor says at each step, what is written on the board, and the answer.
export default function MathTutorEditor({
  tutor, colors, editable, onChange,
}: { tutor: TeacherMathTutor; colors: AppColors; editable: boolean; onChange: (tutor: TeacherMathTutor) => void }) {
  const input = { fontSize: 13, lineHeight: 19, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 } as const;
  const label = { fontSize: 11, fontWeight: '700', color: colors.textMuted } as const;

  const setExample = (ei: number, patch: Partial<TeacherMathTutorExample>) =>
    onChange({ ...tutor, examples: tutor.examples.map((e, i) => (i === ei ? { ...e, ...patch } : e)) });
  const setStep = (ei: number, si: number, patch: { say?: string; show?: string }) =>
    setExample(ei, { steps: tutor.examples[ei].steps.map((s, i) => (i === si ? { ...s, ...patch } : s)) });

  return (
    <View testID="math-tutor-editor" style={{ gap: 14 }}>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>
        The AI Tutor reads these lines aloud and writes each step on the board, one example at a time.
      </Text>
      <View style={{ gap: 4 }}>
        <Text style={label}>INTRODUCTION (spoken first)</Text>
        <TextInput testID="tutor-intro" value={tutor.intro || ''} onChangeText={(v) => onChange({ ...tutor, intro: v })} editable={editable} multiline style={input} />
      </View>

      {tutor.examples.map((ex, ei) => (
        <View key={ei} testID={`tutor-example-${ei}`} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>Example {ei + 1}{ex.page ? ` · book page ${ex.page}` : ''}</Text>
            {editable && (
              <TouchableOpacity testID={`tutor-remove-example-${ei}`} onPress={() => onChange({ ...tutor, examples: tutor.examples.filter((_, i) => i !== ei) })}>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={label}>TITLE</Text>
          <TextInput testID={`tutor-title-${ei}`} value={ex.title || ''} onChangeText={(v) => setExample(ei, { title: v })} editable={editable} style={input} />
          <Text style={label}>PROBLEM</Text>
          <TextInput testID={`tutor-problem-${ei}`} value={ex.problem} onChangeText={(v) => setExample(ei, { problem: v })} editable={editable} multiline style={input} />
          <Text style={label}>STEPS — what the tutor says · what goes on the board</Text>
          {ex.steps.map((s, si) => (
            <View key={si} style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput testID={`tutor-say-${ei}-${si}`} value={s.say} onChangeText={(v) => setStep(ei, si, { say: v })} editable={editable} multiline style={[input, { flex: 2 }]} />
              <TextInput testID={`tutor-show-${ei}-${si}`} value={s.show || ''} onChangeText={(v) => setStep(ei, si, { show: v })} editable={editable} placeholder="board" placeholderTextColor={colors.textMuted} style={[input, { flex: 1 }]} />
            </View>
          ))}
          <Text style={label}>ANSWER</Text>
          <TextInput testID={`tutor-answer-${ei}`} value={ex.answer} onChangeText={(v) => setExample(ei, { answer: v })} editable={editable} style={input} />
          {ex.yourTurn && (
            <>
              <Text style={label}>YOUR TURN (student tries one)</Text>
              <TextInput testID={`tutor-yourturn-q-${ei}`} value={ex.yourTurn.question} onChangeText={(v) => setExample(ei, { yourTurn: { ...ex.yourTurn!, question: v } })} editable={editable} multiline style={input} />
              <TextInput testID={`tutor-yourturn-a-${ei}`} value={ex.yourTurn.answer} onChangeText={(v) => setExample(ei, { yourTurn: { ...ex.yourTurn!, answer: v } })} editable={editable} style={input} />
            </>
          )}
        </View>
      ))}
    </View>
  );
}
