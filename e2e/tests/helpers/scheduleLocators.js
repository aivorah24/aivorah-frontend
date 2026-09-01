// Shared locators for ScheduleScreen.tsx (student "My Schedule"), confirmed
// against the real running app's DOM. All testIDs/accessibilityLabels used
// here were added to ScheduleScreen.tsx as part of this suite - the screen
// previously had no stable selectors at all.

export function openSchedule(page) {
  // Navigating via URL, not the sidebar "Schedule" link - the sidebar click
  // was flaky (something in the layout intercepts pointer events on it
  // intermittently) and direct navigation is both faster and more reliable.
  return page.goto('/schedule');
}

export function filterChip(page, key) {
  return page.getByTestId(`schedule-filter-${key}`);
}

export function hideCompletedToggle(page) {
  return page.getByTestId('schedule-hide-completed');
}

export function prevWeekButton(page) {
  return page.getByTestId('schedule-prev-week');
}

export function nextWeekButton(page) {
  return page.getByTestId('schedule-next-week');
}

export function todayButton(page) {
  return page.getByTestId('schedule-today-button');
}

export function weekLabel(page) {
  return page.getByTestId('schedule-week-label');
}

export function addEventButton(page) {
  return page.getByTestId('schedule-add-event-button');
}

export function dayColumn(page, iso) {
  return page.getByTestId(`schedule-day-col-${iso}`);
}

export function allDayColumn(page, iso) {
  return page.getByTestId(`schedule-allday-col-${iso}`);
}

export function hourSlot(page, iso, hour) {
  // hour: 'HH' 24h, e.g. '09'
  return page.getByTestId(`schedule-slot-${iso}-${hour}:00`);
}

// The modal's own root - RN's <Modal> gives a real role="dialog" for free.
export function addEventModal(page) {
  return page.getByRole('dialog');
}

export function modalTitleInput(page) {
  return page.getByTestId('schedule-modal-title-input');
}

export function modalNoteInput(page) {
  return page.getByTestId('schedule-modal-note-input');
}

export function modalTagChip(page, tagKey) {
  return page.getByTestId(`schedule-modal-tag-${tagKey}`);
}

export function modalAllDayCheckbox(page) {
  return page.getByTestId('schedule-modal-allday-checkbox');
}

export function modalCancelButton(page) {
  return page.getByTestId('schedule-modal-cancel-button');
}

export function modalConfirmButton(page) {
  return page.getByTestId('schedule-modal-confirm-button');
}

// TimePicker.tsx sets a `data-timepicker={label}` attribute in its JSX, but
// react-native-web does NOT forward that custom prop through to the actual
// DOM node on this app's RN/RNW version (confirmed by reading the live
// rendered HTML - the attribute is simply absent) - so it can't be used as a
// selector despite being in the source. Scope by the visible "Start time"/
// "End time" label text instead: each label is a sibling immediately before
// its own picker's trigger+dropdown container in the DOM.
export function startTimePicker(page) {
  return page.getByText('Start time', { exact: true }).locator('xpath=following-sibling::div[1]');
}

export function endTimePicker(page) {
  return page.getByText('End time', { exact: true }).locator('xpath=following-sibling::div[1]');
}

// Selects a time within an already-open TimePicker dropdown by its visible
// 12h label (e.g. "9:00 AM") - TimePicker.tsx's individual options have no
// testID/accessibilityLabel of their own, only the container does.
// .last() because the dropdown is appended AFTER the trigger in the DOM -
// when the current value already matches the label being selected (e.g.
// selecting the already-shown default), the trigger's own text is an
// earlier match for the same getByText() and must be excluded.
export function timePickerOption(pickerLocator, label12h) {
  return pickerLocator.getByText(label12h, { exact: true }).last();
}

export function tagFiltersToggle(page) {
  return page.getByTestId('schedule-tag-filters-toggle');
}

export function tagFilterCheckbox(page, tagKey) {
  return page.getByTestId(`schedule-tag-filter-${tagKey}`);
}

export function minicalPrevMonth(page) {
  return page.getByTestId('schedule-minical-prev-month');
}

export function minicalNextMonth(page) {
  return page.getByTestId('schedule-minical-next-month');
}

export function minicalDate(page, dStr) {
  return page.getByTestId(`schedule-minical-date-${dStr}`);
}

export function upcomingDeadlines(page) {
  return page.getByTestId('schedule-upcoming-deadlines');
}

export function deadlineItem(page, id) {
  return page.getByTestId(`schedule-deadline-${id}`);
}

// A timed event block in the grid - scoped by its title text (unique per
// test's seeded event), same pattern challengesLocators.js uses for cards.
export function eventBlock(page, title) {
  return page.getByText(title, { exact: true }).first();
}

export function eventDetailModal(page) {
  return page.getByRole('dialog');
}

export function closeEventDetailButton(page) {
  return eventDetailModal(page).getByText('Close', { exact: true });
}
