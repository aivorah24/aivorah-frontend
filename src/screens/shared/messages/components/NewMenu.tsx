import React from 'react';
import { View, Modal, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  styles: any;
  position: { top: number; left: number };
  onSelectDm: () => void;
  onSelectChannel: () => void;
}

// ── New (chooser) — teachers/admins pick New chat or New channel ──
export default function NewMenu({ visible, onClose, colors, styles, position, onSelectDm, onSelectChannel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.chMenuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.chMenu, { top: position.top, left: position.left }]}>
          <TouchableOpacity testID="messages-new-dm-option" style={styles.chMenuItem} onPress={onSelectDm}>
            <Feather name="message-circle" size={16} color={colors.accentYellow} /><Text style={styles.chMenuText}>New direct message</Text>
          </TouchableOpacity>
          <View style={styles.chMenuDivider} />
          <TouchableOpacity testID="messages-new-channel-option" style={styles.chMenuItem} onPress={onSelectChannel}>
            <Feather name="users" size={16} color={colors.accentYellow} /><Text style={styles.chMenuText}>New group channel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
