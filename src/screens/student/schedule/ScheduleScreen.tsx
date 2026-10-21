import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useStudentData } from '../../../context/StudentDataContext';
import { useNotification } from '../../../context/NotificationContext';
import SCHEDULE_SERVER_URL from '../../../config/scheduleServerUrl';
import { authHeader } from '../../../services/authHeader';

import type { ScheduleEvent, SelectedEventDetail } from './types';
import { useScheduleEvents } from './hooks/useScheduleEvents';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useScheduleScroll } from '../../../hooks/useScheduleScroll';
import { HOUR_HEIGHT } from './constants';
import { useTagFilters } from './hooks/useTagFilters';
import { useDragToCreate } from './hooks/useDragToCreate';
import { useAddEventModal } from './hooks/useAddEventModal';
import { useBrowserNotifications } from './hooks/useBrowserNotifications';
import { typeColors } from './utils/dateHelpers';

import FilterBar from './components/FilterBar';
import WeekNavBar from './components/WeekNavBar';
import CalendarGrid from './components/CalendarGrid';
import MiniCalendar from './components/MiniCalendar';
import UpcomingDeadlines from './components/UpcomingDeadlines';
import AddEventModal from './components/AddEventModal';
import EventDetailModal from './components/EventDetailModal';

export default function ScheduleScreen({ navigation, route }: any) {
  const highlightId = route?.params?.highlightId;
  const { colors } = useTheme();
  const { clearUnreadEvents } = useNotification();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { studentId } = useStudentData();

  const scrollToNowRef = useRef<((animated?: boolean) => void) | null>(null);
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const {
    today, todayISO, weekBase, week,
    calYear, calMonth, calWeeks,
    colWidth, gridHeight,
    hScrollRef, didInitialScrollRef,
    prevWeek, nextWeek, goToday, prevMonth, nextMonth, selectDate,
    scrollToToday,
  } = useWeekNavigation(scrollToNowRef, gridWidth);

  const {
    filterType, setFilterType, hideCompleted, setHideCompleted, passesTagFilter,
  } = useTagFilters();

  const {
    eventsMap, deadlines, eventDates, loading,
    addEvent, removeEvent,
  } = useScheduleEvents({ studentId, week, calYear, calMonth, hideCompleted, clearUnreadEvents });

  useBrowserNotifications(eventsMap);

  // Event detail modal — shows the full title/time/note when tapping an event block
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventDetail | null>(null);

  const {
    modalVisible, setModalVisible, modalDate,
    newTitle, setNewTitle, newStartTime, newEndTime, isAllDay,
    newTag, setNewTag, newNote, setNewNote, saving,
    openSlotModal, openDragModal, openNewEventModal,
    toggleAllDay, onStartTimeChange, setNewEndTime,
    confirmAddEvent,
  } = useAddEventModal({ todayISO, addEvent });

  const { dragPreview, handleColMouseDown } = useDragToCreate({
    onQuickCreate: (dayIso, startT) => openSlotModal(dayIso, startT),
    onDragCreate: (dayIso, startT, endT) => openDragModal(dayIso, startT, endT),
  });

  // Compute all-day lane height from events — avoids onLayout feedback loop
  const allDayHeight = useMemo(() => {
    const max = Math.max(
      1,
      ...week.map((d) =>
        (eventsMap[d.iso] ?? []).filter((e) => {
          if (hideCompleted && e.isCompleted) return false;
          if (filterType === 'study' || filterType === 'classes') return false;
          if (!passesTagFilter(e)) return false;
          const tagLower = (e.tag || '').toLowerCase();
          const isEventTag = ['holiday', 'vacation', 'assembly', 'timeline', 'whole school', 'rotation', 'cycle'].some((k) => tagLower.includes(k));
          return e.startTime === '23:59' || e.isAllDay || e.type === 'deadline' || e.type === 'challenge' || isEventTag;
        }).length
      )
    );
    return Math.max(36, max * 26 + 10);
  }, [eventsMap, week, hideCompleted, filterType, passesTagFilter]);
  const { scrollRef: scheduleScrollRef, onGridLayout: onScheduleGridLayout, scrollToNow: scrollScheduleToNow } = useScheduleScroll({ ready: !loading, allDayHeight, hourHeight: HOUR_HEIGHT, pinnedHeader: Platform.OS === 'web' });
  useEffect(() => { scrollToNowRef.current = scrollScheduleToNow; });

  function handleEventPress(event: ScheduleEvent, [accent, fill, textCol]: [string, string, string]) {
    setSelectedEvent({ ...event, accent, fill, textCol });
  }

  // Deep-link open: a tapped event notification passes highlightId (the real
  // schedule_events.id). The visible week's eventsMap often won't contain it
  // (the event may be outside the currently-displayed week), so fetch it
  // directly by id instead of searching what's already loaded. Clearing the
  // param prevents reopening on refocus.
  useEffect(() => {
    if (!highlightId) return;
    let cancelled = false;
    authHeader().then(headers => fetch(`${SCHEDULE_SERVER_URL}/schedule/event/${highlightId}`, { headers }))
      .then(r => (r.ok ? r.json() : null))
      .then((event: ScheduleEvent | null) => {
        if (cancelled || !event) return;
        handleEventPress(event, typeColors(event.type));
        navigation.setParams?.({ highlightId: undefined });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [highlightId]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Header
              title="My Schedule"
              subtitle="Stay organized and hit your goals."
              searchPlaceholder="Search schedule or tasks..."
              onMenuPress={() => navigation.openDrawer()}
            />
          </View>
          <TouchableOpacity
            testID="schedule-add-event-button"
            accessibilityRole="button"
            accessibilityLabel="Add Event"
            style={styles.addEventBtnTop}
            onPress={openNewEventModal}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={15} color="white" />
            <Text style={styles.addEventBtnTopText}>New Event</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scheduleScrollRef} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <FilterBar
            filterType={filterType}
            setFilterType={setFilterType}
            hideCompleted={hideCompleted}
            setHideCompleted={setHideCompleted}
            styles={styles}
            colors={colors}
          />

          <WeekNavBar
            week={week}
            onPrevWeek={prevWeek}
            onNextWeek={nextWeek}
            onToday={goToday}
            styles={styles}
            colors={colors}
          />

          <View style={styles.mainLayout} onLayout={(e) => { onScheduleGridLayout(e); setGridWidth(e.nativeEvent.layout.width); }}>
            <CalendarGrid
              loading={loading}
              week={week}
              todayISO={todayISO}
              eventsMap={eventsMap}
              hideCompleted={hideCompleted}
              filterType={filterType}
              passesTagFilter={passesTagFilter}
              allDayHeight={allDayHeight}
              gridHeight={gridHeight}
              colWidth={colWidth}
              hScrollRef={hScrollRef}
              didInitialScrollRef={didInitialScrollRef}
              scrollToToday={scrollToToday}
              dragPreview={dragPreview}
              onColMouseDown={handleColMouseDown}
              onAllDaySlotPress={(dayIso) => openSlotModal(dayIso, undefined, true, 'Holidays and vacations')}
              onEventPress={handleEventPress}
              onRemoveEvent={removeEvent}
              styles={styles}
              colors={colors}
            />

          </View>

          {/* Month view and deadlines sit under the full-width calendar. */}
          <View style={styles.belowRow}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <MiniCalendar
                calYear={calYear}
                calMonth={calMonth}
                calWeeks={calWeeks}
                todayISO={todayISO}
                week={week}
                eventDates={eventDates}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onSelectDate={selectDate}
                styles={styles}
                colors={colors}
              />

            </View>
            <View style={{ flex: 2, minWidth: 280 }}>
              <UpcomingDeadlines deadlines={deadlines} styles={styles} colors={colors} />
            </View>
          </View>
        </ScrollView>

        <AddEventModal
          visible={modalVisible}
          modalDate={modalDate}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newNote={newNote}
          setNewNote={setNewNote}
          newTag={newTag}
          setNewTag={setNewTag}
          isAllDay={isAllDay}
          newStartTime={newStartTime}
          newEndTime={newEndTime}
          setNewEndTime={setNewEndTime}
          saving={saving}
          onToggleAllDay={toggleAllDay}
          onStartTimeChange={onStartTimeChange}
          onClose={() => setModalVisible(false)}
          onConfirm={confirmAddEvent}
          styles={styles}
          colors={colors}
        />

        <EventDetailModal
          selectedEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onNavigate={(screen, params) => { setSelectedEvent(null); navigation.navigate(screen, params); }}
          styles={styles}
          colors={colors}
        />
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen:  { flex: 1, backgroundColor: c.bgDark },
  scroll:  { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 40 },

  // Filters & Toggles
  filterBar: { marginBottom: spacing.lg },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
  },
  filterChipActive: {
    backgroundColor: c.accentYellow + '20', borderColor: c.accentYellow,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  filterChipTextActive: { color: c.accentYellow, fontWeight: '700' },
  toggleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
  },
  toggleChipActive: {
    backgroundColor: c.accentYellow + '18', borderColor: c.accentYellow,
  },
  toggleChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },

  // Week nav
  weekNavBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.xl,
  },
  navArrow:     { padding: spacing.sm },
  todayBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor,
  },
  todayBtnText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  weekLabel:    { flex: 1, fontSize: 13, fontWeight: '700', color: c.textMain, textAlign: 'center' },

  // Layout
  mainLayout:        { flexDirection: 'row', gap: spacing.xl },
  calendarContainer: { flex: 1 },
  belowRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, marginTop: spacing.xl },

  timeColHeader: { height: 60 }, // matches dayHeader height so time labels align with grid
  // Day header row (above grid)
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.borderColor,
    marginBottom: 0,
  },
  dayHeader: {
    height: 60, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dayHeaderLabel: { fontSize: 10, fontWeight: '700', color: c.textDim, letterSpacing: 0.5 },
  dayHeaderLabelToday: { color: c.accentYellow },
  dayHeaderCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dayHeaderCircleToday: { backgroundColor: c.accentYellow },
  dayHeaderDate:      { fontSize: 14, fontWeight: '700', color: c.textMuted },
  dayHeaderDateToday: { color: 'white' },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.textDim },

  // All-day row (deadline/challenge chips, above the hourly grid)
  allDayRow: { flexDirection: 'row', minHeight: 32, borderBottomWidth: 1, borderBottomColor: c.borderColor },
  allDayCol: { paddingHorizontal: 3, paddingVertical: 4, gap: 3, minHeight: 32 },
  allDayGutter: { minHeight: 32, borderBottomWidth: 1, borderBottomColor: c.borderColor, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  allDayGutterText: { fontSize: 8, fontWeight: '700', color: c.textDim, textAlign: 'center', letterSpacing: 0.3, lineHeight: 10, textTransform: 'uppercase' },
  allDayChip: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  allDayChipText: { flex: 1, fontSize: 10, fontWeight: '700' },

  // Grid
  dayCol: { position: 'relative', borderLeftWidth: 1, borderLeftColor: c.borderColor + '50' },
  hourCell: {
    position: 'absolute', left: 0, right: 0, height: 56,
    borderTopWidth: 1, borderTopColor: c.borderColor + '40',
  },
  timeLabel: { fontSize: 10, color: c.textDim, fontWeight: '600', textAlign: 'right', paddingRight: 6 },

  // Event blocks
  eventBlock: {
    position: 'absolute', left: 2, right: 2,
    borderLeftWidth: 3, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 3,
    overflow: 'hidden',
  },
  eventTitle: { fontSize: 11, fontWeight: '600', color: '#ffffff' },
  eventTime:  { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  deleteBtn:  { position: 'absolute', top: 3, right: 3 },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.xl },
  addEventBtnTop: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.accentYellow, paddingHorizontal: spacing.lg,
    paddingVertical: 9, borderRadius: radius.lg,
  },
  addEventBtnTopText: { fontSize: 13, fontWeight: '700', color: 'white' },
  emptyText:    { fontSize: 12, color: c.textMuted, marginTop: 8 },

  // Sidebar
  sideCard:      { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, padding: spacing.lg },
  calHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  calMonth:      { fontSize: 13, fontWeight: '700', color: c.textMain },
  calDayHeaders: { flexDirection: 'row', marginBottom: spacing.sm },
  calDayHeader:  { flex: 1, fontSize: 10, color: c.textDim, textAlign: 'center', fontWeight: '600' },
  calWeek:       { flexDirection: 'row', marginBottom: 4 },
  calDate:       { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 6, gap: 2 },
  calDateToday:          { backgroundColor: c.accentYellow },
  calDateWeekHighlight:  { backgroundColor: c.accentYellow + '15' },
  calDateText:           { fontSize: 12, color: c.textMuted, fontWeight: '500' },
  calDateTextToday:      { color: 'white', fontWeight: '700' },
  calDot:        { width: 4, height: 4, borderRadius: 2 },
  sideTitle:     { fontSize: 14, fontWeight: '700', color: c.textMain },
  deadlineItem:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  deadlineIcon:  { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  deadlineTitle: { fontSize: 12, fontWeight: '600', color: c.textMain },
  deadlineDue:   { fontSize: 11 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    width: '90%', maxWidth: 480, backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md,
  },
  modalTitle:       { fontSize: 17, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif },
  modalInput:       { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, padding: spacing.md, color: c.textMain, fontSize: 14 },
  modalLabel:       { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  chipRow:          {},
  chipRowContent:   {},
  timeChip:         { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor, marginRight: 6 },
  timeChipActive:   { borderColor: c.accentYellow + '50', backgroundColor: c.accentYellow + '15' },
  timeChipText:     { fontSize: 12, color: c.textMuted },
  modalBtns:        { flexDirection: 'row', gap: spacing.md },
  modalCancel:      { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center' },
  modalCancelText:  { fontSize: 13, fontWeight: '600', color: c.textMuted },
  modalConfirm:     { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: c.accentYellow, alignItems: 'center' },
  modalConfirmText: { fontSize: 13, fontWeight: '700', color: 'white' },
});
