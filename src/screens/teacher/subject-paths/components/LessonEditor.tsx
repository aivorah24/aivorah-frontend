import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { LessonEdit, BookQuizQuestion } from '../../../student/learning-paths/subject-syllabus/subjectEdits';
import MathTutorEditor from '../../curriculum-learning-path/components/MathTutorEditor';
import BlockCanvas from './BlockCanvas';
import BookEditor from './BookEditor';

type Tab = 'learn' | 'audio' | 'practice' | 'book';

const moveIn = <T,>(list: T[], i: number, d: -1 | 1): T[] => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const c = [...list];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

function useInput(colors: AppColors) {
  return { fontSize: 13.5, lineHeight: 20, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, padding: 8, backgroundColor: colors.bgDark } as const;
}

function SmallLink({ label, onPress, colors, testID }: { label: string; onPress: () => void; colors: AppColors; testID?: string }) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Objectives({ items, colors, onChange }: { items: string[]; colors: AppColors; onChange: (items: string[]) => void }) {
  const input = useInput(colors);
  return (
    <View style={{ gap: 6, padding: 12, borderRadius: 12, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '35' }}>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.primary }}>WHAT YOU&apos;LL LEARN (objectives)</Text>
      {items.map((o, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TextInput testID={`objective-${i}`} value={o} onChangeText={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} style={[input, { flex: 1, paddingVertical: 6 }]} />
          <TouchableOpacity testID={`objective-remove-${i}`} onPress={() => onChange(items.filter((_, k) => k !== i))}>
            <Feather name="x" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <SmallLink testID="objective-add" label="+ Add objective" colors={colors} onPress={() => onChange([...items, ''])} />
    </View>
  );
}

function ScriptEditor({ parts, colors, onChange }: { parts: { heading: string; text: string; [k: string]: any }[]; colors: AppColors; onChange: (p: any[]) => void }) {
  const input = useInput(colors);
  const set = (i: number, patch: object) => onChange(parts.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>Students hear these parts read aloud, one after another.</Text>
      {parts.map((p, i) => (
        <View key={i} testID={`script-part-${i}`} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TextInput testID={`script-heading-${i}`} value={p.heading} onChangeText={(v) => set(i, { heading: v })} placeholder="Heading" placeholderTextColor={colors.textMuted} style={[input, { flex: 1, fontWeight: '700' }]} />
            <TouchableOpacity onPress={() => onChange(moveIn(parts, i, -1))}><Feather name="arrow-up" size={14} color={colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity onPress={() => onChange(moveIn(parts, i, 1))}><Feather name="arrow-down" size={14} color={colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity testID={`script-remove-${i}`} onPress={() => onChange(parts.filter((_, k) => k !== i))}><Feather name="trash-2" size={14} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <TextInput testID={`script-text-${i}`} value={p.text} onChangeText={(v) => set(i, { text: v })} multiline style={[input, { minHeight: 70 }]} />
        </View>
      ))}
      <SmallLink testID="script-add" label="+ Add part" colors={colors} onPress={() => onChange([...parts, { heading: '', text: '' }])} />
    </View>
  );
}

function PracticeEditor({ quiz, colors, onChange }: { quiz: BookQuizQuestion[]; colors: AppColors; onChange: (q: BookQuizQuestion[]) => void }) {
  const input = useInput(colors);
  const set = (i: number, patch: Partial<BookQuizQuestion>) => onChange(quiz.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  return (
    <View style={{ gap: 12 }}>
      {quiz.map((q, i) => (
        <View key={i} testID={`quiz-${i}`} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.textMuted }}>QUESTION {i + 1}</Text>
            <TouchableOpacity onPress={() => onChange(moveIn(quiz, i, -1))}><Feather name="arrow-up" size={14} color={colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity onPress={() => onChange(moveIn(quiz, i, 1))}><Feather name="arrow-down" size={14} color={colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity testID={`quiz-remove-${i}`} onPress={() => onChange(quiz.filter((_, k) => k !== i))}><Feather name="trash-2" size={14} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <TextInput testID={`quiz-question-${i}`} value={q.question} onChangeText={(v) => set(i, { question: v })} multiline style={[input, { fontWeight: '700' }]} />
          {q.options.map((o, oi) => (
            <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity testID={`quiz-correct-${i}-${oi}`} onPress={() => set(i, { correctIndex: oi })}>
                <Feather name={q.correctIndex === oi ? 'check-circle' : 'circle'} size={16} color={q.correctIndex === oi ? colors.accentGreen : colors.textMuted} />
              </TouchableOpacity>
              <TextInput testID={`quiz-option-${i}-${oi}`} value={o} onChangeText={(v) => set(i, { options: q.options.map((x, k) => (k === oi ? v : x)) })} style={[input, { flex: 1, paddingVertical: 6 }]} />
              {q.options.length > 2 && (
                <TouchableOpacity onPress={() => set(i, { options: q.options.filter((_, k) => k !== oi), correctIndex: q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex === oi ? 0 : q.correctIndex })}>
                  <Feather name="x" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {q.options.length < 6 && <SmallLink label="+ Add option" colors={colors} onPress={() => set(i, { options: [...q.options, ''] })} />}
          <TextInput value={q.explanation || ''} onChangeText={(v) => set(i, { explanation: v })} placeholder="Explanation shown after answering (optional)" placeholderTextColor={colors.textMuted} multiline style={input} />
        </View>
      ))}
      <SmallLink testID="quiz-add" label="+ Add question" colors={colors} onPress={() => onChange([...quiz, { question: '', options: ['', '', '', ''], correctIndex: 0 }])} />
    </View>
  );
}

// Every part of one topic's lesson, editable: objectives + Learn blocks, the Listen / AI Tutor script, Practice, the book.
export default function LessonEditor({
  lesson, isMath, grade, subject, colors, onChange,
}: { lesson: LessonEdit; isMath: boolean; grade: string; subject: string; colors: AppColors; onChange: (lesson: LessonEdit) => void }) {
  const [tab, setTab] = useState<Tab>('learn');
  const patch = (p: Partial<LessonEdit>) => onChange({ ...lesson, ...p });
  const hasTutor = isMath && !!lesson.mathTutor?.examples?.length;
  const scriptField: 'listenScript' | 'listenParts' = lesson.listenScript?.length ? 'listenScript' : 'listenParts';
  const tabs: [Tab, string, any][] = [
    ['learn', 'Learn', 'book-open'],
    ['audio', isMath ? 'AI Tutor' : 'Listen', isMath ? 'cpu' : 'headphones'],
    ['practice', 'Practice', 'check-square'],
    ['book', 'Book', 'book'],
  ];
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(([key, label, icon]) => (
          <TouchableOpacity key={key} testID={`editor-tab-${key}`} onPress={() => setTab(key)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: tab === key ? colors.primary + '1F' : 'transparent', borderWidth: 1, borderColor: tab === key ? colors.primary + '55' : colors.borderColor }}>
            <Feather name={icon} size={13} color={tab === key ? colors.primary : colors.textMuted} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: tab === key ? colors.primary : colors.textMuted }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'learn' && (
        <View style={{ gap: 12 }}>
          <Objectives items={lesson.whatYoullLearn || []} colors={colors} onChange={(whatYoullLearn) => patch({ whatYoullLearn })} />
          <BlockCanvas blocks={lesson.blocks || []} colors={colors} onChange={(blocks) => patch({ blocks })} />
        </View>
      )}
      {tab === 'audio' && (hasTutor ? (
        <MathTutorEditor tutor={lesson.mathTutor} colors={colors} editable onChange={(mathTutor) => patch({ mathTutor })} />
      ) : (
        <ScriptEditor parts={(lesson[scriptField] as any[]) || []} colors={colors} onChange={(parts) => patch({ [scriptField]: parts } as Partial<LessonEdit>)} />
      ))}
      {tab === 'practice' && <PracticeEditor quiz={lesson.practiceQuiz || []} colors={colors} onChange={(practiceQuiz) => patch({ practiceQuiz })} />}
      {tab === 'book' && <BookEditor lesson={lesson} grade={grade} subject={subject} colors={colors} onChange={patch} />}
    </View>
  );
}
