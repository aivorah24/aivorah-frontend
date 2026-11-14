import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import QuestionEditor from './QuestionEditor';
import { Button, LoadState, Segment } from './ui';
import { getQuiz, listQuizWeeks, publishQuiz } from '../services/currentAffairsAdminService';
import { useLoad } from '../hooks/useLoad';
import type { CaAgeGroup, QuizQuestion } from '../types';
import type { CaStyles } from '../styles';

const AGE_OPTIONS: { value: CaAgeGroup; label: string }[] = [
  { value: 'under-8', label: 'Under 8' },
  { value: '8-12', label: '8–12' },
  { value: '13+', label: '13+' },
];

/** YYYY-MM-DD plus n days. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The weekly quiz of one age group: every question, editable; publish the week. */
export default function QuizPanel({ styles, accent }: { styles: CaStyles; accent: string }) {
  const [ageGroup, setAgeGroup] = useState<CaAgeGroup>('8-12');
  const [week, setWeek] = useState<string | null>(null);
  const weeks = useLoad(listQuizWeeks, 'Could not load quiz weeks');
  const weekStart = week || weeks.data?.currentWeek || null;
  const fetchQuiz = useCallback(() => (weekStart ? getQuiz(weekStart, ageGroup) : Promise.resolve([] as QuizQuestion[])), [weekStart, ageGroup]);
  const quiz = useLoad(fetchQuiz, 'Could not load the quiz');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');

  const questions = quiz.data || [];
  const live = questions.filter((q) => q.status === 'published').length;
  const waiting = questions.filter((q) => q.status === 'review' || q.status === 'draft').length;

  function replace(saved: QuizQuestion) {
    const exists = questions.some((q) => q.id === saved.id);
    quiz.setData(exists ? questions.map((q) => (q.id === saved.id ? saved : q)) : [...questions, saved]);
    weeks.reload();
  }

  async function publish() {
    if (!weekStart) return;
    setBusy(true); setMessage(''); setProblem('');
    try {
      const { published } = await publishQuiz(weekStart, ageGroup);
      setMessage(published ? `Published ${published} question${published === 1 ? '' : 's'}: students can play the quiz now.` : 'Nothing new to publish.');
      quiz.reload(); weeks.reload();
    } catch (e: any) {
      setProblem(e?.message || 'Could not publish. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!weekStart) return <LoadState styles={styles} loading={weeks.loading} error={weeks.error} onRetry={weeks.reload} color={accent} />;

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.toolbar}>
        <Segment styles={styles} testID="ca-quiz-age" options={AGE_OPTIONS} value={ageGroup} onChange={(v) => { setAgeGroup(v); setMessage(''); }} />
        <Button styles={styles} label="Previous week" icon="chevron-left" onPress={() => setWeek(shiftDate(weekStart, -7))} testID="ca-quiz-prev" />
        <Text style={styles.listTitle} testID="ca-quiz-week">Week of {weekStart}{weekStart === weeks.data?.currentWeek ? ' (this week)' : ''}</Text>
        <Button styles={styles} label="Next week" icon="chevron-right" onPress={() => setWeek(shiftDate(weekStart, 7))} testID="ca-quiz-next" />
      </View>

      <View style={[styles.card, styles.row]}>
        <Text style={[styles.message, { flex: 1, minWidth: 220 }]} testID="ca-quiz-summary">
          {questions.length ? `${questions.length} questions · ${live} published · ${waiting} waiting for review` : 'No questions for this week yet. The quiz is written automatically every Sunday, or add questions below.'}
        </Text>
        <Button styles={styles} label="Publish this quiz" icon="send" kind="primary" onPress={publish} disabled={busy || !waiting} testID="ca-quiz-publish" />
        {busy ? <ActivityIndicator color={accent} /> : null}
        {message ? <Text style={styles.message} testID="ca-quiz-message">{message}</Text> : null}
        {problem ? <Text style={styles.error}>{problem}</Text> : null}
      </View>

      <LoadState styles={styles} loading={quiz.loading && !quiz.data} error={quiz.error} onRetry={quiz.reload} color={accent} />
      {questions.map((q, i) => (
        <QuestionEditor key={q.id} question={q} number={i + 1} weekStart={weekStart} ageGroup={ageGroup} styles={styles} accent={accent} onSaved={replace} />
      ))}
      <QuestionEditor key={`new-${weekStart}-${ageGroup}`} question={null} number={questions.length + 1} weekStart={weekStart} ageGroup={ageGroup} styles={styles} accent={accent} onSaved={replace} />
    </View>
  );
}
