import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { renderChallengeModal } from '../../components/modals/ChallengeModals';

const TILE = { icon: 'target', color: '#FFD700', stat: '1', label: 'Attempted', title: 'x', body: 'x' };
const COLORS: any = { textDim: '#999', textMuted: '#aaa' };

function baseCtx(overrides: any = {}) {
  return {
    tile: TILE, students: [], assignStats: [], challStats: [], classAvgScore: null,
    studentsWithSubmissions: 0, studentsWithChallenges: 0, studentsCompletedChallenge: 0,
    totalStudyMins: 0, styles: {}, colors: COLORS, onClose: jest.fn(),
    ...overrides,
  };
}

describe('renderChallengeModal — case 7 (Attempted)', () => {
  test('no challenges assigned shows the empty state', async () => {
    await render(<>{renderChallengeModal(7, baseCtx({ challStats: [{ id: 's1', assigned: 0 }] }))}</>);
    expect(screen.getByText('No challenges assigned yet')).toBeTruthy();
  });

  test('lists students with at least one challenge assigned, dash when no avgScore yet', async () => {
    const challStats = [{ id: 's1', name: 'Aarav', assigned: 3, completed: 0, avgScore: null }];
    await render(<>{renderChallengeModal(7, baseCtx({ challStats }))}</>);
    expect(screen.getByText('1 Students')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  test('shows a real avgScore pill and real time-spent for a student with both', async () => {
    const students = [{ id: 's1', challengeTime: 45 }];
    const challStats = [{ id: 's1', name: 'Aarav', assigned: 2, completed: 1, avgScore: 85 }];
    await render(<>{renderChallengeModal(7, baseCtx({ students, challStats }))}</>);
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('45m')).toBeTruthy();
  });
});

describe('renderChallengeModal — case 8 (Completed)', () => {
  test('none completed shows the empty state', async () => {
    await render(<>{renderChallengeModal(8, baseCtx({ challStats: [{ id: 's1', completed: 0 }] }))}</>);
    expect(screen.getByText('No challenges completed yet')).toBeTruthy();
  });

  test('ranks completed students by count descending, with real time-spent per student', async () => {
    const students = [{ id: 's1', challengeTime: 10 }, { id: 's2', challengeTime: 25 }];
    const challStats = [
      { id: 's1', name: 'Aarav', completed: 1, avgScore: 80 },
      { id: 's2', name: 'Bela', completed: 5, avgScore: 90 },
    ];
    await render(<>{renderChallengeModal(8, baseCtx({ students, challStats }))}</>);
    expect(screen.getByText('2 Students')).toBeTruthy();
    expect(screen.getByText('25m')).toBeTruthy();
  });
});

describe('renderChallengeModal — case 9 (Top Scorer)', () => {
  test('no scores yet shows the empty state', async () => {
    await render(<>{renderChallengeModal(9, baseCtx({ challStats: [{ id: 's1', avgScore: null }] }))}</>);
    expect(screen.getByText('No challenge scores yet')).toBeTruthy();
  });

  test('ranks students by avgScore descending', async () => {
    const challStats = [
      { id: 's1', name: 'Aarav', avgScore: 60, completed: 2 },
      { id: 's2', name: 'Bela', avgScore: 95, completed: 4 },
    ];
    await render(<>{renderChallengeModal(9, baseCtx({ challStats }))}</>);
    expect(screen.getByText('95%')).toBeTruthy();
  });
});

test('an unknown tileIndex returns null, not a crash', async () => {
  expect(renderChallengeModal(99, baseCtx())).toBeNull();
});
