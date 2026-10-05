import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import TimePicker from '../../../../components/common/TimePicker';
import { STUDENT_EVENT_TAGS } from '../constants';

interface Props {
  visible: boolean;
  modalDate: string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  newNote: string;
  setNewNote: (v: string) => void;
  newTag: string;
  setNewTag: (v: string) => void;
  isAllDay: boolean;
  newStartTime: string;
  newEndTime: string;
  setNewEndTime: (v: string) => void;
  saving: boolean;
  onToggleAllDay: () => void;
  onStartTimeChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  styles: any;
  colors: AppColors;
}

export default function AddEventModal({
  visible, modalDate, newTitle, setNewTitle, newNote, setNewNote, newTag, setNewTag,
  isAllDay, newStartTime, newEndTime, setNewEndTime, saving,
  onToggleAllDay, onStartTimeChange, onClose, onConfirm, styles, colors,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modal, { display: 'flex', flexDirection: 'column' }]}>
          {/* Top Fixed Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 12, marginBottom: 12 }}>
            <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Add Event — {modalDate}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
            <TextInput
              style={styles.modalInput}
              placeholder="Event title..."
              placeholderTextColor={colors.textDim}
              value={newTitle}
              onChangeText={setNewTitle}
              accessibilityLabel="Event title"
              testID="schedule-modal-title-input"
            />
            <TextInput
              style={[styles.modalInput, { fontSize: 12 }]}
              placeholder="Note (optional)..."
              placeholderTextColor={colors.textDim}
              value={newNote}
              onChangeText={setNewNote}
              accessibilityLabel="Event note"
              testID="schedule-modal-note-input"
            />
            <Text style={styles.modalLabel}>Category / Tagline * (Links directly to Tag Filters):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
              {STUDENT_EVENT_TAGS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.timeChip,
                    { flexDirection: 'row', alignItems: 'center' },
                    newTag === t.key && { borderColor: t.color, backgroundColor: t.color + '26', borderWidth: 1.5 }
                  ]}
                  onPress={() => setNewTag(t.key)}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${t.key}`}
                  accessibilityState={{ selected: newTag === t.key }}
                  testID={`schedule-modal-tag-${t.key}`}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color, marginRight: 6 }} />
                  <Text style={[styles.timeChipText, newTag === t.key && { color: colors.textMain, fontWeight: '700' }]}>{t.key}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginTop: 4 }}
              onPress={onToggleAllDay}
              activeOpacity={0.8}
              accessible
              accessibilityRole="checkbox"
              accessibilityLabel="All-day event"
              accessibilityState={{ checked: isAllDay }}
              testID="schedule-modal-allday-checkbox"
            >
              <View style={{
                width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
                borderColor: isAllDay ? colors.accentYellow : colors.borderColor,
                backgroundColor: isAllDay ? colors.accentYellow : 'transparent',
                alignItems: 'center', justifyContent: 'center'
              }}>
                {isAllDay && <Feather name="check" size={13} color="white" />}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>
                All-day event (Holiday / Vacation / Assembly / Timeline)
              </Text>
            </TouchableOpacity>
            {!isAllDay && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, zIndex: 100 }}>
                <TimePicker label="Start time" value={newStartTime} onChange={onStartTimeChange} placement="top" />
                <TimePicker label="End time" value={newEndTime} onChange={setNewEndTime} minTime={newStartTime} placement="top" />
              </View>
            )}
          </ScrollView>

          {/* Bottom Fixed Footer (Always visible without scrolling) */}
          <View style={[styles.modalBtns, { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor, marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="schedule-modal-cancel-button"
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalConfirm}
              onPress={onConfirm}
              disabled={saving}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Confirm Add Event"
              testID="schedule-modal-confirm-button"
            >
              <Text style={styles.modalConfirmText}>{saving ? 'Saving…' : 'Add Event'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
