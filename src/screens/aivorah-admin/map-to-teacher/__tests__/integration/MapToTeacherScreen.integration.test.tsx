import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
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
  fetchAdminStudents: jest.fn(), fetchAdminTeachers: jest.fn(), assignStudentsToTeacher: jest.fn(),
}));
import { fetchAdminStudents, fetchAdminTeachers, assignStudentsToTeacher } from '../../services/mapToTeacherService';

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
    await user.type(screen.getByTestId('map-teacher-email'), 'rao@x');
    await user.press(screen.getByTestId('map-assign-submit'));

    expect(await screen.findByTestId('map-assign-success')).toBeTruthy();
    expect(assignStudentsToTeacher).toHaveBeenCalledWith({ studentIds: ['s1'], teacherEmail: 'rao@x', subject: 'General' });
  });

  test('a load error shows the retry state', async () => {
    (fetchAdminStudents as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await render(<MapToTeacherScreen navigation={nav} />);
    expect(await screen.findByText('boom')).toBeTruthy();
  });
});
