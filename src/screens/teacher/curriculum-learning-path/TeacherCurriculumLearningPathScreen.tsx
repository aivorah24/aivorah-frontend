import React, { useEffect, useMemo, useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../theme';
import { useCurriculumUpload } from './hooks/useCurriculumUpload';
import { useLearningPathDraft } from './hooks/useLearningPathDraft';
import PreUploadConfigPanel, { CURRICULA, GRADES_BY_CURRICULUM, ACADEMIC_YEARS } from './components/PreUploadConfigPanel';

// Sidebar "Curriculum Upload": bring a curriculum document in and follow its processing. The finished learning path
// is reviewed, edited and published on the "Learning Paths" screen.
export default function TeacherCurriculumLearningPathScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { curriculum, progress, fileName, phase, error: uploadError, busy, connectionIssue, pickAndUpload, retry } = useCurriculumUpload();
  const curriculumId = curriculum?.status === 'generated' ? curriculum.id : null;
  // Loaded only to show what was detected (units/topics) once processing finishes.
  const draft = useLearningPathDraft(curriculumId);

  const [configCurriculum, setConfigCurriculum] = useState(CURRICULA[3]); // CBSE
  const [configGrade, setConfigGrade] = useState(GRADES_BY_CURRICULUM.CBSE[5]); // Grade 6
  const [configSubject, setConfigSubject] = useState('Mathematics');
  const [configAcademicYear, setConfigAcademicYear] = useState(ACADEMIC_YEARS[2]); // 2026-27

  useEffect(() => {
    if (curriculumId) draft.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  const detected = draft.learningPath
    ? {
        unitCount: draft.learningPath.content.units.length,
        topicCount: draft.learningPath.content.units.reduce((sum, u) => sum + u.topics.length, 0),
      }
    : null;

  return (
    <ScreenLayout>
      <Header title="Curriculum Upload" subtitle="Upload a curriculum document to build a learning path" />
      <ScrollView contentContainerStyle={styles.container}>
        <PreUploadConfigPanel
          curriculum={configCurriculum} setCurriculum={setConfigCurriculum}
          grade={configGrade} setGrade={setConfigGrade}
          subject={configSubject} setSubject={setConfigSubject}
          academicYear={configAcademicYear} setAcademicYear={setConfigAcademicYear}
          fileName={fileName ?? curriculum?.file_name ?? null}
          status={curriculum?.status ?? null}
          phase={phase}
          progress={progress}
          connectionIssue={connectionIssue}
          onRetry={retry}
          statusError={curriculum?.status === 'failed' ? (curriculum.error || uploadError) : phase === 'upload_failed' ? uploadError : null}
          busy={busy}
          onPickFile={() => pickAndUpload({ curriculum: configCurriculum, grade: configGrade, subject: configSubject })}
          detected={detected}
          onOpenReview={curriculumId ? () => navigation?.navigate('TeacherClassLearningPaths', { curriculumId }) : undefined}
        />

        {uploadError && curriculum?.status !== 'failed' && phase !== 'upload_failed' && (
          <Text testID="general-error" style={styles.errorText}>{uploadError}</Text>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { padding: 16, gap: 16 },
  errorText: { color: colors.accentRed },
});
