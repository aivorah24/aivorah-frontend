// Harness pattern matches useAssignmentsList.test.tsx / useTagFilters.test.tsx
// (no RNTL renderHook in this version).
import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useStudentsList } from '../../hooks/useStudentsList';

jest.mock('@react-navigation/native', () => {
  const ReactLib = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useFocusEffect: (cb: any) => { ReactLib.useEffect(() => { cb(); }, []); },
  };
});

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function Harness({ user }: { user: any }) {
  const h = useStudentsList(user);
  return (
    <View>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="count">{String(h.students.length)}</Text>
      <Text testID="firstName">{h.students[0]?.name ?? ''}</Text>
    </View>
  );
}

const TEACHER = { email: 't@school.com', teaches: [] };
const STUDENT = { id: 's1', name: 'Real Student', email: 'kid@a.com' };

describe('useStudentsList', () => {
  test('loads the roster on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([STUDENT]) }) as any;
    await render(<Harness user={TEACHER} />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe('1');
  });

  // Regression: this hook used to reset to [] on ANY fetch error, including
  // a transient one — diverging from the Teacher Dashboard's roster count
  // (useTeacherDashboardData.ts), which deliberately keeps stale data on
  // error. A flaky poll made the two screens disagree until the next
  // successful refetch. Fixed to also preserve previous data on error.
  test('a transient error on the 15s poll keeps the previously-loaded roster, matching the Dashboard', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    let studentsCallCount = 0;
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/student/by-teacher/')) {
        studentsCallCount += 1;
        return studentsCallCount === 1
          ? Promise.resolve({ ok: true, json: () => Promise.resolve([STUDENT]) })
          : Promise.reject(new Error('network blip')); // every poll after the first fails
      }
      // fetchTeacherPreferences — irrelevant to this test, always succeeds.
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ teaches: [] }) });
    }) as any;
    await render(<Harness user={TEACHER} />);
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));

    jest.advanceTimersByTime(15 * 1000);
    await waitFor(() => expect(studentsCallCount).toBeGreaterThanOrEqual(2));

    // The failing second fetch must not wipe the roster the first fetch loaded.
    expect(screen.getByTestId('count').props.children).toBe('1');
    expect(screen.getByTestId('firstName').props.children).toBe('Real Student');
    jest.useRealTimers();
  });

  test('an error on the FIRST load (nothing to preserve yet) shows an empty roster, not a crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await render(<Harness user={TEACHER} />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe('0');
  });
});
