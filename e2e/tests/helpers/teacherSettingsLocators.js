// Shared locators for TeacherSettingsScreen.tsx. testIDs used here were
// added to the screen as part of this suite (2026-08-27) - the screen
// previously had zero stable selectors, same starting state Teacher
// Schedule was in before its own suite (see teacherScheduleLocators.js).

export function openTeacherSettings(page) {
  return page.goto('/teacher/settings');
}

// ── Notifications section ──
export function notificationsSection(page) {
  return page.getByTestId('teacher-settings-notifications-section');
}

// RN Web's Switch renders testID on the outer track/thumb wrapper div — the
// real interactive element is a native <input type="checkbox" role="switch">
// nested inside it. isChecked()/toBeChecked() need that actual input.
export function notifToggle(page, key) {
  return page.getByTestId(`teacher-settings-notif-toggle-${key}`).locator('input');
}

export function notifRow(page, key) {
  return page.getByTestId(`teacher-settings-notif-row-${key}`);
}

// ── Account Settings — Display Name ──
export function nameChangeButton(page) {
  return page.getByTestId('teacher-settings-name-change-button');
}

export function nameValue(page) {
  return page.getByTestId('teacher-settings-name-change-button-value');
}

export function nameModal(page) {
  return page.getByTestId('teacher-settings-name-modal');
}

export function nameInput(page) {
  return page.getByTestId('teacher-settings-name-input');
}

export function nameSaveButton(page) {
  return page.getByTestId('teacher-settings-name-save-button');
}
