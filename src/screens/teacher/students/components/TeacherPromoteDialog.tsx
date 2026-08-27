import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Student } from '../types';
import { IB_PROGRAMS } from '../constants';
import { gradeNum, gradesForProgram } from '../utils/studentDisplay';
import { dialogStyles } from '../styles';

export default function TeacherPromoteDialog({ visible, selectedStudents, colors, onClose, onConfirm }: {
  visible: boolean; selectedStudents: Student[]; colors: AppColors;
  onClose: () => void; onConfirm: (targetGrade: string, targetSection: string) => Promise<string | null>;
}) {
  const gold = colors.accentYellow;
  const [targetGrade, setTargetGrade] = useState('');
  const [targetProgram, setTargetProgram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Reset the form fields whenever the dialog opens — adjusted during render
  // (React's documented "adjusting state when a prop changes" pattern)
  // instead of an effect.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) { setTargetGrade(''); setTargetProgram(''); setErr(''); }
  }

  const currentGrades = useMemo(() => Array.from(new Set(selectedStudents.map((s) => s.grade).filter(Boolean))), [selectedStudents]);
  const maxCurrentGradeNum = useMemo(() => {
    const nums = currentGrades.map(gradeNum).filter((n): n is number => n !== null);
    return nums.length ? Math.max(...nums) : null;
  }, [currentGrades]);
  const isIBSelection = useMemo(
    () => selectedStudents.some((s) => (s.curriculum || '').toUpperCase().startsWith('IB')),
    [selectedStudents]
  );
  const gradeChoices = useMemo(() => {
    const pool = isIBSelection
      ? (targetProgram ? gradesForProgram(targetProgram) : [])
      : ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    if (maxCurrentGradeNum === null) return pool;
    return pool.filter((g) => {
      const n = gradeNum(g);
      return n === null || n > maxCurrentGradeNum;
    });
  }, [isIBSelection, targetProgram, maxCurrentGradeNum]);

  async function handleConfirm() {
    if (!targetGrade.trim()) { setErr('Pick a target grade.'); return; }
    setErr('');
    setSubmitting(true);
    const error = await onConfirm(targetGrade.trim(), '');
    setSubmitting(false);
    if (error) setErr(error);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dialogStyles.overlay}>
        <View testID="teacher-students-promote-dialog" style={[dialogStyles.card, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={dialogStyles.header}>
            <Text style={[dialogStyles.title, { color: colors.textHeading }]}>Promote Students</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <Text style={[dialogStyles.hint, { color: colors.textDim }]}>
            {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'} selected · currently {currentGrades.length > 0 ? currentGrades.join(', ') : 'an unset grade'}
          </Text>

          {isIBSelection && (
            <>
              <Text style={[dialogStyles.label, { color: colors.textMuted }]}>Target programme</Text>
              <View style={dialogStyles.chipRow}>
                {IB_PROGRAMS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    testID={`teacher-students-promote-program-${p.toLowerCase().replace(/\s+/g, '-')}`}
                    style={[dialogStyles.chip, { borderColor: colors.borderColor }, targetProgram === p && { borderColor: gold, backgroundColor: gold + '18' }]}
                    onPress={() => { setTargetProgram(p); setTargetGrade(''); }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: targetProgram === p ? gold : colors.textMuted }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={[dialogStyles.label, { color: colors.textMuted }]}>Target grade</Text>
          {gradeChoices.length > 0 ? (
            <View style={dialogStyles.chipRow}>
              {gradeChoices.map((g) => (
                <TouchableOpacity
                  key={g}
                  testID={`teacher-students-promote-grade-${g.toLowerCase().replace(/\s+/g, '-')}`}
                  style={[dialogStyles.chip, { borderColor: colors.borderColor }, targetGrade === g && { borderColor: gold, backgroundColor: gold + '18' }]}
                  onPress={() => setTargetGrade(g)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: targetGrade === g ? gold : colors.textMuted }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: colors.textDim, marginBottom: 8 }}>
              {isIBSelection && !targetProgram ? 'Pick a programme above to see its grades.' : 'No higher grade available.'}
            </Text>
          )}

          {!!err && <Text testID="teacher-students-promote-error" style={{ color: colors.accentRed, fontSize: 12, marginTop: 8 }}>{err}</Text>}

          <View style={dialogStyles.footer}>
            <TouchableOpacity testID="teacher-students-promote-dialog-cancel" style={[dialogStyles.cancelBtn, { borderColor: colors.borderColor }]} onPress={onClose} disabled={submitting}>
              <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="teacher-students-promote-dialog-confirm"
              style={[dialogStyles.submitBtn, { backgroundColor: gold }, (submitting || !targetGrade.trim()) && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={submitting || !targetGrade.trim()}
            >
              {submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={{ color: '#0B0B0B', fontWeight: '700', fontSize: 13 }}>Promote</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
