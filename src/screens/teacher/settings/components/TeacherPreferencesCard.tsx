import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import SectionHeader from './SectionHeader';
import { curriculumLabel } from '../utils/curriculumLabel';

// AI Auto-Grading / Share Progress are ENFORCED server-side — every toggle
// PATCHes immediately (see useTeacherPreferences.ts). Curriculum/grades and
// Role & Experience are read-only display here; editing curriculum opens
// the same modal the "Profile & Account" card's other fields use.
export default function TeacherPreferencesCard({
  user, autoGrading, setAutoGrading, shareProgress, setShareProgress, saveTeacherPref,
  teacherRoleVal, experienceVal, onOpenCurriculumModal,
  colors, gold, styles,
}: {
  user: any;
  autoGrading: boolean;
  setAutoGrading: (v: boolean) => void;
  shareProgress: boolean;
  setShareProgress: (v: boolean) => void;
  saveTeacherPref: (key: 'autoGrading' | 'shareProgress', value: boolean) => void;
  teacherRoleVal: string | null;
  experienceVal: string | null;
  onOpenCurriculumModal: () => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  return (
    <>
      <SectionHeader icon="settings" label="Teaching Preferences" color={colors.accentBlue} styles={styles} />
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>AI Auto-Grading</Text>
            <Text style={styles.fieldSub}>Let AI grade assignments automatically</Text>
          </View>
          <Switch testID="teacher-settings-toggle-autoGrading" value={autoGrading} onValueChange={(v) => { setAutoGrading(v); saveTeacherPref('autoGrading', v); }} trackColor={{ false: colors.borderColor, true: gold }} thumbColor="white" />
        </View>
        <View style={styles.divider} />
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Share Progress with Parents</Text>
            <Text style={styles.fieldSub}>Parents can see their child&apos;s scores and activity</Text>
          </View>
          <Switch testID="teacher-settings-toggle-shareProgress" value={shareProgress} onValueChange={(v) => { setShareProgress(v); saveTeacherPref('shareProgress', v); }} trackColor={{ false: colors.borderColor, true: gold }} thumbColor="white" />
        </View>
        <View style={styles.divider} />
        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Curriculum</Text>
            <Text style={styles.fieldSub}>{curriculumLabel(user)}</Text>
          </View>
          <TouchableOpacity style={styles.changeBtn} onPress={onOpenCurriculumModal} activeOpacity={0.7}>
            <Text style={styles.changeBtnText}>Update</Text>
          </TouchableOpacity>
        </View>
        {(teacherRoleVal || experienceVal) && (
          <>
            <View style={styles.divider} />
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Role &amp; Experience</Text>
                <Text style={styles.fieldSub}>
                  {[teacherRoleVal, experienceVal].filter(Boolean).join(' · ') || 'Not set'}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );
}
