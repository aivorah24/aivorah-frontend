// Shared locators for TeacherScheduleScreen.tsx ("Class Schedule"). All
// testIDs used here were added to the screen as part of this suite (2026-08-25)
// - the screen previously had zero stable selectors, unlike the student
// ScheduleScreen.tsx this mirrors (see scheduleLocators.js).
//
// Distinct testID prefix (`teacher-schedule-*` vs student's `schedule-*`) so
// the two screens' selectors can never collide if a test somehow renders both.

export function openTeacherSchedule(page) {
  return page.goto('/teacher/schedule');
}

export function addEventButton(page) {
  return page.getByTestId('teacher-schedule-add-event-button');
}

export function prevWeekButton(page) {
  return page.getByTestId('teacher-schedule-prev-week');
}

export function nextWeekButton(page) {
  return page.getByTestId('teacher-schedule-next-week');
}

export function todayButton(page) {
  return page.getByTestId('teacher-schedule-today-button');
}

export function weekLabel(page) {
  return page.getByTestId('teacher-schedule-week-label');
}

export function dayColumn(page, iso) {
  return page.getByTestId(`teacher-schedule-day-col-${iso}`);
}

export function allDayColumn(page, iso) {
  return page.getByTestId(`teacher-schedule-allday-col-${iso}`);
}

// hour: 'HH' 24h, e.g. '09' - TIMES entries are 'HH:00' in the source.
export function hourSlot(page, iso, hour) {
  return page.getByTestId(`teacher-schedule-slot-${iso}-${hour}:00`);
}

// RN's <Modal> gives a real role="dialog" for free - both the Create/Edit
// modal and the Detail modal render one, so scope by content when both
// COULD be open (they never are simultaneously in practice, since opening
// one via openEditModal() explicitly nulls selectedEvent/closes the other).
export function createEventModal(page) {
  return page.getByRole('dialog');
}

export function eventDetailModal(page) {
  return page.getByRole('dialog');
}

export function modalTitleInput(page) {
  return page.getByTestId('teacher-schedule-modal-title-input');
}

export function modalNoteInput(page) {
  return page.getByTestId('teacher-schedule-modal-note-input');
}

export function modalTagChip(page, tagKey) {
  return page.getByTestId(`teacher-schedule-modal-tag-${tagKey}`);
}

export function modalAllDayCheckbox(page) {
  return page.getByTestId('teacher-schedule-modal-allday-checkbox');
}

export function modalTargetAllButton(page) {
  return page.getByTestId('teacher-schedule-modal-target-all');
}

export function modalTargetSpecificButton(page) {
  return page.getByTestId('teacher-schedule-modal-target-specific');
}

export function modalStudentSearch(page) {
  return page.getByTestId('teacher-schedule-modal-student-search');
}

export function modalStudentOption(page, studentId) {
  return page.getByTestId(`teacher-schedule-modal-student-${studentId}`);
}

export function modalCancelButton(page) {
  return page.getByTestId('teacher-schedule-modal-cancel-button');
}

export function modalConfirmButton(page) {
  return page.getByTestId('teacher-schedule-modal-confirm-button');
}

// TimePicker.tsx's custom `data-timepicker` attribute isn't forwarded to the
// DOM on this app's RN/RNW version (confirmed in scheduleLocators.js's own
// note for the student screen, same component) - scope by the visible
// "Start time"/"End time" label text instead.
export function startTimePicker(page) {
  return page.getByText('Start time', { exact: true }).locator('xpath=following-sibling::div[1]');
}

export function endTimePicker(page) {
  return page.getByText('End time', { exact: true }).locator('xpath=following-sibling::div[1]');
}

export function timePickerOption(pickerLocator, label12h) {
  return pickerLocator.getByText(label12h, { exact: true }).last();
}

// A timed event block in the grid - scoped by its stable per-event testID
// (unlike the student locator's text-based fallback, the teacher screen's
// event <div> already carries a unique data-testid keyed by the real event
// id, which is more precise once the id is known from a setup API call).
export function eventBlockById(page, eventId) {
  return page.getByTestId(`teacher-schedule-event-${eventId}`);
}

export function eventBlockByTitle(page, title) {
  return page.getByText(title, { exact: true }).first();
}

export function eventDeleteButton(page, eventId) {
  return page.getByTestId(`teacher-schedule-event-delete-${eventId}`);
}

export function editEventButton(page) {
  return page.getByLabel('Edit event');
}

export function deleteEventButton(page) {
  return page.getByLabel('Delete event');
}

export function closeDetailButton(page) {
  return page.getByLabel('Close');
}

export function tagFiltersToggle(page) {
  return page.getByTestId('teacher-schedule-tag-filters-toggle');
}

export function tagFilterCheckbox(page, tagKey) {
  return page.getByTestId(`teacher-schedule-tag-filter-${tagKey}`);
}
