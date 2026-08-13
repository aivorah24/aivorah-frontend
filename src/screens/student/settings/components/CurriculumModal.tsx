import React from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppModal } from './shared';
import { CURRICULA } from '../../../onboarding/OnboardingScreen';

interface CurriculumModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCurriculum: string;
  setSelectedCurriculum: (v: string) => void;
  curriculumLoading: boolean;
  onSave: () => void;
  colors: any;
  styles: any;
}

export default function CurriculumModal({ visible, onClose, selectedCurriculum, setSelectedCurriculum, curriculumLoading, onSave, colors, styles }: CurriculumModalProps) {
  return (
    <AppModal visible={visible} title="Change Curriculum" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-curriculum">
      <Text style={[styles.modalNote, { marginBottom: 12 }]}>Select the curriculum you follow. Your learning paths and content will update accordingly.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {CURRICULA.map(c => {
          const active = selectedCurriculum === c;
          return (
            <TouchableOpacity
              key={c}
              testID={`settings-modal-curriculum-option-${c}`}
              onPress={() => setSelectedCurriculum(c)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: active ? colors.accentYellow : colors.borderColor,
                backgroundColor: active ? colors.accentYellow + '20' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: active ? colors.accentYellow : colors.textMuted, fontWeight: active ? '700' : '400', fontSize: 12.5 }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.modalBtns}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} testID="settings-modal-curriculum-cancel-button">
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="settings-modal-curriculum-save-button"
          style={[styles.modalSaveBtn, (!selectedCurriculum || curriculumLoading) && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={!selectedCurriculum || curriculumLoading}
        >
          {curriculumLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}
