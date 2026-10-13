import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { isRealStudentEmail } from '../../utils/studentDisplay';

interface Props {
  colors: AppColors;
  gold: string;
  styles: any;
  allowedGrades: string[];
  allowedCurricula: string[];
  newName: string; setNewName: (v: string) => void;
  newEmail: string; setNewEmail: (v: string) => void;
  newPassword: string; setNewPassword: (v: string) => void;
  newGrade: string; setNewGrade: (v: string) => void;
  newCurriculum: string; setNewCurriculum: (v: string) => void;
  creating: boolean;
  createError: string;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function CreateStudentTab({
  colors, gold, styles, allowedGrades, allowedCurricula,
  newName, setNewName, newEmail, setNewEmail, newPassword, setNewPassword,
  newGrade, setNewGrade, newCurriculum, setNewCurriculum,
  creating, createError, onCancel, onSubmit,
}: Props) {
  const invite = isRealStudentEmail(newEmail);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.modalFieldLabel}>Full Name *</Text>
      <View style={styles.modalInput}>
        <Feather name="user" size={14} color={colors.textDim} />
        <TextInput
          testID="teacher-students-create-name-input"
          style={styles.modalTextInput}
          value={newName} onChangeText={setNewName}
          placeholder="e.g. Aanya Kapoor" placeholderTextColor={colors.textDim}
          autoCapitalize="words" autoFocus
        />
      </View>

      <Text style={styles.modalFieldLabel}>Email <Text style={{ fontWeight: '400', color: colors.textDim }}>(optional — auto-generated if blank)</Text></Text>
      <View style={styles.modalInput}>
        <Feather name="mail" size={14} color={colors.textDim} />
        <TextInput
          testID="teacher-students-create-email-input"
          style={styles.modalTextInput}
          value={newEmail} onChangeText={setNewEmail}
          placeholder="Leave blank to auto-generate" placeholderTextColor={colors.textDim}
          keyboardType="email-address" autoCapitalize="none"
        />
      </View>

      {invite ? (
        <Text testID="teacher-students-create-invite-note" style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
          We&apos;ll email this student an invite to set their password and verify their email. They can sign in once verified.
        </Text>
      ) : (
        <>
          <Text style={styles.modalFieldLabel}>Password <Text style={{ fontWeight: '400', color: colors.textDim }}>(optional)</Text></Text>
          <View style={styles.modalInput}>
            <Feather name="lock" size={14} color={colors.textDim} />
            <TextInput
              testID="teacher-students-create-password-input"
              style={styles.modalTextInput}
              value={newPassword} onChangeText={setNewPassword}
              placeholder="Leave blank to auto-generate" placeholderTextColor={colors.textDim}
              secureTextEntry
            />
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalFieldLabel}>Grade</Text>
          {allowedGrades.map(g => (
            <TouchableOpacity
              key={g} activeOpacity={0.8}
              testID={`teacher-students-create-grade-${g.toLowerCase().replace(/\s+/g, '-')}`}
              onPress={() => setNewGrade(g)}
              style={[styles.modalOption, { borderColor: newGrade === g ? gold : colors.borderColor, backgroundColor: newGrade === g ? gold + '18' : 'transparent' }]}
            >
              <Text style={{ fontSize: 12, color: newGrade === g ? gold : colors.textMuted, fontWeight: '600' }}>{g}</Text>
              {newGrade === g && <Feather name="check" size={12} color={gold} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalFieldLabel}>Curriculum</Text>
          {allowedCurricula.map(c => (
            <TouchableOpacity
              key={c} activeOpacity={0.8}
              testID={`teacher-students-create-curriculum-${c.toLowerCase().replace(/\s+/g, '-')}`}
              onPress={() => setNewCurriculum(c)}
              disabled={allowedCurricula.length <= 1}
              style={[styles.modalOption, { borderColor: newCurriculum === c ? gold : colors.borderColor, backgroundColor: newCurriculum === c ? gold + '18' : 'transparent' }]}
            >
              <Text style={{ fontSize: 12, color: newCurriculum === c ? gold : colors.textMuted, fontWeight: '600', flex: 1 }}>{c}</Text>
              {newCurriculum === c && <Feather name={allowedCurricula.length <= 1 ? 'lock' : 'check'} size={11} color={gold} />}
            </TouchableOpacity>
          ))}
          <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 5, lineHeight: 14 }}>
            {allowedCurricula.length > 1 ? 'Pick the curriculum for this student.' : 'Matches your curriculum. Contact admin to change.'}
          </Text>
        </View>
      </View>

      {createError ? <Text testID="teacher-students-create-error" style={{ color: colors.accentRed, fontSize: 13 }}>{createError}</Text> : null}

      <View style={styles.modalBtns}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="teacher-students-create-submit-button" style={styles.modalSaveBtn} onPress={onSubmit} disabled={creating}>
          {creating
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={styles.modalSaveText}>{invite ? 'Create & Send Invite' : 'Create Account'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
