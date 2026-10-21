import React from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppModal } from './shared';

interface GradeModalProps {
  visible: boolean;
  onClose: () => void;
  grades: string[];
  selectedGrade: string;
  setSelectedGrade: (v: string) => void;
  gradeLoading: boolean;
  onSave: () => void;
  error?: string | null;
  colors: any;
  styles: any;
}

export default function GradeModal({ visible, onClose, grades, selectedGrade, setSelectedGrade, gradeLoading, onSave, error, colors, styles }: GradeModalProps) {
  return (
    <AppModal visible={visible} title="Update Grade / Year" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-grade">
      <Text style={[styles.modalNote, { marginBottom: 12 }]}>Select your current grade. The dashboard will update automatically.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {grades.map(g => {
          const active = selectedGrade === g;
          return (
            <TouchableOpacity
              key={g}
              testID={`settings-modal-grade-option-${g}`}
              onPress={() => setSelectedGrade(g)}
              style={{
                width: '22%',
                paddingVertical: 9,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: active ? colors.accentYellow : colors.borderColor,
                backgroundColor: active ? colors.accentYellow + '20' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: active ? colors.accentYellow : colors.textMuted, fontWeight: active ? '700' : '400', fontSize: 12.5 }} numberOfLines={1}>{g}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!error && (
        <Text testID="settings-modal-grade-error" style={{ color: colors.accentRed || '#D9534F', fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>{error}</Text>
      )}
      <View style={styles.modalBtns}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} testID="settings-modal-grade-cancel-button">
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="settings-modal-grade-save-button"
          style={[styles.modalSaveBtn, (!selectedGrade || gradeLoading || !!error) && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={!selectedGrade || gradeLoading || !!error}
        >
          {gradeLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}
