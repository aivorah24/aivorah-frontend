import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import TimePicker from '../../../../components/common/TimePicker';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../constants';
import type { StudentItem, TargetStudents } from '../types';

interface Props {
  colors: AppColors;
  gold: string;
  styles: any;
  modalVisible: boolean;
  closeModal: () => void;
  editingEventId: string | null;
  modalDate: string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  newNote: string;
  setNewNote: (v: string) => void;
  newTag: string;
  setNewTag: (v: string) => void;
  isAllDay: boolean;
  setIsAllDay: (v: boolean) => void;
  newStartTime: string;
  setNewStartTime: (v: string) => void;
  newEndTime: string;
  setNewEndTime: (v: string) => void;
  targetStudents: TargetStudents;
  setTargetStudents: (v: TargetStudents) => void;
  selectedStudent: StudentItem | null;
  setSelectedStudent: (s: StudentItem | null) => void;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  filteredStudents: StudentItem[];
  students: StudentItem[];
  saveError: string;
  setSaveError: (v: string) => void;
  saving: boolean;
  saveEvent: () => void;
}

export default function EventFormModal(props: Props) {
  const {
    colors, gold, styles, modalVisible, closeModal, editingEventId, modalDate,
    newTitle, setNewTitle, newNote, setNewNote, newTag, setNewTag,
    isAllDay, setIsAllDay, newStartTime, setNewStartTime, newEndTime, setNewEndTime,
    targetStudents, setTargetStudents, selectedStudent, setSelectedStudent,
    studentSearch, setStudentSearch, filteredStudents, students,
    saveError, setSaveError, saving, saveEvent,
  } = props;

  return (
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeModal}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modal, { display: 'flex', flexDirection: 'column' }]}>
          {/* Top Fixed Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 12, marginBottom: 12 }}>
            <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{editingEventId ? 'Edit Event' : 'Create Event'} — {modalDate}</Text>
            <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
            <TextInput
              testID="teacher-schedule-modal-title-input"
              style={[styles.modalInput, saveError && !newTitle.trim() && { borderColor: colors.accentRed }]}
              placeholder="Event title *"
              placeholderTextColor={saveError && !newTitle.trim() ? colors.accentRed : colors.textDim}
              value={newTitle}
              onChangeText={(t) => { setNewTitle(t); if (t.trim()) setSaveError(''); }}
            />
            <TextInput
              testID="teacher-schedule-modal-note-input"
              style={[styles.modalInput, { fontSize: 12 }]}
              placeholder="Note for students (optional)..."
              placeholderTextColor={colors.textDim}
              value={newNote}
              onChangeText={setNewNote}
            />
            <Text style={styles.modalLabel}>Category / Tagline * (Links directly to Tag Filters):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
              {ASSIGNMENT_TAGS.concat(EVENT_TAGS).map(t => (
                <TouchableOpacity
                  key={t.key}
                  testID={`teacher-schedule-modal-tag-${t.key}`}
                  style={[
                    styles.timeChip,
                    { flexDirection: 'row', alignItems: 'center' },
                    newTag === t.key && { borderColor: t.color, backgroundColor: t.color + '26', borderWidth: 1.5 }
                  ]}
                  onPress={() => setNewTag(t.key)}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color, marginRight: 6 }} />
                  <Text style={[styles.timeChipText, newTag === t.key && { color: colors.textMain, fontWeight: '700' }]}>{t.key}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              testID="teacher-schedule-modal-allday-checkbox"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginTop: 4 }}
              onPress={() => {
                const next = !isAllDay;
                setIsAllDay(next);
                if (next) {
                  setNewStartTime('23:59');
                  setNewEndTime('23:59');
                  if (!newTag || newTag === 'Live Class / Lesson') setNewTag('Holidays and vacations');
                } else {
                  setNewStartTime('09:00');
                  setNewEndTime('10:00');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
                borderColor: isAllDay ? gold : colors.borderColor,
                backgroundColor: isAllDay ? gold : 'transparent',
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
                <TimePicker label="Start time" value={newStartTime} onChange={(v) => {
                  setNewStartTime(v);
                  if (v >= newEndTime) {
                    const [h, m] = v.split(':').map(Number);
                    const end = new Date(0, 0, 0, h, m + 30);
                    setNewEndTime(`${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`);
                  }
                }} />
                <TimePicker label="End time" value={newEndTime} onChange={setNewEndTime} minTime={newStartTime} />
              </View>
            )}

            {/* Assign to */}
            <Text style={styles.modalLabel}>Assign to:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                testID="teacher-schedule-modal-target-all"
                style={[styles.timeChip, targetStudents === 'all' && styles.timeChipActive]}
                onPress={() => { setTargetStudents('all'); setSelectedStudent(null); }}
              >
                <Text style={[styles.timeChipText, targetStudents === 'all' && { color: gold }]}>All students</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="teacher-schedule-modal-target-specific"
                style={[styles.timeChip, targetStudents === 'specific' && styles.timeChipActive]}
                onPress={() => setTargetStudents('specific')}
              >
                <Text style={[styles.timeChipText, targetStudents === 'specific' && { color: gold }]}>Specific student</Text>
              </TouchableOpacity>
            </View>

            {targetStudents === 'specific' && (
              <View style={styles.studentPickerBox}>
                {selectedStudent ? (
                  <TouchableOpacity style={styles.selectedStudentChip} onPress={() => setSelectedStudent(null)} activeOpacity={0.7}>
                    <Feather name="user" size={13} color={gold} />
                    <Text style={styles.selectedStudentName}>{selectedStudent.name}</Text>
                    <Text style={styles.selectedStudentGrade}>{selectedStudent.grade}</Text>
                    <Feather name="x" size={13} color={colors.textDim} />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TextInput
                      testID="teacher-schedule-modal-student-search"
                      style={styles.studentSearch}
                      placeholder="Search student by name..."
                      placeholderTextColor={colors.textDim}
                      value={studentSearch}
                      onChangeText={setStudentSearch}
                    />
                    <ScrollView style={styles.studentList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {filteredStudents.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12 }}>
                          <Feather name="users" size={28} color={colors.textDim} style={{ marginBottom: 8 }} />
                          <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>
                            {students.length === 0 ? 'No students linked yet' : 'No matching students'}
                          </Text>
                          {students.length === 0 && (
                            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                              Go to the Students tab to add students to your class.
                            </Text>
                          )}
                        </View>
                      ) : (
                        filteredStudents.map(s => (
                          <TouchableOpacity
                            key={s.id}
                            testID={`teacher-schedule-modal-student-${s.id}`}
                            style={styles.studentRow}
                            onPress={() => { setSelectedStudent(s); setStudentSearch(''); }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.studentAvatar}>
                              <Text style={styles.studentAvatarText}>{s.name?.[0] ?? '?'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.studentRowName}>{s.name}</Text>
                              <Text style={styles.studentRowGrade}>{s.grade}</Text>
                            </View>
                            <Feather name="chevron-right" size={14} color={colors.textDim} />
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            {saveError ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={13} color={colors.accentRed} />
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Fixed Footer (Always visible without scrolling) */}
          <View style={[styles.modalBtns, { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor, marginTop: 12 }]}>
            <TouchableOpacity testID="teacher-schedule-modal-cancel-button" style={styles.modalCancel} onPress={closeModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="teacher-schedule-modal-confirm-button" style={styles.modalConfirm} onPress={saveEvent} disabled={saving}>
              <Text style={styles.modalConfirmText}>{saving ? 'Saving…' : (editingEventId ? 'Save Changes' : 'Create Event')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
