import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { SelectedEventDetail } from '../types';
import { toTitleCase } from '../utils/dateHelpers';

interface Props {
  selectedEvent: SelectedEventDetail | null;
  onClose: () => void;
  onNavigate: (screen: 'Challenges' | 'Assignments', params?: any) => void;
  styles: any;
  colors: AppColors;
}

export default function EventDetailModal({ selectedEvent, onClose, onNavigate, styles, colors }: Props) {
  return (
    <Modal visible={!!selectedEvent} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modal, { borderLeftWidth: 4, borderLeftColor: selectedEvent?.accent || colors.accentYellow }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={[styles.modalTitle, { flex: 1 }]}>{selectedEvent ? toTitleCase(selectedEvent.title) : ''}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          {selectedEvent?.assignmentId && (selectedEvent?.type === 'deadline' || selectedEvent?.type === 'challenge') ? (
            <>
              {selectedEvent?.createdAt ? (
                <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 6 }}>
                  Assigned {new Date(selectedEvent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(selectedEvent.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              ) : null}
              <Text style={{ fontSize: 12, fontWeight: '700', color: selectedEvent?.accent || colors.accentYellow, marginTop: 4 }}>
                Closes {new Date(selectedEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {selectedEvent.startTime}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: selectedEvent?.accent || colors.accentYellow, marginTop: 4 }}>
              {selectedEvent?.startTime}{selectedEvent?.endTime ? ` – ${selectedEvent.endTime}` : ''}
            </Text>
          )}
          {selectedEvent?.note ? (
            <View style={{ marginTop: 12, backgroundColor: colors.bgDark, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.borderColor }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Note</Text>
              <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 19 }}>{selectedEvent.note}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 12, fontStyle: 'italic' }}>No note added for this event.</Text>
          )}
          {selectedEvent?.assignmentId && !selectedEvent?.isTimetableClass && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.accentYellow,
                borderRadius: radius.md,
                paddingVertical: 11,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 14,
              }}
              onPress={() => onNavigate(
                selectedEvent?.type === 'challenge' ? 'Challenges' : 'Assignments',
                selectedEvent?.type === 'challenge'
                  ? { challengeId: selectedEvent.assignmentId }
                  : { assignmentId: selectedEvent.assignmentId }
              )}
            >
              <Feather name="external-link" size={16} color={colors.bgDark} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.bgDark }}>
                {selectedEvent?.type === 'challenge' ? 'Open Challenge' : 'Open Assignment Worksheet'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={[styles.modalBtns, { justifyContent: 'center', marginTop: 4 }]}>
            <TouchableOpacity style={[styles.modalConfirm, { flex: 0, paddingHorizontal: 32 }]} onPress={onClose}>
              <Text style={styles.modalConfirmText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
