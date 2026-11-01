// Integration tests for LearningPathsScreen — the real screen, real hooks
// (useSubjects, useBlockedSubjects), fetch mocked. AuthContext/ThemeContext/
// StudentDataContext mocked.

import React from 'react';
import { render, screen, userEvent, act } from '@testing-library/react-native';
import LearningPathsScreen from '../LearningPathsScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => { cb(); },
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'LearningPaths', name: 'LearningPaths' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {} }),
}));

let mockCompletedTopics: string[] = [];
jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ stats: { completedTopics: mockCompletedTopics } }),
}));

jest.mock('../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false }),
}));

// Needed since the teacher-path loader (useTeacherPaths, merged into the subject cards) pulls in
// config/firebase transitively — real firebase/auth is ESM
// and jest can't parse it without this mock.
jest.mock('../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('token') } },
}));

let mockUser: any = { name: 'A Student', email: 'a@a.com', curriculum: 'IB PYP', grade: 'Grade 4' };
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, refreshProfile: jest.fn().mockResolvedValue(undefined) }),
}));

function navProp() {
  return { navigate: mockNavigate, openDrawer: jest.fn() };
}

// Header fires its own analytics fetch on mount, and useBlockedSubjects fires
// a screen-time-status fetch — both hit the same global.fetch mock as
// useSubjects. Route by URL so each hook gets its own controllable response
// instead of one test's intent leaking into another hook's call.
function mockFetchByUrl(handlers: { subjects?: () => Promise<any>; blocked?: () => Promise<any>; syllabus?: (url: string) => Promise<any> }) {
  global.fetch = jest.fn((url: string) => {
    if (String(url).includes('/teacher/syllabus/current') && handlers.syllabus) return handlers.syllabus(String(url));
    if (String(url).includes('/curriculum/subjects') && handlers.subjects) return handlers.subjects();
    if (String(url).includes('/parent/screen-time-status') && handlers.blocked) return handlers.blocked();
    if (String(url).includes('/student/learning-paths')) return Promise.resolve({ ok: true, json: async () => ({ learningPaths: [] }) });
    return Promise.resolve({ json: async () => ({}) });
  }) as any;
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockUser = { name: 'A Student', email: 'a@a.com', curriculum: 'IB PYP', grade: 'Grade 4' };
  mockCompletedTopics = [];
  mockFetchByUrl({ subjects: () => Promise.resolve({ json: async () => ({ subjects: [] }) }) });
});

