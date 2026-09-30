import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../theme';
import MyLearningPathsList from './components/MyLearningPathsList';
import LearningPathWorkspace from './components/LearningPathWorkspace';
import TeacherSubjectCards from '../subject-paths/components/TeacherSubjectCards';

// Sidebar "Learning Paths": every class learning path the teacher has made — open one to review it as students
// see it, edit it, and publish it (or publish updates).
export default function TeacherLearningPathsManageScreen({ route }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const wanted = route?.params?.curriculumId as string | undefined;
  const [openedId, setOpenedId] = useState<string | null>(wanted ?? null);
  const [listRefresh, setListRefresh] = useState(0);
  const dirty = useRef(false);

  // Opened from Curriculum Upload with a freshly generated path (adjusted during render when the param changes).
  const [prevWanted, setPrevWanted] = useState(wanted);
  if (wanted !== prevWanted) {
    setPrevWanted(wanted);
    if (wanted) setOpenedId(wanted);
  }

  const refreshList = useCallback(() => setListRefresh((n) => n + 1), []);
  const trackDirty = useCallback((d: boolean) => { dirty.current = d; }, []);

  function open(id: string) {
    if (dirty.current && !(typeof window !== 'undefined' && window.confirm?.('You have unsaved changes. Leave them?'))) return;
    setOpenedId(id);
  }

  return (
    <ScreenLayout>
      <Header title="Learning Paths" subtitle="See, edit and publish what your students learn" />
      <ScrollView contentContainerStyle={styles.container}>
        <TeacherSubjectCards colors={colors} />
        <MyLearningPathsList
          colors={colors}
          openCurriculumId={openedId}
          refreshKey={listRefresh}
          onOpen={open}
          onDeleted={(id) => { if (id === openedId) setOpenedId(null); }}
        />
        {!!openedId && (
          <LearningPathWorkspace key={openedId} curriculumId={openedId} colors={colors} onSaved={refreshList} onDirtyChange={trackDirty} />
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const makeStyles = (_colors: AppColors) => StyleSheet.create({
  container: { padding: 16, gap: 16 },
});
