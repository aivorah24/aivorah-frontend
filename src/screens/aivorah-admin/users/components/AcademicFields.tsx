import React, { useEffect, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import type { AppColors } from '../../../../theme';
import { SelectField } from '../../shared/SelectField';
import { fetchSchoolStructure } from '../services/usersService';
import type { SchoolGrade } from '../types';

export const CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];
export const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

export interface AcademicValue { curriculum: string; grade: string; section: string }

// Curriculum + grade (required for students) and section — a picklist when the school defines sections.
export function AcademicFields({ schoolId, value, onChange, s, colors }: {
  schoolId: string | null; value: AcademicValue; onChange: (v: AcademicValue) => void; s: any; colors: AppColors;
}) {
  const [grades, setGrades] = useState<SchoolGrade[]>([]);

  useEffect(() => {
    let live = true;
    setGrades([]);
    if (schoolId) fetchSchoolStructure(schoolId).then((g) => { if (live) setGrades(g); }).catch(() => {});
    return () => { live = false; };
  }, [schoolId]);

  const sections = (grades.find((g) => g.name === value.grade)?.sections || []).filter((x) => !x.archived).map((x) => x.name);
  const set = (patch: Partial<AcademicValue>) => onChange({ ...value, ...patch });

  return (
    <View style={{ gap: 14 }} testID="users-academics">
      <SelectField testID="users-field-curriculum" label="Curriculum" placeholder="Select a curriculum" value={value.curriculum}
        options={CURRICULA} onChange={(curriculum) => set({ curriculum })} minWidth={0} />
      <SelectField testID="users-field-grade" label="Grade" placeholder="Select a grade" value={value.grade}
        options={GRADES} onChange={(grade) => set({ grade, section: '' })} minWidth={0} />
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
