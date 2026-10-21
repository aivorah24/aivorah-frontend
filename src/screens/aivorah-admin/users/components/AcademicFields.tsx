import React, { useEffect, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import type { AppColors } from '../../../../theme';
import { SelectField } from '../../shared/SelectField';
import { getGradesForCurriculum } from '../../../school-admin/teachers/utils/teachingEntries';
import { fetchSchoolStructure } from '../services/usersService';
import type { SchoolGrade } from '../types';

export const CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];
export const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

// IB PYP 1-5, MYP 6-10, DP 11-12; other boards (or none picked) 1-12.
export const gradesFor = (curriculum: string) =>
  curriculum ? getGradesForCurriculum(curriculum).filter((g) => GRADES.includes(g)) : GRADES;

export interface AcademicValue { curriculum: string; grade: string; section: string }

// Curriculum + grade (required for students) and section — a picklist when the school defines sections.
export function AcademicFields({ schoolId, value, onChange, s, colors }: {
  schoolId: string | null; value: AcademicValue; onChange: (v: AcademicValue) => void; s: any; colors: AppColors;
}) {
  const [grades, setGrades] = useState<SchoolGrade[]>([]);

  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching for the new school
    setGrades([]);
    if (schoolId) fetchSchoolStructure(schoolId).then((g) => { if (live) setGrades(g); }).catch(() => {});
    return () => { live = false; };
  }, [schoolId]);

  const sections = (grades.find((g) => g.name === value.grade)?.sections || []).filter((x) => !x.archived).map((x) => x.name);
  const set = (patch: Partial<AcademicValue>) => onChange({ ...value, ...patch });

  return (
    <View style={{ gap: 14 }} testID="users-academics">
      <SelectField testID="users-field-curriculum" label="Curriculum" placeholder="Select a curriculum" value={value.curriculum}
        options={CURRICULA} minWidth={0}
        onChange={(curriculum) => set(gradesFor(curriculum).includes(value.grade) ? { curriculum } : { curriculum, grade: '', section: '' })} />
      <SelectField testID="users-field-grade" label="Grade" placeholder="Select a grade" value={value.grade}
        options={gradesFor(value.curriculum)} onChange={(grade) => set({ grade, section: '' })} minWidth={0} />
      {sections.length ? (
        <SelectField testID="users-field-section" label="Section (optional)" placeholder="Select a section" value={value.section}
          options={[{ value: '', label: 'No section' }, ...sections]} onChange={(section) => set({ section })} minWidth={0} />
      ) : (
        <View style={s.field}>
          <Text style={s.label}>SECTION (OPTIONAL)</Text>
          <TextInput testID="users-field-section" style={s.input} value={value.section} placeholder="e.g. A"
            placeholderTextColor={colors.textDim} onChangeText={(section) => set({ section })} maxLength={20} />
        </View>
      )}
    </View>
  );
}
