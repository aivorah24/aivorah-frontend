import React from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Contact } from '../types';
import { renderPersonAvatar } from './PersonAvatar';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  styles: any;
  userRole: string;
  loadingContacts: boolean;
  contacts: Contact[];
  onSelectContact: (c: Contact) => void;
}

export default function ContactsModal({ visible, onClose, colors, styles, userRole, loadingContacts, contacts, onSelectContact }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View testID="messages-contacts-modal" style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {userRole === 'teacher' ? 'Message a Parent' : 'Message a Teacher'}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loadingContacts ? (
            <ActivityIndicator color={colors.accentYellow} style={{ padding: 24 }} />
          ) : contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={28} color={colors.textDim} />
              <Text style={styles.emptyText}>No contacts found</Text>
              <Text style={styles.emptySubText}>
                {userRole === 'teacher'
                  ? 'Parents will appear here once students are linked'
                  : 'Teachers will appear here once your child is linked to a teacher'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={c => c.email}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`messages-contact-${item.email}`}
                  style={styles.contactItem}
                  onPress={() => onSelectContact(item)}
                  activeOpacity={0.7}
                >
                  {renderPersonAvatar(item.name, item.role, (item as any).photoUrl, 38, false, colors)}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactContext}>{item.context}</Text>
                    <Text style={styles.contactEmail}>{item.email}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textDim} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
