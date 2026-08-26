import type { TeacherCourse } from '../../../../data/teacherCourses';

export function computeCourseStats(courses: TeacherCourse[]) {
  const totalLessons = courses.reduce((n, c) => n + c.lessons.length, 0);
  const totalMinutes = courses.reduce(
    (n, c) => n + c.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    0
  );
  return { totalLessons, totalMinutes };
}
