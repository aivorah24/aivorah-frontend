import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

export default function PickerModal({
  visible, title, data, value, formatItem, onSelect, onClose, colors,
}: {
  visible: boolean; title: string; data: number[]; value: number;
  formatItem: (v: number) => string; onSelect: (v: number) => void; onClose: () => void;
  colors: AppColors;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.pickerModal, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.borderColor }]}>
            <Text style={[styles.title, { color: colors.textMain }]}>{title}</Text>
            <TouchableOpacity testID="picker-modal-close" onPress={onClose}>
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={v => String(v)}
            style={{ maxHeight: 300 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: val }) => (
              <TouchableOpacity
                style={[styles.pickerOption, { borderBottomColor: colors.borderColor + '40' }, value === val && { backgroundColor: colors.accentYellow + '18' }]}
                onPress={() => onSelect(val)}
                activeOpacity={0.7}
              >
                <Text style={{ color: value === val ? colors.accentYellow : colors.textMain, fontWeight: value === val ? '700' : '500', fontFamily: fonts.serif, fontSize: 15 }}>
                  {formatItem(val)}
                </Text>
                {value === val && <Feather name="check" size={16} color={colors.accentYellow} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'center', alignItems: 'center' },
  pickerModal: { width: 280, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  title: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700' },
  pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
});
