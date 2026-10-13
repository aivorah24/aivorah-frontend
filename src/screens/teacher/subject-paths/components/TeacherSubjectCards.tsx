import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppColors } from '../../../../theme';
import { useAuth } from '../../../../context/AuthContext';
import { useResponsive } from '../../../../hooks/useResponsive';
import { useSubjects } from '../../../student/learning-paths/hooks/useSubjects';
import SubjectCard from '../../../student/learning-paths/components/SubjectCard';
import { listSubjectEdits, type SubjectEditsSummary } from '../services/subjectEditsService';
import { isCbseCurriculum } from '../../../../utils/curriculum';

const ALL_GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
const gradeLabel = (g: string) => `Grade ${String(g).replace(/\D/g, '') || g}`;
const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/^maths?$/, 'mathematics');
const EMPTY = new Set<string>();

// The subjects of the teacher's grades, as students see them. Opening one gives the teacher full control of it.
export default function TeacherSubjectCards({ colors }: { colors: AppColors }) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const teaches = useMemo(() => {
    const list = (user?.teaches || []).map((t) => ({ grade: gradeLabel(t.grade), curriculum: t.curriculum || user?.curriculum || 'CBSE' }));
    return list.length ? list : [{ grade: gradeLabel(user?.grade || '6'), curriculum: user?.curriculum || 'CBSE' }];
  }, [user]);
  const [grade, setGrade] = useState(teaches[0].grade);
  const [showAll, setShowAll] = useState(false);
  const curriculumRaw = teaches.find((t) => t.grade === grade)?.curriculum || teaches[0].curriculum;
  const isPYP = /^ib.?pyp$/i.test(curriculumRaw.trim());
  const isCBSE = !isPYP && isCbseCurriculum(curriculumRaw);
  const curriculum = isCBSE ? 'CBSE' : curriculumRaw;
  const { subjects, loading } = useSubjects(curriculumRaw, grade, isCBSE, isPYP);

  const [edited, setEdited] = useState<SubjectEditsSummary[]>([]);
  useEffect(() => { listSubjectEdits().then((r) => setEdited(r.subjects)).catch(() => setEdited([])); }, []);
  const statusOf = (subject: string) => edited.find((e) => e.grade === grade.replace(/\D/g, '') && norm(e.subject) === norm(subject));

  const gradeChips = showAll ? ALL_GRADES : [...new Set(teaches.map((t) => t.grade))];
  const chip = (g: string) => (
    <TouchableOpacity key={g} testID={`grade-chip-${g}`} onPress={() => setGrade(g)}
      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: g === grade ? colors.primary : colors.borderColor, backgroundColor: g === grade ? colors.primary + '1A' : 'transparent' }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: g === grade ? colors.primary : colors.textMuted }}>{g}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, padding: 18, gap: 12 }}>
      <View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain }}>Your subjects</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
          The Learning Path your students see. Open a subject to change anything — chapters, topics, lessons, pictures, practice, the book — then publish it to your students.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {gradeChips.map(chip)}
        <TouchableOpacity testID="grade-chip-more" onPress={() => setShowAll((v) => !v)}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>{showAll ? 'Only my grades' : 'Other grades'}</Text>
        </TouchableOpacity>
      </View>
      {loading && !subjects.length ? <ActivityIndicator color={colors.primary} /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {subjects.map((s) => {
            const st = statusOf(s.subject);
            return (
              <View key={s.subject} style={{ width: isMobile ? '100%' : '48.7%' }}>
                <SubjectCard data={s} completedSet={EMPTY} width="100%" onPress={() => navigation.navigate('TeacherSubjectEditor', { curriculum, grade, subject: s.subject })} />
                {!!st && (
                  <Text testID={`subject-status-${s.subject}`} style={{ fontSize: 11.5, fontWeight: '700', marginTop: 4, color: st.status === 'published' && !st.hasUnpublishedChanges ? colors.accentGreen : colors.accentYellow }}>
                    {st.status === 'published' ? (st.hasUnpublishedChanges ? 'Your version · changes not yet published' : 'Your version · published to students') : 'Your version · draft'}
                  </Text>
                )}
              </View>
            );
          })}
          {!loading && !subjects.length && <Text style={{ color: colors.textMuted }}>No subjects for {grade} yet.</Text>}
        </View>
      )}
    </View>
  );
}
