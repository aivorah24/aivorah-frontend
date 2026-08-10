import { useState } from 'react';
import { deriveTypeFromTag } from '../utils/dateHelpers';

export function useAddEventModal({
  todayISO,
  addEvent,
}: {
  todayISO: string;
  addEvent: (payload: {
    title: string; date: string; startTime: string; endTime: string;
    type: string; tag: string; note: string;
  }) => Promise<any>;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDate, setModalDate] = useState(todayISO);
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [newTag, setNewTag] = useState('Study Session');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  function openSlotModal(dateISO: string, timeLabel?: string, presetAllDay?: boolean, presetTag?: string) {
    setModalDate(dateISO);
    setIsAllDay(!!presetAllDay);
    if (presetTag) setNewTag(presetTag);
    if (presetAllDay) {
      setNewStartTime('23:59');
      setNewEndTime('23:59');
    } else if (timeLabel) {
      const [h] = timeLabel.split(':');
      const startH = h.padStart(2, '0');
      const endH = String(Math.min(23, parseInt(startH) + 1)).padStart(2, '0');
      setNewStartTime(`${startH}:00`);
      setNewEndTime(`${endH}:00`);
    } else {
      setNewStartTime('09:00');
      setNewEndTime('10:00');
    }
    setModalVisible(true);
  }

  function openDragModal(dayIso: string, startT: string, endT: string) {
    setModalDate(dayIso);
    setNewStartTime(startT);
    setNewEndTime(endT);
    setModalVisible(true);
  }

  function openNewEventModal() {
    setModalDate(todayISO);
    setNewStartTime('09:00');
    setNewEndTime('10:00');
    setModalVisible(true);
  }

  function toggleAllDay() {
    const next = !isAllDay;
    setIsAllDay(next);
    if (next) {
      setNewStartTime('23:59');
      setNewEndTime('23:59');
      if (!newTag || newTag === 'Study Session') setNewTag('Holidays and vacations');
    } else {
      setNewStartTime('09:00');
      setNewEndTime('10:00');
    }
  }

  function onStartTimeChange(v: string) {
    setNewStartTime(v);
    if (v >= newEndTime) {
      const [h, m] = v.split(':').map(Number);
      const end = new Date(0, 0, 0, h, m + 30);
      setNewEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    }
  }

  async function confirmAddEvent() {
    if (!newTitle.trim()) return;
    setSaving(true);
    await addEvent({
      title: newTitle,
      date: modalDate,
      startTime: isAllDay ? '23:59' : newStartTime,
      endTime: isAllDay ? '23:59' : newEndTime,
      type: deriveTypeFromTag(newTag),
      tag: newTag || 'Study Session',
      note: newNote,
    });
    setNewTitle(''); setNewNote(''); setNewTag('Study Session'); setIsAllDay(false); setSaving(false); setModalVisible(false);
  }

  return {
    modalVisible, setModalVisible, modalDate,
    newTitle, setNewTitle, newStartTime, newEndTime, isAllDay,
    newTag, setNewTag, newNote, setNewNote, saving,
    openSlotModal, openDragModal, openNewEventModal,
    toggleAllDay, onStartTimeChange, setNewEndTime,
    confirmAddEvent,
  };
}
