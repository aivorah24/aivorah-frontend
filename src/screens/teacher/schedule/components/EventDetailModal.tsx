import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface Props {
  colors: AppColors;
  gold: string;
  styles: any;
  selectedEvent: any | null;
  setSelectedEvent: (e: any | null) => void;
  openEditModal: (ev: any) => void;
  confirmDeleteEvent: (ev: any) => void;
}

export default function EventDetailModal({ colors, gold, styles, selectedEvent, setSelectedEvent, openEditModal, confirmDeleteEvent }: Props) {
  return (
    <Modal visible={!!selectedEvent} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedEvent(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modal, { borderLeftWidth: 4, borderLeftColor: selectedEvent?.accent || gold }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={[styles.modalTitle, { flex: 1 }]}>{selectedEvent?.title ?? ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 8 }}>
              <TouchableOpacity onPress={() => selectedEvent && openEditModal(selectedEvent)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Edit event">
                <Feather name="edit-2" size={16} color={colors.textDim} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectedEvent && confirmDeleteEvent(selectedEvent)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Delete event">
                <Feather name="trash-2" size={16} color={colors.accentRed} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedEvent(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close">
                <Feather name="x" size={18} color={colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>
          {selectedEvent?.createdAt ? (
            <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 6 }}>
              Assigned {new Date(selectedEvent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(selectedEvent.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12, fontWeight: '700', color: selectedEvent?.accent || gold, marginTop: 4 }}>
            Closes {selectedEvent?.date ? new Date(selectedEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} at {selectedEvent?.startTime}
          </Text>
          {selectedEvent?.note ? (
            <View style={{ marginTop: 12, backgroundColor: colors.bgDark, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.borderColor }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Note</Text>
              <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 19 }}>{selectedEvent.note}</Text>
            </View>
          ) : null}
          <View style={[styles.modalBtns, { justifyContent: 'center' }]}>
            <TouchableOpacity style={[styles.modalConfirm, { flex: 0, paddingHorizontal: 32 }]} onPress={() => setSelectedEvent(null)}>
              <Text style={styles.modalConfirmText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
