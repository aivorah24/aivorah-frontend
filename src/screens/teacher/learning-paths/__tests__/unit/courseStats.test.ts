import { computeCourseStats } from '../../utils/courseStats';
import type { TeacherCourse } from '../../../../../data/teacherCourses';

function mkCourse(overrides: Partial<TeacherCourse> = {}): TeacherCourse {
  return {
    id: 'c1', icon: 'cpu', title: 'Course', desc: 'Desc',
    lessons: [{ title: 'L1', minutes: 5, body: [] }, { title: 'L2', minutes: 3, body: [] }],
    ...overrides,
  };
}

describe('computeCourseStats', () => {
  test('sums lessons and minutes across every course', () => {
    const courses = [
      mkCourse({ id: 'c1', lessons: [{ title: 'L1', minutes: 4, body: [] }] }),
      mkCourse({ id: 'c2', lessons: [{ title: 'L2', minutes: 6, body: [] }, { title: 'L3', minutes: 2, body: [] }] }),
    ];
    expect(computeCourseStats(courses)).toEqual({ totalLessons: 3, totalMinutes: 12 });
  });

  test('an empty course list returns zero for both', () => {
    expect(computeCourseStats([])).toEqual({ totalLessons: 0, totalMinutes: 0 });
  });

  test('a course with zero lessons contributes nothing but does not break the sum', () => {
    const courses = [mkCourse({ id: 'c1', lessons: [] }), mkCourse({ id: 'c2', lessons: [{ title: 'L1', minutes: 7, body: [] }] })];
    expect(computeCourseStats(courses)).toEqual({ totalLessons: 1, totalMinutes: 7 });
  });

  test('matches the real TEACHER_COURSES data — regression guard for the sidebar\'s "6 courses • N lessons" summary', () => {
    const { TEACHER_COURSES } = require('../../../../../data/teacherCourses');
    const { totalLessons, totalMinutes } = computeCourseStats(TEACHER_COURSES);
    expect(TEACHER_COURSES.length).toBe(6);
    expect(totalLessons).toBeGreaterThan(0);
    expect(totalMinutes).toBeGreaterThan(0);
  });
});
