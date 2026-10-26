import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { useParentLearningData } from './hooks/useParentLearningData';
import StatsBanner from './components/StatsBanner';
import SubjectCard from './components/SubjectCard';
import SubjectDetailPanel from './components/SubjectDetailPanel';
import { normalizeCurriculum } from '../../../utils/curriculum';

export default function ParentLearningScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const cardWidth = (isMobile ? '100%' : '48.7%') as `${number}%`;
  const parentEmail = user?.email || '';

  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  // Tapping a subject scrolls its details (rendered below the grid) into view; closing returns to the grid.
  const scrollRef = useRef<ScrollView>(null);
  const gridY = useRef(0);
  const scrollToPanel = useRef(false);
  const toggleSubject = (subject: string) => {
    const opening = expandedSubject !== subject;
    scrollToPanel.current = opening;
    setExpandedSubject(opening ? subject : null);
  };
  const closePanel = () => {
    setExpandedSubject(null);
    scrollRef.current?.scrollTo({ y: Math.max(0, gridY.current - 12), animated: true });
  };

  const {
    children, selectedIdx, setSelectedIdx, child, childCurriculum, childGrade,
    subjects, completedTopics, completedSet, loading, refreshing, analyticsReport, refresh,
  } = useParentLearningData(parentEmail, route?.params?.childId);

  const isIBPYP = childCurriculum === 'IB_PYP' || childCurriculum === 'IB PYP';

  const { totalItems, doneItems, overallPct, curriculumLabel } = useMemo(() => {
    // Same per-subject topic lists the cards count against, so the totals agree.
    const total = subjects.reduce((s, sub) => s + ((sub.topics ?? []).length || sub.topicCount || 0), 0);
    const topicNames = new Set(subjects.flatMap(sub => (sub.topics ?? []).map((t: any) => (typeof t === 'string' ? t : t.topic))));
    const matched = completedTopics.filter(t => topicNames.has(t)).length;
    const done  = Math.min(topicNames.size > 0 ? matched : completedTopics.length, total);
    const currLabel = isIBPYP ? 'IB PYP' : (normalizeCurriculum(childCurriculum) || 'CBSE');
    return {
      totalItems: total,
      doneItems: done,
      overallPct: total > 0 ? Math.round((done / total) * 100) : 0,
      curriculumLabel: `${currLabel} · ${subjects.length} Subjects`,
    };
  }, [subjects, completedTopics, childCurriculum, isIBPYP]);

  const onSelectChild = (i: number) => {
    setExpandedSubject(null);
    setSelectedIdx(i);
  };

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Learning Paths"
          subtitle="Track subjects and progress"
          searchPlaceholder="Search curriculum..."
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentYellow} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childRow}>
            {children.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childTab, selectedIdx === i && styles.childTabActive]}
                onPress={() => onSelectChild(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.childTabName, { color: selectedIdx === i ? colors.accentYellow : colors.textMuted }]}>{c.name}</Text>
                <Text style={styles.childTabGrade}>{c.grade}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <StatsBanner report={analyticsReport} colors={colors} isDark={isDark} />

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.accentYellow + '20' }]}>
                <Feather name="book-open" size={22} color={colors.accentYellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>{curriculumLabel}</Text>
                <Text style={styles.summaryGrade}>{childGrade}</Text>
              </View>
              <View style={[styles.pctBadge, { backgroundColor: overallPct >= 50 ? colors.accentGreen + '20' : colors.accentYellow + '20' }]}>
                <Text style={[styles.pctText, { color: overallPct >= 50 ? colors.accentGreen : colors.accentYellow }]}>{overallPct}%</Text>
              </View>
            </View>
            <Text style={styles.progressLabel}>{doneItems} of {totalItems} topics done</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
              <View style={[styles.progressFill, { width: `${overallPct}%`, backgroundColor: colors.accentYellow }]} />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 20 }} />
          ) : (
            <>
              <Text style={styles.sectionTitle}>Subjects Overview</Text>
              <Text style={styles.sectionHint}>Tap a subject to see topic-by-topic progress</Text>
              {subjects.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Feather name="inbox" size={28} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No content found for {childCurriculum || 'this curriculum'} {childGrade}.{'\n'}Content will appear once ingested.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.subjectGrid} onLayout={(e) => { gridY.current = e.nativeEvent.layout.y; }}>
                    {subjects.map((sub) => (
                      <SubjectCard
                        key={sub.subject}
                        sub={sub}
                        completedSet={completedSet}
                        isExpanded={expandedSubject === sub.subject}
                        onToggle={() => toggleSubject(sub.subject)}
                        width={cardWidth}
                      />
                    ))}
                  </View>

                  {expandedSubject && subjects.find(s => s.subject === expandedSubject) && (
                    <View
                      key={expandedSubject}
                      testID="subject-detail-anchor"
                      onLayout={(e) => {
                        if (!scrollToPanel.current) return;
                        scrollToPanel.current = false;
                        scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true });
                      }}
                    >
                    <SubjectDetailPanel
                      sub={subjects.find(s => s.subject === expandedSubject)}
                      childId={child?.id}
                      completedSet={completedSet}
                      colors={colors}
                      onClose={closePanel}
                      isMobile={isMobile}
                    />
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen:  { flex: 1, backgroundColor: c.bgDark },
  scroll:  { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48, gap: spacing.lg },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  childRow: { flexDirection: 'row' },
  childTab: {
    alignItems: 'center', marginRight: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent',
  },
  childTabActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  childTabName:   { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  childTabGrade:  { fontFamily: fonts.serif, fontSize: 10, color: c.textDim, marginTop: 2 },

  summaryCard: {
    backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  summaryIcon:   { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  summaryTitle:  { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: c.textMain },
  summaryGrade:  { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, marginTop: 2 },
  pctBadge:      { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pctText:       { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800' },
  progressLabel: { fontFamily: fonts.serif, fontSize: 12, color: c.textDim },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4 },

  sectionTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: c.textMain },
  sectionHint:  { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, marginTop: -spacing.sm },

  emptyCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', gap: spacing.md,
  },
  emptyText: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
});
