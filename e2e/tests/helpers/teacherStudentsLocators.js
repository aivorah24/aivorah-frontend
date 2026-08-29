// Shared locators for TeacherStudentsScreen.tsx ("Students"). All testIDs
// used here were added to the screen as part of this suite (2026-08-25) -
// the screen previously had zero stable selectors.
//
// testID prefix `teacher-students-*`, following the same convention as
// teacherScheduleLocators.js.

export function openTeacherStudents(page) {
  return page.goto('/teacher/students');
}

export function addStudentButton(page) {
  return page.getByTestId('teacher-students-add-button');
}

export function promoteModeButton(page) {
  return page.getByTestId('teacher-students-promote-mode-button');
}

export function promoteCancelButton(page) {
  return page.getByTestId('teacher-students-promote-cancel');
}

export function promoteBar(page) {
  return page.getByTestId('teacher-students-promote-bar');
}

export function promoteConfirmButton(page) {
  return page.getByTestId('teacher-students-promote-confirm-button');
}

export function statCard(page, label) {
  return page.getByTestId(`teacher-students-stat-${label.toLowerCase().replace(/\s+/g, '-')}`);
}

export function searchInput(page) {
  return page.getByTestId('teacher-students-search-input');
}

export function filterTab(page, label) {
  return page.getByTestId(`teacher-students-tab-${label.toLowerCase().replace(/\s+/g, '-')}`);
}

export function emptyState(page) {
  return page.getByTestId('teacher-students-empty-state');
}

export function emptyAddButton(page) {
  return page.getByTestId('teacher-students-empty-add-button');
}

export function studentCard(page, studentId) {
  return page.getByTestId(`teacher-students-card-${studentId}`);
}

export function removeButton(page, studentId) {
  return page.getByTestId(`teacher-students-remove-${studentId}`);
}

// ── Add Student modal ───────────────────────────────────────────────────

export function addModal(page) {
  return page.getByTestId('teacher-students-add-modal');
}

export function addModalClose(page) {
  return page.getByTestId('teacher-students-add-modal-close');
}

export function modalTab(page, tab) {
  return page.getByTestId(`teacher-students-tab-${tab}`); // 'create' | 'link' | 'bulk'
}

// Create New tab
export function createNameInput(page) {
  return page.getByTestId('teacher-students-create-name-input');
}

export function createEmailInput(page) {
  return page.getByTestId('teacher-students-create-email-input');
}

export function createPasswordInput(page) {
  return page.getByTestId('teacher-students-create-password-input');
}

export function createGradeOption(page, grade) {
  return page.getByTestId(`teacher-students-create-grade-${grade.toLowerCase().replace(/\s+/g, '-')}`);
}

export function createCurriculumOption(page, curriculum) {
  return page.getByTestId(`teacher-students-create-curriculum-${curriculum.toLowerCase().replace(/\s+/g, '-')}`);
}

export function createError(page) {
  return page.getByTestId('teacher-students-create-error');
}

export function createSubmitButton(page) {
  return page.getByTestId('teacher-students-create-submit-button');
}

// Link Existing tab
export function linkSearchInput(page) {
  return page.getByTestId('teacher-students-link-search-input');
}

export function linkableStudentOption(page, studentId) {
  return page.getByTestId(`teacher-students-linkable-${studentId}`);
}

export function linkError(page) {
  return page.getByTestId('teacher-students-link-error');
}

export function linkSubmitButton(page) {
  return page.getByTestId('teacher-students-link-submit-button');
}

// Bulk Import tab
export function bulkFileInput(page) {
  return page.locator('[data-testid="teacher-students-bulk-file-input"]');
}

export function bulkTemplateCsvButton(page) {
  return page.getByTestId('teacher-students-bulk-template-csv');
}

export function bulkTemplateXlsxButton(page) {
  return page.getByTestId('teacher-students-bulk-template-xlsx');
}

export function bulkChooseFileButton(page) {
  return page.getByTestId('teacher-students-bulk-choose-file-button');
}

export function bulkRow(page, rowIndex) {
  return page.getByTestId(`teacher-students-bulk-row-${rowIndex}`);
}

export function bulkError(page) {
  return page.getByTestId('teacher-students-bulk-error');
}

export function bulkPreviewCancelButton(page) {
  return page.getByTestId('teacher-students-bulk-preview-cancel');
}

export function bulkCommitButton(page) {
  return page.getByTestId('teacher-students-bulk-commit-button');
}

// ── Credentials modal ────────────────────────────────────────────────────

export function credsModal(page) {
  return page.getByTestId('teacher-students-creds-modal');
}

export function credsDoneButton(page) {
  return page.getByTestId('teacher-students-creds-done-button');
}

// ── Promote dialog ───────────────────────────────────────────────────────

export function promoteDialog(page) {
  return page.getByTestId('teacher-students-promote-dialog');
}

export function promoteDialogProgram(page, program) {
  return page.getByTestId(`teacher-students-promote-program-${program.toLowerCase().replace(/\s+/g, '-')}`);
}

export function promoteDialogGrade(page, grade) {
  return page.getByTestId(`teacher-students-promote-grade-${grade.toLowerCase().replace(/\s+/g, '-')}`);
}

export function promoteDialogError(page) {
  return page.getByTestId('teacher-students-promote-error');
}

export function promoteDialogCancel(page) {
  return page.getByTestId('teacher-students-promote-dialog-cancel');
}

export function promoteDialogConfirm(page) {
  return page.getByTestId('teacher-students-promote-dialog-confirm');
}
