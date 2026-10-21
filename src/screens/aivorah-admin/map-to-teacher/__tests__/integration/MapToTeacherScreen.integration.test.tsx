import React from 'react';
import { render, screen, waitFor, userEvent, within } from '@testing-library/react-native';
import MapToTeacherScreen from '../../MapToTeacherScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, []); },
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', accentCyan: '#5bf', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../services/mapToTeacherService', () => ({
  fetchAdminStudents: jest.fn(), fetchAdminTeachers: jest.fn(), fetchAdminSchools: jest.fn(async () => []), assignStudentsToTeacher: jest.fn(),
}));
import { fetchAdminStudents, fetchAdminTeachers, fetchAdminSchools, assignStudentsToTeacher } from '../../services/mapToTeacherService';

const STUDENTS = [
  { id: 's1', name: 'Asha', email: 'a@x', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA', section: 'A', created_at: '', teacher_student: [] },
];
const nav = { openDrawer: jest.fn() };

describe('MapToTeacherScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAdminStudents as jest.Mock).mockResolvedValue(STUDENTS);
    (fetchAdminTeachers as jest.Mock).mockResolvedValue([{ id: 't1', name: 'Ms Rao', email: 'rao@x', school: 'TSRA', curriculum: 'CBSE', teaches: [] }]);
  });

  test('renders the student roster and assigns a selected student to a teacher', async () => {
    (assignStudentsToTeacher as jest.Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);

    expect(await screen.findByTestId('map-student-row-s1')).toBeTruthy();
    await user.press(screen.getByTestId('map-student-row-s1'));
    await user.press(screen.getByTestId('map-teacher-manual-toggle'));
    await user.type(screen.getByTestId('map-teacher-email'), 'rao@x');
    await user.press(screen.getByTestId('map-assign-submit'));

    expect(await screen.findByTestId('map-assign-success')).toBeTruthy();
    expect(assignStudentsToTeacher).toHaveBeenCalledWith({ studentIds: ['s1'], teacherEmail: 'rao@x', subject: 'General' });
  });

  test('NCERT folds into CBSE, and curriculum narrows grade options ("5"/"Grade 5" merged)', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([
      { ...STUDENTS[0], id: 's1', grade: '5', curriculum: 'NCERT' },
      { ...STUDENTS[0], id: 's2', grade: 'Grade 5', curriculum: 'CBSE' },
      { ...STUDENTS[0], id: 's3', grade: 'Grade 2', curriculum: 'IB PYP' },
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');

    await user.press(screen.getByTestId('map-filter-curriculum'));
    expect(screen.queryByTestId('map-filter-curriculum-option-NCERT')).toBeNull();
    await user.press(await screen.findByTestId('map-filter-curriculum-option-CBSE'));
    expect(screen.getByTestId('map-student-row-s1')).toBeTruthy();
    expect(screen.getByTestId('map-student-row-s2')).toBeTruthy();
    expect(screen.queryByTestId('map-student-row-s3')).toBeNull();

    // CBSE → its Grade 1–12 range (no Nursery/LKG, no PYP-only list).
    await user.press(screen.getByTestId('map-filter-grade'));
    expect(await screen.findByTestId('map-filter-grade-option-Grade 5')).toBeTruthy();
    expect(screen.getByTestId('map-filter-grade-option-Grade 12')).toBeTruthy();
    expect(screen.queryByTestId('map-filter-grade-option-Nursery')).toBeNull();
  });

  test('an IB school offers only IB PYP/MYP/DP, and IB PYP limits grades to 1–5', async () => {
    (fetchAdminSchools as jest.Mock).mockResolvedValueOnce([{ id: 'x', name: 'TSRA', curriculum: 'IB' }]);
    (fetchAdminStudents as jest.Mock).mockResolvedValue([
      { ...STUDENTS[0], id: 's1', grade: 'Grade 4', curriculum: 'IB PYP' },
      { ...STUDENTS[0], id: 's2', grade: 'Grade 10', curriculum: 'CBSE' }, // stray data at an IB school
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');

    await user.press(screen.getByTestId('map-filter-school'));
    await user.press(await screen.findByTestId('map-filter-school-option-TSRA'));
    await user.press(screen.getByTestId('map-filter-curriculum'));
    expect(await screen.findByTestId('map-filter-curriculum-option-IB PYP')).toBeTruthy();
    expect(screen.getByTestId('map-filter-curriculum-option-IB MYP')).toBeTruthy();
    expect(screen.getByTestId('map-filter-curriculum-option-IB DP')).toBeTruthy();
    expect(screen.queryByTestId('map-filter-curriculum-option-CBSE')).toBeNull();

    await user.press(screen.getByTestId('map-filter-curriculum-option-IB PYP'));
    await user.press(screen.getByTestId('map-filter-grade'));
    expect(await screen.findByTestId('map-filter-grade-option-Grade 1')).toBeTruthy();
    expect(screen.getByTestId('map-filter-grade-option-Grade 5')).toBeTruthy();
    expect(screen.queryByTestId('map-filter-grade-option-Grade 6')).toBeNull();
    expect(screen.queryByTestId('map-filter-grade-option-Grade 10')).toBeNull();
  });

  test('E2E test-fixture sections are not offered in the Section filter', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([
      { ...STUDENTS[0], id: 's1', section: 'A' },
      { ...STUDENTS[0], id: 's2', section: 'E2E-ATT' },
      { ...STUDENTS[0], id: 's3', section: 'E2E-ATT-B' },
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');

    await user.press(screen.getByTestId('map-filter-section'));
    expect(await screen.findByTestId('map-filter-section-option-A')).toBeTruthy();
    expect(screen.queryByTestId('map-filter-section-option-E2E-ATT')).toBeNull();
    expect(screen.queryByTestId('map-filter-section-option-E2E-ATT-B')).toBeNull();
  });

  test('section filter only offers sections in the chosen grade and narrows the roster', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([
      { ...STUDENTS[0], id: 's1', grade: 'Grade 5', section: 'A' },
      { ...STUDENTS[0], id: 's2', grade: 'Grade 5', section: 'B' },
      { ...STUDENTS[0], id: 's3', grade: 'Grade 6', section: 'C' },
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');

    await user.press(screen.getByTestId('map-filter-grade'));
    await user.press(await screen.findByTestId('map-filter-grade-option-Grade 5'));
    await user.press(screen.getByTestId('map-filter-section'));
    expect(screen.queryByTestId('map-filter-section-option-C')).toBeNull();
    await user.press(await screen.findByTestId('map-filter-section-option-B'));
    expect(screen.getByTestId('map-student-row-s2')).toBeTruthy();
    expect(screen.queryByTestId('map-student-row-s1')).toBeNull();
  });

  test('subjects follow the curriculum/grade the roster shares, and change with the filters', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([
      { ...STUDENTS[0], id: 's1', grade: 'Grade 7', curriculum: 'IB MYP', section: 'A' },
      { ...STUDENTS[0], id: 's2', grade: 'Grade 3', curriculum: 'CBSE', section: 'B' },
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');
    expect(screen.queryByTestId('map-subject-chip-Design')).toBeNull(); // mixed roster → no single curriculum

    // Section A leaves only the MYP Grade 7 student → MYP subjects without picking curriculum/grade.
    await user.press(screen.getByTestId('map-filter-section'));
    await user.press(await screen.findByTestId('map-filter-section-option-A'));
    expect(screen.getByTestId('map-subject-chip-Design')).toBeTruthy();
    expect(screen.getByText('Subjects for IB MYP · Grade 7')).toBeTruthy();

    await user.press(screen.getByTestId('map-filter-clear-all'));
    await user.press(screen.getByTestId('map-filter-curriculum'));
    await user.press(await screen.findByTestId('map-filter-curriculum-option-CBSE'));
    expect(screen.queryByTestId('map-subject-chip-Design')).toBeNull();
    expect(screen.getByTestId('map-subject-chip-EVS')).toBeTruthy();
  });

  test('roster shows each assigned teacher with the subjects they teach the student', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([{
      ...STUDENTS[0],
      teacher_student: [
        { teacher_id: 't1', subject: 'Maths', teacher: { id: 't1', name: 'Ms Rao', email: 'rao@x' } },
        { teacher_id: 't1', subject: 'Science', teacher: { id: 't1', name: 'Ms Rao', email: 'rao@x' } },
        { teacher_id: 't2', subject: 'English', teacher: { id: 't2', name: 'Mr Iyer', email: 'iyer@x' } },
      ],
    }]);
    await render(<MapToTeacherScreen navigation={nav} />);
    const rao = within(await screen.findByTestId('map-row-teacher-s1-t1'));
    expect(rao.getByText('Ms Rao')).toBeTruthy();
    expect(rao.getByText('Maths')).toBeTruthy();
    expect(rao.getByText('Science')).toBeTruthy();
    const iyer = within(screen.getByTestId('map-row-teacher-s1-t2'));
    expect(iyer.getByText('Mr Iyer')).toBeTruthy();
    expect(iyer.getByText('English')).toBeTruthy();
  });

  test('a load error shows the retry state', async () => {
    (fetchAdminStudents as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await render(<MapToTeacherScreen navigation={nav} />);
    expect(await screen.findByText('boom')).toBeTruthy();
  });

  test('picking a teacher chip shows only that teacher\'s subjects, and chip taps fill the manual fields', async () => {
    (fetchAdminTeachers as jest.Mock).mockResolvedValue([
      { id: 't1', name: 'Ms Rao', email: 'rao@x', school: 'TSRA', curriculum: 'CBSE', teaches: [{ subject: 'Maths' }, { subject: 'Science' }] },
      { id: 't2', name: 'Mr Iyer', email: 'iyer@x', school: 'Other School', curriculum: 'CBSE', teaches: [{ subject: 'English' }] },
    ]);
    (assignStudentsToTeacher as jest.Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);

    await user.press(await screen.findByTestId('map-student-row-s1')); // s1 is at TSRA
    // Narrowed to TSRA: Ms Rao's chip is offered, Mr Iyer's (a different school) is not.
    expect(await screen.findByTestId('map-teacher-chip-t1')).toBeTruthy();
    expect(screen.queryByTestId('map-teacher-chip-t2')).toBeNull();

    await user.press(screen.getByTestId('map-teacher-chip-t1'));
    // Grade 5 CBSE catalog subjects are offered alongside what Ms Rao teaches.
    expect(screen.getByTestId('map-subject-chip-EVS')).toBeTruthy();
    expect(screen.getByText('★ Maths')).toBeTruthy();

    await user.press(await screen.findByTestId('map-subject-chip-Maths'));

    await user.press(screen.getByTestId('map-assign-submit'));
    expect(await screen.findByTestId('map-assign-success')).toBeTruthy();
    expect(assignStudentsToTeacher).toHaveBeenCalledWith({ studentIds: ['s1'], teacherEmail: 'rao@x', subject: 'Maths' });
  });

  test('curriculum narrows grades to the onboarding range and "PYP 4" folds into "Grade 4"', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([
      { ...STUDENTS[0], id: 's1', grade: 'PYP 4', curriculum: 'IB PYP' },
      { ...STUDENTS[0], id: 's2', grade: 'Grade 7', curriculum: 'IB MYP' },
      { ...STUDENTS[0], id: 's3', grade: 'Grade 11', curriculum: 'IB MYP' }, // bad data: outside MYP 6-10
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');

    await user.press(screen.getByTestId('map-filter-grade'));
    expect(await screen.findByTestId('map-filter-grade-option-Grade 4')).toBeTruthy();
    expect(screen.queryByTestId('map-filter-grade-option-PYP 4')).toBeNull();
    await user.press(screen.getByTestId('map-filter-grade-option-all'));

    await user.press(screen.getByTestId('map-filter-curriculum'));
    await user.press(await screen.findByTestId('map-filter-curriculum-option-IB MYP'));
    await user.press(screen.getByTestId('map-filter-grade'));
    expect(await screen.findByTestId('map-filter-grade-option-Grade 7')).toBeTruthy();
    expect(screen.queryByTestId('map-filter-grade-option-Grade 11')).toBeNull();
    expect(screen.queryByTestId('map-filter-grade-option-Grade 4')).toBeNull();
  });

  test('teachers narrow to the selected students\' grade + curriculum, are searchable, and read onboarding subjects[]', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue([{ ...STUDENTS[0], grade: 'Grade 7', curriculum: 'IB MYP' }]);
    (fetchAdminTeachers as jest.Mock).mockResolvedValue([
      { id: 't1', name: 'Ms Rao', email: 'rao@x', school: 'TSRA', curriculum: 'IB MYP', teaches: [{ grade: 'Grade 7', curriculum: 'IB MYP', subjects: ['Sciences', 'Design'] }] },
      { id: 't2', name: 'Mr Iyer', email: 'iyer@x', school: 'TSRA', curriculum: 'CBSE', teaches: [{ grade: 'Grade 5', curriculum: 'CBSE', subjects: ['English'] }] },
      { id: 't3', name: 'Ms Rani', email: 'rani@x', school: 'TSRA', curriculum: 'IB MYP', teaches: [{ grade: 'Grade 7', curriculum: 'IB MYP', subjects: ['Arts'] }] },
    ]);
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);

    await user.press(await screen.findByTestId('map-student-row-s1'));
    expect(screen.getByTestId('map-teacher-chip-t1')).toBeTruthy();
    expect(screen.getByTestId('map-teacher-chip-t3')).toBeTruthy();
    expect(screen.queryByTestId('map-teacher-chip-t2')).toBeNull();

    await user.type(screen.getByTestId('map-teacher-search'), 'rani');
    expect(screen.queryByTestId('map-teacher-chip-t1')).toBeNull();
    expect(screen.getByTestId('map-teacher-chip-t3')).toBeTruthy();
    await user.clear(screen.getByTestId('map-teacher-search'));

    await user.press(screen.getByTestId('map-teacher-chip-t1'));
    expect(screen.getByText('★ Sciences')).toBeTruthy();
    expect(screen.getByText('★ Design')).toBeTruthy();
    // Arts is in the MYP Grade 7 catalog but Ms Rao doesn't teach it — offered, not starred.
    expect(screen.getByTestId('map-subject-chip-Arts')).toBeTruthy();
    expect(screen.queryByText('★ Arts')).toBeNull();

    await user.press(screen.getByTestId('map-teacher-show-all'));
    expect(screen.getByTestId('map-teacher-chip-t2')).toBeTruthy();
  });

  test('roster paginates 10 per page and the header checkbox selects the current page', async () => {
    (fetchAdminStudents as jest.Mock).mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ ...STUDENTS[0], id: `s${i + 1}`, name: `Student ${String(i + 1).padStart(2, '0')}` })),
    );
    const user = userEvent.setup();
    await render(<MapToTeacherScreen navigation={nav} />);
    await screen.findByTestId('map-student-row-s1');

    expect(screen.queryByTestId('map-student-row-s11')).toBeNull();
    expect(screen.getByText('1–10 of 12')).toBeTruthy();

    await user.press(screen.getByTestId('map-select-page'));
    expect(screen.getByText('10 selected')).toBeTruthy();

    await user.press(screen.getByTestId('map-page-next'));
    expect(screen.getByTestId('map-student-row-s11')).toBeTruthy();
    expect(screen.getByText('11–12 of 12')).toBeTruthy();
  });
});
