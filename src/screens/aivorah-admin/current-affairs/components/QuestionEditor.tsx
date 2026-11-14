import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Button, Field, Segment } from './ui';
import { addQuestion, setQuestionStatus, updateQuestion } from '../services/currentAffairsAdminService';
import { CA_CATEGORIES, type CaCategory, type QuizQuestion } from '../types';
import type { CaStyles } from '../styles';

const TYPES = [
  { value: 'mcq' as const, label: 'Multiple choice' },
  { value: 'true_false' as const, label: 'True / False' },
  { value: 'reasoning' as const, label: 'Reasoning' },
];

type Draft = Pick<QuizQuestion, 'category' | 'question_type' | 'question' | 'options' | 'correct_index' | 'explanation'> & { extra_fact: string };

const toDraft = (q: QuizQuestion | null): Draft => ({
  category: q?.category || 'india',
  question_type: q?.question_type || 'mcq',
  question: q?.question || '',
  options: q?.options?.length ? [...q.options] : ['', '', '', ''],
  correct_index: q?.correct_index ?? 0,
  explanation: q?.explanation || '',
  extra_fact: q?.extra_fact || '',
});

/** One quiz question: edit it, pick the right answer, reject or restore it. A null question adds a new one. */
export default function QuestionEditor({ question, number, weekStart, ageGroup, styles, accent, onSaved }: {
  question: QuizQuestion | null; number: number; weekStart: string; ageGroup: string;
  styles: CaStyles; accent: string; onSaved: (q: QuizQuestion) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(question));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const id = question?.id || 'new';
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  function changeType(type: Draft['question_type']) {
    if (type === 'true_false') set({ question_type: type, options: ['True', 'False'], correct_index: Math.min(draft.correct_index, 1) });
    else set({ question_type: type, options: draft.options.length === 4 ? draft.options : [...draft.options, '', ''].slice(0, 4) });
  }

  async function run(action: () => Promise<QuizQuestion>, done: string) {
    setBusy(true); setMessage(''); setProblem('');
    try {
      const saved = await action();
      onSaved(saved);
      if (!question) setDraft(toDraft(null));
      setMessage(done);
    } catch (e: any) {
      setProblem(e?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const fields = { ...draft, options: draft.options.map((o) => o.trim()) };
  const save = () => run(
    () => (question ? updateQuestion(question.id, fields) : addQuestion({ ...fields, week_start: weekStart, age_group: ageGroup as any })),
    question ? 'Saved.' : 'Added. Publish the quiz to show it.',
  );
  const rejected = question?.status === 'rejected';

  return (
    <View style={[styles.card, rejected && { opacity: 0.6 }]} testID={`ca-q-${id}`}>
      <View style={styles.row}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>{question ? `Question ${number}` : 'Add a question'}</Text>
        {question ? <Text style={styles.chip}>{question.status}</Text> : null}
      </View>
      {question?.review_notes ? <Text style={[styles.notes, { marginTop: 6 }]}>{question.review_notes}</Text> : null}

      <Text style={styles.label}>Type</Text>
      <Segment styles={styles} testID={`ca-q-${id}-type`} options={TYPES} value={draft.question_type} onChange={changeType} />
      <Text style={styles.label}>Category</Text>
      <Segment styles={styles} testID={`ca-q-${id}-category`} value={draft.category as CaCategory}
        options={CA_CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))} onChange={(v) => set({ category: v })} />

      <Field styles={styles} label="Question" multiline value={draft.question} onChange={(v) => set({ question: v })} testID={`ca-q-${id}-question`} />

      <Text style={styles.label}>Answers (tap the circle for the right one)</Text>
      {draft.options.map((o, i) => (
        <View key={i} style={styles.option}>
          <TouchableOpacity testID={`ca-q-${id}-correct-${i}`} onPress={() => set({ correct_index: i })}
            style={[styles.radio, draft.correct_index === i && styles.radioOn]} accessibilityLabel={`Mark answer ${i + 1} as correct`} />
          <TextInput
            testID={`ca-q-${id}-option-${i}`}
            style={[styles.input, { flex: 1 }]}
            value={o}
            editable={draft.question_type !== 'true_false'}
            onChangeText={(v) => set({ options: draft.options.map((x, k) => (k === i ? v : x)) })}
            placeholder={`Answer ${i + 1}`}
          />
        </View>
      ))}

      <Field styles={styles} label="Why this is the answer" multiline value={draft.explanation} onChange={(v) => set({ explanation: v })} testID={`ca-q-${id}-explanation`} />
      <Field styles={styles} label="Extra fact (optional)" value={draft.extra_fact} onChange={(v) => set({ extra_fact: v })} />

      <View style={[styles.row, { marginTop: 14 }]}>
        <Button styles={styles} label={question ? 'Save' : 'Add question'} icon={question ? 'save' : 'plus'} kind="primary" onPress={save} disabled={busy} testID={`ca-q-${id}-save`} />
        {question ? (
          rejected
            ? <Button styles={styles} label="Restore" icon="rotate-ccw" onPress={() => run(() => setQuestionStatus(question.id, 'review'), 'Restored.')} disabled={busy} testID={`ca-q-${id}-restore`} />
            : <Button styles={styles} label="Reject" icon="x-circle" kind="danger" onPress={() => run(() => setQuestionStatus(question.id, 'rejected'), 'Rejected: it will not be in the quiz.')} disabled={busy} testID={`ca-q-${id}-reject`} />
        ) : null}
        {busy ? <ActivityIndicator color={accent} /> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {problem ? <Text style={styles.error} testID={`ca-q-${id}-error`}>{problem}</Text> : null}
      </View>
    </View>
  );
}
