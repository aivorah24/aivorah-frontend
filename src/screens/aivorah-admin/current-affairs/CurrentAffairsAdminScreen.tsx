import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { makeStyles } from './styles';
import { Segment } from './components/ui';
import StoriesPanel from './components/StoriesPanel';
import QuizPanel from './components/QuizPanel';
import InsightsPanel from './components/InsightsPanel';

type Tab = 'stories' | 'quiz' | 'insights';
const TABS: { value: Tab; label: string }[] = [
  { value: 'stories', label: 'Stories' },
  { value: 'quiz', label: 'Weekly quiz' },
  { value: 'insights', label: 'Insights' },
];

/**
 * Current Affairs content tool for the Aivorah team: review and publish the
 * stories the daily pipeline wrote (or write new ones), edit and publish the
 * weekly quiz, and see whether students read and play.
 */
export default function CurrentAffairsAdminScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const accent = colors.accentYellow;
  const [tab, setTab] = useState<Tab>('stories');

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Current Affairs" subtitle="Review, write and publish stories and quizzes; see how students use them." onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Segment styles={styles} testID="ca-tab" options={TABS} value={tab} onChange={setTab} />
          {tab === 'stories' ? <StoriesPanel styles={styles} accent={accent} /> : null}
          {tab === 'quiz' ? <QuizPanel styles={styles} accent={accent} /> : null}
          {tab === 'insights' ? <InsightsPanel styles={styles} accent={accent} /> : null}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
