import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { renderAssignmentModal } from '../../components/modals/AssignmentModals';

const TILE = { icon: 'clipboard', color: '#FFD700', stat: '1', label: 'Pending', title: 'Not Started', body: 'x' };
const COLORS: any = { textDim: '#999', textMain: '#fff', textMuted: '#aaa' };

function baseCtx(overrides: any = {}) {
  return {
    tile: TILE, students: [], assignStats: [], challStats: [], classAvgScore: null,
    studentsWithSubmissions: 0, studentsWithChallenges: 0, studentsCompletedChallenge: 0,
    totalStudyMins: 0, styles: {}, colors: COLORS, onClose: jest.fn(),
    ...overrides,
  };
}

describe('renderAssignmentModal — case 4 (Pending)', () => {
  test('all submitted shows the "everyone has submitted" empty state', async () => {
    await render(<>{renderAssignmentModal(4, baseCtx({ assignStats: [{ id: 's1', name: 'Aarav', submitted: 1 }] }))}</>);
    expect(screen.getByText('Everyone has submitted at least one assignment!')).toBeTruthy();
  });

  test('lists students with zero submissions, with a subject-scoped total that sums the shown columns', async () => {
    const assignStats = [{ id: 's1', name: 'Aarav', submitted: 0, scopedSubjects: ['Mathematics'], bySubject: { Mathematics: { assigned: 2, submitted: 0 } } }];
    await render(<>{renderAssignmentModal(4, baseCtx({ assignStats }))}</>);
    expect(screen.getByText('1 Students')).toBeTruthy();
    // The single subject column and the Total column both legitimately read "0/2" here.
    expect(screen.getAllByText('0/2')).toHaveLength(2);
  });
});

describe('renderAssignmentModal — case 5 (Avg Score)', () => {
  test('no scores yet shows the empty state', async () => {
    await render(<>{renderAssignmentModal(5, baseCtx({ assignStats: [{ id: 's1', avgScore: null }] }))}</>);
    expect(screen.getByText('No assignment scores yet')).toBeTruthy();
  });

  test('ranks students by avgScore descending and shows classAvgScore in the header', async () => {
    const assignStats = [
      { id: 's1', name: 'Aarav', avgScore: 60, submitted: 2 },
      { id: 's2', name: 'Bela', avgScore: 90, submitted: 3 },
    ];
    await render(<>{renderAssignmentModal(5, baseCtx({ assignStats, classAvgScore: 75 }))}</>);
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
  });
});

describe('renderAssignmentModal — case 6 (Submitted)', () => {
  test('shows a dash for a student with no avgScore yet, instead of crashing', async () => {
    const assignStats = [{ id: 's1', name: 'Aarav', submitted: 0, avgScore: null }];
    await render(<>{renderAssignmentModal(6, baseCtx({ assignStats, studentsWithSubmissions: 0 }))}</>);
    expect(screen.getByText('—')).toBeTruthy();
  });

  test('shows a real per-subject submitted/assigned breakdown, real time spent, and a real avgScore pill', async () => {
    const students = [{ id: 's1', assignmentTime: 40 }];
    const assignStats = [
      {
        id: 's1', name: 'Aarav', submitted: 2, avgScore: 88,
        scopedSubjects: ['Mathematics'], bySubject: { Mathematics: { assigned: 2, submitted: 2 } },
      },
      // A second student so the real sort-by-submitted comparator actually runs
      // (Array.sort skips the comparator entirely for single-element arrays).
      { id: 's2', name: 'Bela', submitted: 0, avgScore: null, scopedSubjects: [], bySubject: {} },
    ];
    await render(<>{renderAssignmentModal(6, baseCtx({ students, assignStats, studentsWithSubmissions: 1 }))}</>);
    expect(screen.getByText('88%')).toBeTruthy();
    expect(screen.getByText('40m')).toBeTruthy();
    // The single subject column and the Total column both read "2/2" here.
    expect(screen.getAllByText('2/2')).toHaveLength(2);
  });
});

test('an unknown tileIndex returns null, not a crash', async () => {
  expect(renderAssignmentModal(99, baseCtx())).toBeNull();
});
