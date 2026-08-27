import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ChallengeCard from '../ChallengeCard';
import type { Challenge } from '../../types';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) }); // any style key resolves to an empty style object
const colors: any = { accentYellow: '#fa0', accentGreen: '#0a0', textDim: '#666' };

// RNTL v14 exposes no UNSAFE_getByType query — walk the rendered JSON tree to
// find the <Image>'s real resolved `source` prop instead.
function findImageSource(node: any): any {
  if (!node) return undefined;
  if (node.props?.source !== undefined) return node.props.source;
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const found = findImageSource(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1', title: 'Fractions Quiz', description: '', grade: 'Grade 4', curriculum: 'NCERT',
    subject: 'Math', chapterId: null, topic: 'Fractions', difficulty: 'Easy', xpReward: 100,
    questionCount: 5, timeLimitMinutes: 10, type: 'mcq', category: 'quiz', imageUrl: null,
    assignmentId: null, status: 'available', score: null, xpAwarded: null, dueDate: null,
    assignedByRole: null, ...overrides,
  } as Challenge;
}

describe('ChallengeCard — available/assigned states', () => {
  test('an available challenge shows "Start Challenge" and calls onStart with the real challenge on press', async () => {
    const onStart = jest.fn();
    const ch = makeChallenge({ status: 'available' });
    const user = userEvent.setup();
    await render(<ChallengeCard ch={ch} onStart={onStart} styles={styles} colors={colors} />);

    expect(screen.getByText('Start Challenge')).toBeTruthy();
    await user.press(screen.getByText('Start Challenge'));
    expect(onStart).toHaveBeenCalledWith(ch);
  });

  test('an assigned challenge shows "Start Now" instead', async () => {
    const ch = makeChallenge({ status: 'assigned' });
    await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Start Now')).toBeTruthy();
  });

  test('shows the real title, xp reward, and time limit', async () => {
    const ch = makeChallenge({ title: 'Water Cycle Quiz', xpReward: 250, timeLimitMinutes: 15 });
    await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Water Cycle Quiz')).toBeTruthy();
    expect(screen.getByText('250 XP')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
  });
});

describe('ChallengeCard — image resolution', () => {
  test('an absolute http imageUrl is used as-is', async () => {
    const ch = makeChallenge({ imageUrl: 'https://cdn.example.com/c1.png' });
    const view = await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(findImageSource(view.toJSON())).toEqual({ uri: 'https://cdn.example.com/c1.png' });
  });

  test('a relative imageUrl is prefixed with SERVER_URL', async () => {
    const SERVER_URL = require('../../../../../config/serverUrl').default;
    const ch = makeChallenge({ imageUrl: '/data/images/challenges/c1.png' });
    const view = await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(findImageSource(view.toJSON())).toEqual({ uri: `${SERVER_URL}/data/images/challenges/c1.png` });
  });

  test('(ch as any).thumbnailUrl takes priority over imageUrl', async () => {
    const ch = { ...makeChallenge({ imageUrl: '/fallback.png' }), thumbnailUrl: 'https://cdn.example.com/thumb.png' } as any;
    const view = await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(findImageSource(view.toJSON())).toEqual({ uri: 'https://cdn.example.com/thumb.png' });
  });
});

describe('ChallengeCard — closed state', () => {
  test('a closed, non-completed challenge shows "Closed" and no start button', async () => {
    const onStart = jest.fn();
    const ch = makeChallenge({ status: 'assigned', closed: true } as any);
    await render(<ChallengeCard ch={ch} onStart={onStart} styles={styles} colors={colors} />);
    expect(screen.getByText('Closed')).toBeTruthy();
    expect(screen.queryByText('Start Now')).toBeNull();
  });
});

describe('ChallengeCard — completed state', () => {
  test('shows the real score and XP awarded instead of a start button', async () => {
    const ch = makeChallenge({ status: 'completed', score: 90, xpAwarded: 90 });
    await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('90% · +90 XP')).toBeTruthy();
  });

  test('a completed score of 80+ shows a real "Top 1%" rank badge', async () => {
    const ch = makeChallenge({ status: 'completed', score: 85, xpAwarded: 85 });
    await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Top 1%')).toBeTruthy();
  });

  test('a completed score below 20 shows no rank badge at all', async () => {
    const ch = makeChallenge({ status: 'completed', score: 10, xpAwarded: 10 });
    await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.queryByText('Performer')).toBeNull();
  });

  test('boundary: a score of exactly 20 gets the "Top 25%" band, not no-badge', async () => {
    const ch = makeChallenge({ status: 'completed', score: 20, xpAwarded: 20 });
    await render(<ChallengeCard ch={ch} onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Top 25%')).toBeTruthy();
  });
});
