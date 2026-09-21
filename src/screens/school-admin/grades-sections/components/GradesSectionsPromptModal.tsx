import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { PromptState } from '../types';

interface Props {
  prompt: PromptState;
  value: string;
  onChangeValue: (v: string) => void;
  error: string;
  busy: boolean;
  colors: AppColors;
  onClose: () => void;
  onSubmit: () => void;
}

export default function GradesSectionsPromptModal({ prompt, value, onChangeValue, error, busy, colors, onClose, onSubmit }: Props) {
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const title = prompt?.kind === 'addGrade' ? 'Add Grade'
    : prompt?.kind === 'addSection' ? `Add Section to ${prompt.grade}`
    : prompt?.kind === 'renameGrade' ? `Rename ${prompt.grade}` : '';
  const placeholder = prompt?.kind === 'addSection' ? 'e.g. B' : prompt?.kind === 'addGrade' ? 'e.g. Grade 7' : 'New name';

  return (
    <Modal visible={!!prompt} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Text style={styles.promptTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={value}
            onChangeText={onChangeValue}
            style={styles.promptInput}
            placeholder={placeholder}
            placeholderTextColor={colors.textDim}
            autoFocus
            onSubmitEditing={onSubmit}
          />
          {prompt?.kind === 'renameGrade' && (
            <Text style={styles.promptHint}>Every student currently in this grade will be updated to the new name.</Text>
          )}
          {!!error && <Text style={styles.promptErr}>{error}</Text>}
          <View style={styles.promptFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.saveBtnText}>{prompt?.kind === 'renameGrade' ? 'Rename' : 'Add'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    promptCard: { backgroundColor: colors.cardDark, borderRadius: 18, borderWidth: 1, borderColor: colors.borderColor, padding: 22, width: '100%', maxWidth: 380 },
    promptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    promptTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.textHeading, flexShrink: 1 },
    promptInput: {
      fontFamily: fonts.serif, fontSize: 14, color: colors.textMain,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.bgDark,
    },
    promptHint: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 8, lineHeight: 16 },
    promptErr: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentRed, marginTop: 8 },
    promptFooter: { flexDirection: 'row', gap: 10, marginTop: 18 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    cancelBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textMuted },
    saveBtn: { flex: 1, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    saveBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
  });
}
