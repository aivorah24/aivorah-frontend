import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { AddTab } from '../../types';
import CreateStudentTab from './CreateStudentTab';
import LinkExistingTab from './LinkExistingTab';
import BulkImportTab from './BulkImportTab';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  gold: string;
  isDark: boolean;
  styles: any;
  addTab: AddTab;
  onSelectCreateTab: () => void;
  onSelectLinkTab: () => void;
  onSelectBulkTab: () => void;
  createProps: React.ComponentProps<typeof CreateStudentTab>;
  linkProps: React.ComponentProps<typeof LinkExistingTab>;
  bulkProps: React.ComponentProps<typeof BulkImportTab>;
}

export default function AddStudentModal({
  visible, onClose, colors, gold, styles, addTab,
  onSelectCreateTab, onSelectLinkTab, onSelectBulkTab,
  createProps, linkProps, bulkProps,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View testID="teacher-students-add-modal" style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: gold + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="user-plus" size={16} color={gold} />
              </View>
              <Text style={styles.modalTitle}>Add Student</Text>
            </View>
            <TouchableOpacity testID="teacher-students-add-modal-close" onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.modalTabs}>
            <TouchableOpacity
              testID="teacher-students-tab-create"
              style={[styles.modalTab, addTab === 'create' && styles.modalTabActive]}
              onPress={onSelectCreateTab}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={13} color={addTab === 'create' ? gold : colors.textMuted} />
              <Text style={[styles.modalTabText, addTab === 'create' && { color: gold }]}>Create New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="teacher-students-tab-link"
              style={[styles.modalTab, addTab === 'link' && styles.modalTabActive]}
              onPress={onSelectLinkTab}
              activeOpacity={0.8}
            >
              <Feather name="link" size={13} color={addTab === 'link' ? gold : colors.textMuted} />
              <Text style={[styles.modalTabText, addTab === 'link' && { color: gold }]}>Link Existing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="teacher-students-tab-bulk"
              style={[styles.modalTab, addTab === 'bulk' && styles.modalTabActive]}
              onPress={onSelectBulkTab}
              activeOpacity={0.8}
            >
              <Feather name="upload" size={13} color={addTab === 'bulk' ? gold : colors.textMuted} />
              <Text style={[styles.modalTabText, addTab === 'bulk' && { color: gold }]}>Bulk Import</Text>
            </TouchableOpacity>
          </View>

          {addTab === 'create' && <CreateStudentTab {...createProps} />}
          {addTab === 'link' && <LinkExistingTab {...linkProps} />}
          {addTab === 'bulk' && <BulkImportTab {...bulkProps} />}
        </View>
      </View>
    </Modal>
  );
}
