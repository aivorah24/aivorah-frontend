// Shared locators for AssignmentsScreen.tsx (student "Assignments"), confirmed
// against the real running app's DOM/source. The screen had no stable
// selectors at all before this suite - testIDs below were added to
// AssignmentsScreen.tsx as part of this suite (same convention already used
// by ScheduleScreen.tsx/scheduleLocators.js).

export function openAssignments(page) {
  // Direct navigation, same reasoning as scheduleLocators.js's openSchedule:
  // faster and more reliable than clicking the sidebar link.
  return page.goto('/assignments');
}

export function statCard(page, label) {
  return page.getByTestId(`assignments-stat-${label.toLowerCase()}`);
}

export function statValue(page, label) {
  return page.getByTestId(`assignments-stat-${label.toLowerCase()}-value`);
}

export function filterTab(page, label) {
  return page.getByTestId(`assignments-filter-${label.toLowerCase()}`);
}

export function emptyState(page) {
  return page.getByTestId('assignments-empty-state');
}

export function errorState(page) {
  return page.getByTestId('assignments-error-state');
}

export function retryButton(page) {
  return page.getByTestId('assignments-retry-button');
}

export function loadingState(page) {
  return page.getByTestId('assignments-loading');
}

export function assignmentCard(page, id) {
  return page.getByTestId(`assignments-card-${id}`);
}

export function assignmentStartButton(page, id) {
  return page.getByTestId(`assignments-card-${id}-start`);
}
