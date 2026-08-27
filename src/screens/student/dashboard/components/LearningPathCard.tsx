import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { BRAND } from '../constants';
import { SectionHeader } from './common/SectionHeader';
import type { makeStyles } from '../DashboardScreen';

interface ChapterRow {
  title: string;
  subject: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  chapterNo: number;
}

interface LearningPathCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  subtleBg: string;
  noContentGrade: boolean;
  studentGrade: string;
  topicsGoal: number;
  isIBPYP: boolean;
  lessonSubjects: string[];
  effectiveLessonSubjectFilter: string;
  setLessonSubjectFilter: (subject: string) => void;
  filteredChapterRows: ChapterRow[];
  searchQuery: string;
  navigation: { navigate: (screen: string, params?: any) => void };
}

// Learning Path section — subject filter chips + the chapter list (one row
// per real textbook chapter, not per topic). Shows a "coming soon" state for
// grades with no content yet (noContentGrade) instead of the chip/list UI.
export function LearningPathCard({
  styles,
  colors,
  isDark,
  cardBg,
  cardBorder,
  subtleBg,
  noContentGrade,
  studentGrade,
  topicsGoal,
  isIBPYP,
  lessonSubjects,
  effectiveLessonSubjectFilter,
  setLessonSubjectFilter,
  filteredChapterRows,
  searchQuery,
  navigation,
}: LearningPathCardProps) {
  if (noContentGrade) {
    return (
      <View style={[styles.lessonContainer, { backgroundColor: cardBg, borderColor: cardBorder, alignItems: 'center', padding: 28, gap: 10, marginTop: 8 }]}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: BRAND.violet + '15', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="clock" size={22} color={BRAND.violet} />
        </View>
        <Text style={[styles.lessonTopic, { color: colors.textMain, fontSize: 17, textAlign: 'center' }]}>Lessons for {studentGrade} are coming soon</Text>
        <Text style={[styles.lessonMeta, { color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 380 }]}>
          Our team is carefully crafting playful, age-appropriate learning experiences for {studentGrade}. We&apos;ll let you know the moment they&apos;re ready to explore.
        </Text>
      </View>
    );
  }

  return (
    <>
      <SectionHeader title="Learning Path" sub={`${topicsGoal} chapters in your curriculum`} onPress={() => navigation.navigate('LearningPaths')} linkLabel={`See all ${topicsGoal}`} />

      {/* Subject filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {lessonSubjects.map(subj => {
          const active = effectiveLessonSubjectFilter === subj;
          return (
            <TouchableOpacity
              key={subj}
              onPress={() => setLessonSubjectFilter(subj)}
              style={[styles.barChip, { backgroundColor: active ? BRAND.violet : (isDark ? BRAND.violet + '20' : BRAND.violet + '12'), borderColor: active ? BRAND.violet : (isDark ? BRAND.violet + '50' : BRAND.violet + '30') }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.barChipTxt, { color: active ? '#fff' : BRAND.violet }]}>{subj}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredChapterRows.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Feather name="search" size={22} color={colors.textDim} />
          <Text style={[styles.emptyTxt, { color: colors.textMuted }]}>No chapters match &quot;{searchQuery}&quot;</Text>
        </View>
      ) : (
        <View style={[styles.lessonContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* One row per REAL chapter (not per topic) — same reasoning as the
              Performance bars: a subject can have 1000+ ingested topics, so this
              list must stay chapter-scale to be browsable. Individual topics inside
              a chapter aren't tagged at ingestion time (see notes on allBarTopics
              above), so tapping a chapter opens that SUBJECT's topic list rather
              than a specific lesson directly. */}
          {filteredChapterRows.map((item, idx) => (
            <TouchableOpacity
              key={`${item.subject}-${item.title}`}
              style={[styles.lessonRow, idx < filteredChapterRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: cardBorder }]}
              onPress={() => navigation.navigate('SubjectSyllabus', { subject: item.subject, grade: studentGrade, curriculum: isIBPYP ? 'IB PYP' : 'CBSE', chapterTitle: item.title })}
              activeOpacity={0.78}
            >
              <View style={[styles.lessonDot, { backgroundColor: item.color }]} />
              <View style={[styles.lessonIconBox, { backgroundColor: item.color + '15' }]}>
                <Feather name={item.icon} size={15} color={item.color} />
              </View>
              <View style={styles.lessonMid}>
                <Text style={[styles.lessonTopic, { color: colors.textMain }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.lessonMeta, { color: colors.textMuted }]}>{item.subject} · Chapter {item.chapterNo}</Text>
              </View>
              <View style={styles.lessonRight}>
                <View style={[styles.stagePill, { backgroundColor: subtleBg, borderColor: cardBorder }]}>
                  <Text style={[styles.stagePillTxt, { color: colors.textDim }]}>Not Started</Text>
                </View>
                <View style={[styles.lessonCta, { backgroundColor: item.color + '12', borderColor: item.color + '35' }]}>
                  <Text style={[styles.lessonCtaTxt, { color: item.color }]}>Start</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}
