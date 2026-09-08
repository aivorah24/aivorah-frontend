// R01 (Master Defect Register, B01) — Assignments > Upload & Classify: the
// topic chips a teacher sees must never be an internal ingestion code like
// "bemr101". This hook is the sole consumer of that response on the
// frontend, so the negative assertion the defect doc calls for lives here.
import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../onboarding/OnboardingScreen', () => ({
  GRADES_TEACHER: ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
}));

// The hook's grades/curricula-preferences fetch is behind useFocusEffect —
// irrelevant to this test's topic-chip assertion, so keep it inert rather
// than needing a real NavigationContainer.
jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => {} }));

import { useTeacherCurriculumGrade } from '../../hooks/useTeacherCurriculumGrade';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function Harness({ user, subject }: { user: any; subject: string }) {
  const h = useTeacherCurriculumGrade(user, subject);
  return (
    <View>
      <Text testID="loading">{String(h.topicsLoading)}</Text>
      <Text testID="topics">{h.availableTopics.join('|')}</Text>
    </View>
  );
}

const USER = { email: 't@school.com', curriculum: 'CBSE', teaches: [{ grade: 'Grade 3', curriculum: 'CBSE' }] };

describe('useTeacherCurriculumGrade — topic chips', () => {
  test('never surfaces an internal ingestion code as a topic chip', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/user/preferences')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ teaches: [{ grade: 'Grade 3', curriculum: 'CBSE' }] }) });
      if (url.includes('/curriculum/subjects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            grade: 'Grade 3', curriculum: 'NCERT',
            subjects: [{
              subject: 'Mathematics', topicCount: 2, unitCount: 0, units: [],
              // Shape returned by the fixed aivorah-assignments-service —
              // an already-relabelled fallback, never the raw code itself.
              topics: [
                { topic: 'Mathematics — Topic 1', internalId: 'bemr101', unit: '', description: '', chapter: 0 },
                { topic: 'Addition and Subtraction', unit: '', description: '', chapter: 1 },
              ],
            }],
          }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
    }) as any;

    await render(<Harness user={USER} subject="Mathematics" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    const topics = screen.getByTestId('topics').props.children.split('|').filter(Boolean);
    expect(topics.length).toBeGreaterThan(0);
    for (const t of topics) {
      expect(t).not.toMatch(/^[a-z]{2,8}\d{2,4}$/);
    }
    expect(topics).toContain('Addition and Subtraction');
    expect(topics).toContain('Mathematics — Topic 1');
  });
});
