// Shared locators for TeacherLearningPathsScreen.tsx ("Learning Paths",
// under TEACHING DEVELOPMENT in the sidebar). testIDs (`teacher-learning-paths-*`)
// were added to the screen as part of this suite (2026-08-26) — the screen
// previously had zero stable selectors AND wasn't even reachable: it existed
// on disk but had no Drawer.Screen entry in TeacherNavigator.tsx, so the
// sidebar's "Learning Paths" link 404'd. That missing route was added in the
// same change as these testIDs.
//
// This screen is fully static content (course/lesson data from
// src/data/teacherCourses.ts) — no backend calls anywhere, so no seed data,
// no mutation, no account isolation concerns. Any read-only teacher account works.

export function openTeacherLearningPaths(page) {
  return page.goto('/teacher/learning-paths');
}

export function courseCard(page, courseId) {
  return page.getByTestId(`teacher-learning-paths-course-${courseId}`);
}

export function courseModal(page) {
  return page.getByTestId('teacher-learning-paths-course-modal');
}

export function courseModalClose(page) {
  return page.getByTestId('teacher-learning-paths-course-modal-close');
}

export function lessonCard(page, index) {
  return page.getByTestId(`teacher-learning-paths-lesson-${index}`);
}

export function videoSection(page, videoId) {
  return page.getByTestId(`teacher-learning-paths-video-${videoId}`);
}

export function scrollArea(page) {
  return page.getByTestId('teacher-learning-paths-scroll');
}
