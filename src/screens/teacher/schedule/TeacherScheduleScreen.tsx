import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';

import { TIMES, HOUR_HEIGHT } from './constants';
import { useScheduleScroll } from '../../../hooks/useScheduleScroll';
import { makeStyles } from './styles';
import { useScheduleEvents } from './hooks/useScheduleEvents';
import { useStudents } from './hooks/useStudents';
import { useWeekNav } from './hooks/useWeekNav';
import { useTagFilters } from './hooks/useTagFilters';
import { useEventForm } from './hooks/useEventForm';
import { useDragToMove } from './hooks/useDragToMove';
import { useDragToCreate } from './hooks/useDragToCreate';
import WeekNavBar from './components/WeekNavBar';
import CalendarGrid from './components/CalendarGrid';
import EventFormModal from './components/EventFormModal';
import EventDetailModal from './components/EventDetailModal';

export default function TeacherScheduleScreen({ navigation }: any) {
  const { colors } = useTheme();
  const gold = colors.accentYellow;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();

  // Shared between the week-scroll effect and the initial data fetch so the
  // "scroll to today's column" behavior only fires once, on first load —
  // same dual-purpose ref the monolithic screen used.
  const firstLoadDoneRef = useRef(false);

  const scrollToNowRef = useRef<((animated?: boolean) => void) | null>(null);
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const { week, todayISO, weekBase, setWeekBase, colWidth, hScrollRef, goToday, onGridContentSizeChange, scrollToCurrentTime } =
    useWeekNav(firstLoadDoneRef, scrollToNowRef, gridWidth);

  const { eventsMap, setEventsMap, loading, nowTime, removeEvent } =
    useScheduleEvents(week, user?.email, firstLoadDoneRef);

  const { students } = useStudents(user?.email);

  const { passesTagFilter, allDayHeight } = useTagFilters(eventsMap, week);

  const form = useEventForm({
    todayISO,
    userEmail: user?.email,
    students,
    setEventsMap,
    removeEvent,
  });

  const { startDrag, wasDragRef } = useDragToMove(setEventsMap);
  const { dragPreviewTeacher, makeOnMouseDown } = useDragToCreate({
    setModalDate: form.setModalDate,
    setNewStartTime: form.setNewStartTime,
    setNewEndTime: form.setNewEndTime,
    setModalVisible: form.setModalVisible,
  });

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      s.name?.toLowerCase().includes(form.studentSearch.toLowerCase()) ||
      s.grade?.toLowerCase().includes(form.studentSearch.toLowerCase())
    ),
    [students, form.studentSearch]
  );

  const gridHeight = TIMES.length * HOUR_HEIGHT;
  const { scrollRef: scheduleScrollRef, onGridLayout: onScheduleGridLayout, scrollToNow: scrollScheduleToNow } = useScheduleScroll({ ready: !loading, allDayHeight, hourHeight: HOUR_HEIGHT, pinnedHeader: Platform.OS === 'web' });
  useEffect(() => { scrollToNowRef.current = scrollScheduleToNow; });

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        {/* Header row with + New Event button */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Header title="Class Schedule" subtitle="Create sessions and deadlines for students." />
          </View>
          <TouchableOpacity testID="teacher-schedule-add-event-button" style={styles.addEventBtnTop} onPress={() => form.openModal()} activeOpacity={0.8}>
            <Feather name="plus" size={15} color="white" />
            <Text style={styles.addEventBtnTopText}>New Event</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scheduleScrollRef} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Feather name="info" size={14} color={colors.accentCyan} />
            <Text style={styles.infoText}>Events you create here are visible to students and parents in their Schedule screen.</Text>
          </View>

          {/* ── Week navigation bar ── */}
          <WeekNavBar colors={colors} styles={styles} week={week} weekBase={weekBase} setWeekBase={setWeekBase} goToday={goToday} />

          {/* ── Grid: fixed time labels + horizontally scrollable day columns ── */}
          {loading ? (
            <ActivityIndicator size="large" color={gold} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.mainLayout} onLayout={(e) => { onScheduleGridLayout(e); setGridWidth(e.nativeEvent.layout.width); }}>
              <CalendarGrid
                colors={colors}
                gold={gold}
                styles={styles}
                week={week}
                todayISO={todayISO}
                eventsMap={eventsMap}
                passesTagFilter={passesTagFilter}
                allDayHeight={allDayHeight}
                colWidth={colWidth}
                gridHeight={gridHeight}
                hScrollRef={hScrollRef}
                onGridContentSizeChange={onGridContentSizeChange}
                nowTime={nowTime}
                students={students}
                dragPreviewTeacher={dragPreviewTeacher}
                makeOnMouseDown={makeOnMouseDown}
                startDrag={startDrag}
                wasDragRef={wasDragRef}
                removeEvent={removeEvent}
                openModal={form.openModal}
                setSelectedEvent={form.setSelectedEvent}
                onDayHeaderPress={() => scrollToCurrentTime()}
              />

            </View>
          )}
        </ScrollView>

        {/* ── Create / Edit Event Modal ── */}
        <EventFormModal
          colors={colors}
          gold={gold}
          styles={styles}
          modalVisible={form.modalVisible}
          closeModal={form.closeModal}
          editingEventId={form.editingEventId}
          modalDate={form.modalDate}
          newTitle={form.newTitle}
          setNewTitle={form.setNewTitle}
          newNote={form.newNote}
          setNewNote={form.setNewNote}
          newTag={form.newTag}
          setNewTag={form.setNewTag}
          isAllDay={form.isAllDay}
          setIsAllDay={form.setIsAllDay}
          newStartTime={form.newStartTime}
          setNewStartTime={form.setNewStartTime}
          newEndTime={form.newEndTime}
          setNewEndTime={form.setNewEndTime}
          targetStudents={form.targetStudents}
          setTargetStudents={form.setTargetStudents}
          selectedStudent={form.selectedStudent}
          setSelectedStudent={form.setSelectedStudent}
          studentSearch={form.studentSearch}
          setStudentSearch={form.setStudentSearch}
          filteredStudents={filteredStudents}
          students={students}
          saveError={form.saveError}
          setSaveError={form.setSaveError}
          saving={form.saving}
          saveEvent={form.saveEvent}
        />

        {/* ── Event Detail Modal — view, edit, or delete an event ── */}
        <EventDetailModal
          colors={colors}
          gold={gold}
          styles={styles}
          selectedEvent={form.selectedEvent}
          setSelectedEvent={form.setSelectedEvent}
          openEditModal={form.openEditModal}
          confirmDeleteEvent={form.confirmDeleteEvent}
        />
      </View>
    </ScreenLayout>
  );
}
