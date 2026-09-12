import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TeacherLearningPathsSection from '../../components/TeacherLearningPathsSection';

jest.mock('../../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../../config/learningPathsServerUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function jsonResponse(body: any, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });
}

describe('TeacherLearningPathsSection', () => {
  test('renders nothing when the list is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ learningPaths: [] })) as any;
    await render(<TeacherLearningPathsSection onOpen={jest.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('teacher-lp-section')).toBeNull());
  });

  test('renders nothing on a server error — degrades quietly like the national curriculum fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, false)) as any;
    await render(<TeacherLearningPathsSection onOpen={jest.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('teacher-lp-section')).toBeNull());
    expect(screen.queryByText('boom')).toBeNull();
  });

  test('renders each published path and navigates on press', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPaths: [{ id: 'lp1', curriculumId: 'c1', title: 'Grade 6 Maths', publishedAt: 'x' }],
    })) as any;
    const onOpen = jest.fn();
    const user = userEvent.setup();
    await render(<TeacherLearningPathsSection onOpen={onOpen} />);

    await waitFor(() => expect(screen.getByTestId('teacher-lp-section')).toBeTruthy());
    await user.press(screen.getByTestId('teacher-lp-item-c1'));
    expect(onOpen).toHaveBeenCalledWith('c1', 'Grade 6 Maths');
  });
});
