import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import type { ScheduleEvent, StudentItem, TargetStudents } from '../types';
import { createEvent, updateEvent } from '../services/scheduleService';
import { deriveTypeFromTag } from '../utils/scheduleUtils';

interface UseEventFormArgs {
  todayISO: string;
  userEmail?: string;
  students: StudentItem[];
  setEventsMap: React.Dispatch<React.SetStateAction<Record<string, ScheduleEvent[]>>>;
  removeEvent: (id: string, dateStr: string) => Promise<void>;
}

export function useEventForm({ todayISO, userEmail, students, setEventsMap, removeEvent }: UseEventFormArgs) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDate, setModalDate] = useState(todayISO);
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [newType, setNewType] = useState('lesson');
  const [newTag, setNewTag] = useState('Live Class / Lesson');
  const [newNote, setNewNote] = useState('');
  const [targetStudents, setTargetStudents] = useState<TargetStudents>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [saveError, setSaveError] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  function resetModalForm() {
    setNewTitle(''); setNewNote(''); setNewTag('Live Class / Lesson');
    setSelectedStudent(null); setStudentSearch(''); setIsAllDay(false);
    setTargetStudents('all'); setEditingEventId(null);
  }

  const [studentSearch, setStudentSearch] = useState('');

  function closeModal() {
    setModalVisible(false);
    setEditingEventId(null);
  }

  function openModal(presetDate?: string, presetTime?: string, presetAllDay?: boolean, presetTag?: string) {
    setEditingEventId(null);
    setNewTitle(''); setNewNote(''); setSelectedStudent(null); setStudentSearch(''); setTargetStudents('all');
    setNewTag(presetTag || 'Live Class / Lesson');
    setModalDate(presetDate ?? todayISO);
    setIsAllDay(!!presetAllDay);
    if (presetAllDay) {
      setNewStartTime('23:59');
      setNewEndTime('23:59');
    } else if (presetTime) {
      const [h] = presetTime.split(':');
      const sh = h.padStart(2, '0');
      const eh = String(Math.min(23, parseInt(sh) + 1)).padStart(2, '0');
      setNewStartTime(`${sh}:00`);
      setNewEndTime(`${eh}:00`);
    } else {
      setNewStartTime('09:00');
      setNewEndTime('10:00');
    }
    setSaveError('');
    setModalVisible(true);
  }

  // Pre-fills the same Create Event modal from an existing event so editing
  // reuses one form instead of a second UI — saveEvent() below branches on
  // editingEventId to PATCH instead of POST.
  function openEditModal(ev: any) {
    setSelectedEvent(null);
    setEditingEventId(ev.id);
    setModalDate(ev.date);
    setNewTitle(ev.title || '');
    setNewNote(ev.note || '');
    setNewTag(ev.tag || 'Live Class / Lesson');
    const allDay = ev.startTime === '23:59';
    setIsAllDay(allDay);
    setNewStartTime(allDay ? '23:59' : ev.startTime);
    setNewEndTime(allDay ? '23:59' : (ev.endTime || ev.startTime));
    if (ev.studentId && ev.studentId !== 'all') {
      setTargetStudents('specific');
      const found = students.find(s => s.id === ev.studentId);
      setSelectedStudent(found || { id: ev.studentId, name: ev.studentName || 'Student', grade: '' });
    } else {
      setTargetStudents('all');
      setSelectedStudent(null);
    }
    setStudentSearch('');
    setSaveError('');
    setModalVisible(true);
  }

  async function saveEvent() {
    if (!newTitle.trim()) { setSaveError('Please enter an event title.'); return; }
    const assignTo = targetStudents === 'all' ? 'all' : (selectedStudent?.id ?? 'all');
    const payload = {
      title:     newTitle,
      date:      modalDate,
      startTime: isAllDay ? '23:59' : newStartTime,
      endTime:   isAllDay ? '23:59' : newEndTime,
      type:      deriveTypeFromTag(newTag),
      tag:       newTag || 'Live Class / Lesson',
      note:      newNote,
      studentId: assignTo,
    };
    setSaving(true); setSaveError('');
    try {
      if (editingEventId) {
        const res = await updateEvent(editingEventId, payload);
        if (res.ok) {
          const updated = await res.json().catch(() => null);
          const merged = (updated && updated.id) ? updated : { ...payload, id: editingEventId, createdBy: 'teacher', creatorEmail: userEmail || '' };
          setEventsMap(prev => {
            const next: Record<string, ScheduleEvent[]> = {};
            for (const key of Object.keys(prev)) next[key] = prev[key].filter(e => e.id !== editingEventId);
            next[modalDate] = [...(next[modalDate] ?? []), merged];
            return next;
          });
          resetModalForm();
          setSaving(false); setModalVisible(false);
        } else {
          const body = await res.json().catch(() => ({}));
          setSaveError(body.error ?? `Server error ${res.status}`);
          setSaving(false);
        }
      } else {
        const res = await createEvent({ ...payload, createdBy: 'teacher', creatorEmail: userEmail || '' });
        if (res.ok) {
          const ev = await res.json();
          setEventsMap(prev => ({
            ...prev,
            [modalDate]: [...(prev[modalDate] ?? []), ev],
          }));
          resetModalForm();
          setSaving(false); setModalVisible(false);
        } else {
          const body = await res.json().catch(() => ({}));
          setSaveError(body.error ?? `Server error ${res.status}`);
          setSaving(false);
        }
      }
    } catch (err: any) {
      setSaveError(err?.message ?? 'Network error — is the server running?');
      setSaving(false);
    }
  }

  // Bug #15: this used to be `Platform.OS === 'web' ? window.confirm(...) :
  // true` — on any native platform the `true` branch deleted immediately,
  // with NO confirmation shown at all. Alert.alert is a no-op on React
  // Native Web (same convention already used elsewhere in this codebase,
  // e.g. ParentSettingsScreen.tsx), so web keeps window.confirm and native
  // gets a real Alert.alert prompt.
  async function confirmDeleteEvent(ev: any) {
    const ok = await new Promise<boolean>((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(`Delete "${ev.title}"? This can't be undone.`));
        return;
      }
      Alert.alert(
        'Delete event?',
        `Delete "${ev.title}"? This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
    if (!ok) return;
    await removeEvent(ev.id, ev.date);
    setSelectedEvent(null);
  }

  return {
    modalVisible, setModalVisible, modalDate, setModalDate,
    newTitle, setNewTitle, newStartTime, setNewStartTime, newEndTime, setNewEndTime,
    isAllDay, setIsAllDay, newType, setNewType, newTag, setNewTag, newNote, setNewNote,
    targetStudents, setTargetStudents, selectedStudent, setSelectedStudent,
    saving, selectedEvent, setSelectedEvent, saveError, setSaveError,
    editingEventId, studentSearch, setStudentSearch,
    resetModalForm, closeModal, openModal, openEditModal, saveEvent, confirmDeleteEvent,
  };
}
