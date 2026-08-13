import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

export function SectionHeader({ icon, label, color, styles }: { icon: any; label: string; color: string; styles: any }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Feather name={icon} size={15} color={color} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

export function AppModal({ visible, title, onClose, children, styles, colors, testID }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; styles: any; colors: AppColors; testID?: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox} testID={testID}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} testID={testID ? `${testID}-close-button` : undefined}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function ModalButtons({ onCancel, onSave, loading, saveLabel = 'Save Changes', cancelLabel = 'Cancel', styles, testIDPrefix }: { onCancel: () => void; onSave: () => void; loading: boolean; saveLabel?: string; cancelLabel?: string; styles: any; testIDPrefix?: string }) {
  return (
    <View style={styles.modalBtns}>
      <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} testID={testIDPrefix ? `${testIDPrefix}-cancel-button` : undefined}>
        <Text style={styles.modalCancelText}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.modalSaveBtn} onPress={onSave} disabled={loading} testID={testIDPrefix ? `${testIDPrefix}-save-button` : undefined}>
        {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>{saveLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}
