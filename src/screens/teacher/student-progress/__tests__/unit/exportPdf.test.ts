import { Platform } from 'react-native';
import type { RosterStudent } from '../../types';

// The integration test's "Export report does not crash" assertion never
// actually exercises the PDF-building code — Platform.OS isn't 'web' in
// that test environment, so exportStudentProgressPdf short-circuits before
// touching jsPDF at all. This test forces Platform.OS to 'web' (a plain
// mutable property, not a getter, so direct assignment works — no need to
// mock the whole 'react-native' module) and mocks every jsPDF method the
// real implementation calls, so a typo like `doc.setFillColor is not a
// function` actually gets caught.
Platform.OS = 'web';

const mockDoc = {
  internal: { pageSize: { getHeight: () => 297, getWidth: () => 210 } },
  setFont: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(), setFillColor: jest.fn(),
  setDrawColor: jest.fn(), setLineWidth: jest.fn(),
  text: jest.fn(), rect: jest.fn(), roundedRect: jest.fn(), circle: jest.fn(), line: jest.fn(),
  getTextWidth: jest.fn().mockReturnValue(10),
  addPage: jest.fn(), save: jest.fn(),
};
jest.mock('jspdf', () => ({ jsPDF: jest.fn().mockImplementation(() => mockDoc) }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { exportStudentProgressPdf } = require('../../utils/exportPdf');

function student(overrides: Partial<RosterStudent> = {}): RosterStudent {
  return {
    id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A',
    photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 0, learningPathTime: 40, learningPathTimeToday: 12,
    assignmentTime: 30, challengeTime: 20, progressPct: 60, totalTopics: 20, completedTopics: ['Fractions'],
    quizAttempts: 1, quizBestScore: 90, lastActive: '2026-08-20', needsAttention: false,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('exportStudentProgressPdf', () => {
  test('web platform with real students -> builds the PDF and saves without throwing', () => {
    expect(() => exportStudentProgressPdf({
      teacherName: 'Priya Menon',
      filters: { curriculum: 'IB PYP', grade: 'Grade 4', section: 'A', subject: 'Mathematics' },
      activityStudents: [student()],
      activityMode: 'overall',
    })).not.toThrow();

    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(mockDoc.save.mock.calls[0][0]).toMatch(/^activity-performance-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('a needsAttention student draws the flag dot, not a crash', () => {
    expect(() => exportStudentProgressPdf({
      teacherName: 'Priya Menon',
      filters: {},
      activityStudents: [student({ needsAttention: true })],
      activityMode: 'overall',
    })).not.toThrow();
    expect(mockDoc.circle).toHaveBeenCalled();
  });

  test('Today mode with a student missing per-day data (null) does not crash — real "not tracked" dash', () => {
    expect(() => exportStudentProgressPdf({
      teacherName: 'Priya Menon',
      filters: {},
      activityStudents: [student({ learningPathTimeToday: null })],
      activityMode: 'today',
    })).not.toThrow();
  });

  test('a student with zero real topic data does not crash — real "No topic data" state', () => {
    expect(() => exportStudentProgressPdf({
      teacherName: 'Priya Menon',
      filters: {},
      activityStudents: [student({ totalTopics: 0, completedTopics: [] })],
      activityMode: 'overall',
    })).not.toThrow();
  });

  test('no students for the filter -> the honest empty state, not a crash', () => {
    expect(() => exportStudentProgressPdf({
      teacherName: 'Priya Menon',
      filters: {},
      activityStudents: [],
      activityMode: 'overall',
    })).not.toThrow();
    expect(mockDoc.save).toHaveBeenCalled();
  });

  test('non-web platform is a real no-op — never touches jsPDF', () => {
    (Platform as any).OS = 'ios';
    exportStudentProgressPdf({ teacherName: 'Priya Menon', filters: {}, activityStudents: [student()], activityMode: 'overall' });
    expect(mockDoc.save).not.toHaveBeenCalled();
    (Platform as any).OS = 'web';
  });

  test('a class of 30 students does not crash — real class-size scale, one PDF, real pagination if needed', () => {
    const students = Array.from({ length: 30 }, (_, i) => student({ id: `s${i}`, name: `Student ${i}` }));
    expect(() => exportStudentProgressPdf({
      teacherName: 'Priya Menon',
      filters: {},
      activityStudents: students,
      activityMode: 'overall',
    })).not.toThrow();
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
  });
});
