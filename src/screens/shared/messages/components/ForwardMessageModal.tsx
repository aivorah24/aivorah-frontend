import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Channel } from '../../../../features/channels/api/channelsApi';
import type { Contact, Message } from '../types';
import { parseContent } from '../utils/messageFormat';

interface Props {
  forwardMsg: Message | null;
  onClose: () => void;
  colors: AppColors;
  styles: any;
  loadingContacts: boolean;
  channels: Channel[];
  contacts: Contact[];
  onForwardToConvo: (email: string, name: string) => void;
  onForwardToChannel: (id: string) => void;
}

export default function ForwardMessageModal({
  forwardMsg, onClose, colors, styles, loadingContacts, channels, contacts,
  onForwardToConvo, onForwardToChannel,
}: Props) {
  return (
    <Modal visible={!!forwardMsg} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Forward to…</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {!!forwardMsg && (
            <View style={styles.forwardPreview}>
              <Text style={styles.forwardPreviewText} numberOfLines={2}>{parseContent(forwardMsg.content).text || 'Attachment'}</Text>
            </View>
          )}
          <ScrollView style={{ maxHeight: 360 }}>
            {loadingContacts && <ActivityIndicator color={colors.accentYellow} style={{ padding: 24 }} />}
            {!!channels.length && (
              <>
                <Text style={styles.forwardSectionLabel}>Channels</Text>
                {channels.map((ch) => (
                  <TouchableOpacity key={ch.id} style={styles.contactItem} activeOpacity={0.7} onPress={() => onForwardToChannel(ch.id)}>
                    <View style={styles.contactAvatar}><Feather name="users" size={16} color={colors.accentYellow} /></View>
                    <Text style={styles.contactName}>{ch.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            {!!contacts.length && (
              <>
                <Text style={styles.forwardSectionLabel}>People</Text>
                {contacts.map((c) => (
                  <TouchableOpacity key={c.email} style={styles.contactItem} activeOpacity={0.7} onPress={() => onForwardToConvo(c.email, c.name)}>
                    <View style={styles.contactAvatar}><Feather name="user" size={16} color={colors.accentYellow} /></View>
                    <Text style={styles.contactName}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            {!loadingContacts && !contacts.length && !channels.length && (
              <Text style={{ padding: 16, color: colors.textDim, fontSize: 12.5 }}>No contacts to forward to yet.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
