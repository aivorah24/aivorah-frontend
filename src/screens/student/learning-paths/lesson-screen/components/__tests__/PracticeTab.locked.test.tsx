import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import PracticeTab from '../PracticeTab';

const colors: any = { textMain: '#111', textMuted: '#666', borderColor: '#ddd', cardDark: '#fafafa', accentGreen: '#2a7', primary: '#0a7' };
const styles: any = new Proxy({}, { get: () => ({}) });
const props = {
  topic: { name: 'Rivers' }, grade: 'Grade 7', subject: 'Science', curriculum: 'CBSE',
  chapterIndex: 0, topicIndex: 0, topicId: undefined, colors, styles, navigation: { navigate: jest.fn() },
};

describe('PracticeTab lock', () => {
  test('locked: explains how to unlock, offers Learn and Listen, and has no Start Practice', async () => {
    const goTo = jest.fn();
    const user = userEvent.setup();
    await render(<PracticeTab {...props} locked onGoTo={goTo} />);
    expect(screen.getByText(/read Learn to the end, or listen to the whole lesson/i)).toBeTruthy();
    expect(screen.getByText(/pass this Practice test \(60% or more\)/i)).toBeTruthy();
    expect(screen.queryByText('Start Practice')).toBeNull();
    await user.press(screen.getByText('Go to Learn'));
    expect(goTo).toHaveBeenCalledWith('read');
    await user.press(screen.getByText('Go to Listen'));
    expect(goTo).toHaveBeenCalledWith('listen');
  });

  test('unlocked: Start Practice is available', async () => {
    await render(<PracticeTab {...props} locked={false} onGoTo={jest.fn()} />);
    expect(screen.getByText('Start Practice')).toBeTruthy();
  });
});