describe('LearningPathsScreen', () => {
  test('incomplete profile (no grade/curriculum) shows the setup prompt', async () => {
    // Note: useSubjects/useBlockedSubjects still fire their effects — hooks run
    // unconditionally in React, before the component's later early return — so
    // this only asserts the UI shown, not that fetch was skipped.
    mockUser = { name: 'A Student', email: 'a@a.com', curriculum: '', grade: '' };
    await render(<LearningPathsScreen navigation={navProp()} />);
    expect(await screen.findByText(/Your profile is incomplete/)).toBeTruthy();
  });

  test('a no-content grade (e.g. Nursery) shows the "coming soon" message', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', curriculum: 'IB PYP', grade: 'Nursery' };
    await render(<LearningPathsScreen navigation={navProp()} />);
    expect(await screen.findByText('Content for Nursery is on the way')).toBeTruthy();
  });

  test('real subjects from the server render as subject cards', async () => {
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({
          subjects: [
            { subject: 'Mathematics', topicCount: 10, topics: [] },
            { subject: 'Science', topicCount: 8, topics: [] },
          ],
        }),
      }),
    });

    await render(<LearningPathsScreen navigation={navProp()} />);

    expect(await screen.findByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('Science')).toBeTruthy();
  });

  test('a fetch failure for CBSE shows the real error message (non-IB curricula have no offline fallback)', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', curriculum: 'CBSE', grade: 'Grade 6' };
    mockFetchByUrl({ subjects: () => Promise.reject(new Error('network down')) });

    await render(<LearningPathsScreen navigation={navProp()} />);

    expect(await screen.findByText('Could not load curriculum right now. Check if the server is running and try again.')).toBeTruthy();
  });

  test('a fetch failure for IB PYP falls back to the real offline seed data, not an error', async () => {
    mockFetchByUrl({ subjects: () => Promise.reject(new Error('network down')) });

    await render(<LearningPathsScreen navigation={navProp()} />);

    // Falls back to getIBPYPStaticSubjects('Grade 4') — Mathematics is always seeded.
    expect(await screen.findByText('Mathematics')).toBeTruthy();
  });

  test('empty subjects list (no fallback triggered) shows the "no subjects" empty state', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', curriculum: 'CBSE', grade: 'Grade 6' };
    mockFetchByUrl({ subjects: () => Promise.resolve({ json: async () => ({ subjects: [] }) }) });

    await render(<LearningPathsScreen navigation={navProp()} />);

    expect(await screen.findByText('No subjects available for this profile yet.')).toBeTruthy();
  });

  test('a subject blocked by parental screen-time controls shows the real "Blocked by parent" badge', async () => {
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({ subjects: [{ subject: 'Mathematics', topicCount: 10, topics: [] }] }),
      }),
      blocked: () => Promise.resolve({
        json: async () => ({ subjectFilter: { enabled: true, blockedSubjects: ['Mathematics'] } }),
      }),
    });

    await render(<LearningPathsScreen navigation={navProp()} />);

    expect(await screen.findByText('Blocked by parent')).toBeTruthy();
  });

  test('a parent-blocked CBSE subject locks exactly that card (same subject key as Parental Controls)', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', curriculum: 'CBSE', grade: 'Grade 8' };
    const cbse = ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Arts', 'Physical Education and Well Being'];
    mockFetchByUrl({
      subjects: () => Promise.resolve({ json: async () => ({ subjects: cbse.map((subject) => ({ subject, topicCount: 1, topics: [] })) }) }),
      blocked: () => Promise.resolve({
        json: async () => ({ subjectFilter: { enabled: true, blockedSubjects: ['Social Science', 'Social Studies'] } }),
      }),
    });

    await render(<LearningPathsScreen navigation={navProp()} />);

    await screen.findByText('Blocked by parent');
    expect(screen.getAllByText('Blocked by parent')).toHaveLength(1);
    await userEvent.setup().press(screen.getByText('Social Science'));
    expect(mockNavigate).not.toHaveBeenCalled();
    await userEvent.setup().press(screen.getByText('Science'));
    expect(mockNavigate).toHaveBeenCalledWith('SubjectSyllabus', { subject: 'Science', curriculum: 'CBSE', grade: 'Grade 8' });
  });

  test('subjectFilter disabled -> no subject is blocked, even if blockedSubjects is non-empty', async () => {
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({ subjects: [{ subject: 'Mathematics', topicCount: 10, topics: [] }] }),
      }),
      blocked: () => Promise.resolve({
        json: async () => ({ subjectFilter: { enabled: false, blockedSubjects: ['Mathematics'] } }),
      }),
    });

    await render(<LearningPathsScreen navigation={navProp()} />);

    await screen.findByText('Mathematics');
    expect(screen.queryByText('Blocked by parent')).toBeNull();
  });

  test('pressing a subject card navigates to SubjectSyllabus with the subject/curriculum/grade', async () => {
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({ subjects: [{ subject: 'Mathematics', topicCount: 10, topics: [] }] }),
      }),
    });
    const user = userEvent.setup();

    await render(<LearningPathsScreen navigation={navProp()} />);
    await user.press(await screen.findByText('Mathematics'));

    expect(mockNavigate).toHaveBeenCalledWith('SubjectSyllabus', {
      subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4',
    });
  });

  test('pressing a BLOCKED subject card does not navigate', async () => {
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({ subjects: [{ subject: 'Mathematics', topicCount: 10, topics: [] }] }),
      }),
      blocked: () => Promise.resolve({
        json: async () => ({ subjectFilter: { enabled: true, blockedSubjects: ['Mathematics'] } }),
      }),
    });
    const user = userEvent.setup();

    await render(<LearningPathsScreen navigation={navProp()} />);
    await screen.findByText('Blocked by parent');
    await user.press(screen.getByText('Mathematics'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('the hero card shows real overall progress computed from completed topics', async () => {
    mockCompletedTopics = ['Addition'];
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({
          subjects: [
            { subject: 'Mathematics', topicCount: 2, topics: [{ topic: 'Addition', unit: 'Numbers', description: '' }, { topic: 'Subtraction', unit: 'Numbers', description: '' }] },
          ],
        }),
      }),
    });

    await render(<LearningPathsScreen navigation={navProp()} />);
    await screen.findByText('Mathematics');

    // 1 of 2 topics done -> 50% overall. (Both the hero card and the single
    // subject card happen to show 50% here since there's only one subject —
    // both instances confirm the real calculation ran, not a placeholder.)
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
    // 1 of 1 subjects has at least one completed topic -> "in progress" subtitle.
    expect(screen.getByText('1/1 subjects in progress')).toBeTruthy();
  });

  test('no completed topics -> hero shows 0% and no "in progress" subtitle', async () => {
    mockCompletedTopics = [];
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({
          subjects: [{ subject: 'Mathematics', topicCount: 2, topics: [{ topic: 'Addition', unit: 'Numbers', description: '' }] }],
        }),
      }),
    });

    await render(<LearningPathsScreen navigation={navProp()} />);
    await screen.findByText('Mathematics');

    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1);
    // Subject exists but has zero completed topics -> "0 of 1" in progress, not omitted.
    expect(screen.getByText('0/1 subjects in progress')).toBeTruthy();
  });

  test('a CBSE subject card counts the topics the student has completed, from its syllabus', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', curriculum: 'CBSE', grade: 'Grade 3' };
    mockCompletedTopics = ['Fun with Friends', 'Colours'];
    mockFetchByUrl({
      subjects: () => Promise.resolve({ ok: true, json: async () => ({ subjects: [
        { subject: 'English', topicCount: 2, topics: [], chapters: [{ unitNo: 1, title: 'Colours' }, { unitNo: 2, title: 'Badal and Moti' }] },
      ] }) }),
      syllabus: () => Promise.resolve({ ok: true, json: async () => ({ units: [
        { unitNo: 1, title: 'Colours', topics: [{ id: '1', name: 'Fun with Friends' }, { id: '2', name: 'Colours' }, { id: '3', name: 'Let us learn' }] },
        { unitNo: 2, title: 'Badal and Moti', topics: [{ id: '4', name: 'Badal' }] },
      ] }) }),
    });
    await render(<LearningPathsScreen navigation={navProp()} />);
    expect(await screen.findByText('2 completed')).toBeTruthy();
    expect(screen.getByText('2 chapters')).toBeTruthy();
    expect(screen.getAllByText('50%')).toHaveLength(2); // the card and the overall ring
    mockCompletedTopics = [];
  });

  test('a subject the parent locks while the student is on this screen locks when they come back to it', async () => {
    let blocked: string[] = [];
    mockFetchByUrl({
      subjects: () => Promise.resolve({
        json: async () => ({ subjects: [{ subject: 'Mathematics', topicCount: 10, topics: [] }] }),
      }),
      blocked: () => Promise.resolve({ json: async () => ({ subjectFilter: { enabled: true, blockedSubjects: blocked } }) }),
    });
    const listeners: Record<string, () => void> = {};
    const navigation = { ...navProp(), isFocused: () => true, addListener: (e: string, cb: () => void) => { listeners[e] = cb; return () => {}; } };

    await render(<LearningPathsScreen navigation={navigation} />);
    expect(await screen.findByText('Mathematics')).toBeTruthy();
    expect(screen.queryByText('Blocked by parent')).toBeNull();

    blocked = ['Mathematics'];
    await act(async () => { listeners.focus?.(); });

    expect(await screen.findByText('Blocked by parent')).toBeTruthy();
  });
});
