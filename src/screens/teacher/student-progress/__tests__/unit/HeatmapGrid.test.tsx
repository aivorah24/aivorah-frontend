import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import HeatmapGrid from '../../components/HeatmapGrid';
import type { HeatmapStudent, HeatmapTopic } from '../../types';

const colors: any = {
  textMain: '#111', textMuted: '#666', textDim: '#999', borderColor: '#ddd', cardDark: '#fafafa',
};

function makeStudents(n: number): HeatmapStudent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`, name: `Student ${i + 1}`, grade: 'Grade 4', curriculum: 'CBSE', section: null, class: null,
    photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {},
  }));
}

function makeTopics(n: number): HeatmapTopic[] {
  return Array.from({ length: n }, (_, i) => ({ topic: `Topic ${i + 1}`, subject: 'Mathematics' }));
}

describe('HeatmapGrid', () => {
  // A real class can run ~30 students — the grid must paginate rows, same
  // as the Activity table, or the page becomes an unusable wall of cells.
  test('30 students -> only 10 shown on page 1, with a real "Showing 10 of 30" footer', async () => {
    await render(<HeatmapGrid colors={colors} students={makeStudents(30)} topics={makeTopics(3)} />);
    expect(screen.getByTestId('heatmap-row-s1')).toBeTruthy();
    expect(screen.getByTestId('heatmap-row-s10')).toBeTruthy();
    expect(screen.queryByTestId('heatmap-row-s11')).toBeNull();
    expect(screen.getByText('Showing 10 of 30 students')).toBeTruthy();
  });

  test('pressing next reveals the real remaining students on page 2', async () => {
    const user = userEvent.setup();
    await render(<HeatmapGrid colors={colors} students={makeStudents(15)} topics={makeTopics(3)} />);

    await user.press(screen.getByTestId('heatmap-student-page-next'));

    expect(screen.queryByTestId('heatmap-row-s1')).toBeNull();
    expect(screen.getByTestId('heatmap-row-s11')).toBeTruthy();
    expect(screen.getByTestId('heatmap-row-s15')).toBeTruthy();
  });

  test('10 students or fewer -> no row pagination controls at all', async () => {
    await render(<HeatmapGrid colors={colors} students={makeStudents(5)} topics={makeTopics(3)} />);
    expect(screen.queryByTestId('heatmap-student-page-next')).toBeNull();
  });

  // A full-year CBSE syllabus can run 30+ topics — columns must paginate too.
  test('30 topics -> only 10 columns shown on page 1, with a real "Topics 1-10 of 30" label', async () => {
    await render(<HeatmapGrid colors={colors} students={makeStudents(1)} topics={makeTopics(30)} />);
    expect(screen.getByText('Topic 1')).toBeTruthy();
    expect(screen.getByText('Topic 10')).toBeTruthy();
    expect(screen.queryByText('Topic 11')).toBeNull();
    expect(screen.getByText('Topics 1-10 of 30')).toBeTruthy();
  });

  test('pressing topic-page-next reveals the real remaining columns', async () => {
    const user = userEvent.setup();
    await render(<HeatmapGrid colors={colors} students={makeStudents(1)} topics={makeTopics(15)} />);

    await user.press(screen.getByTestId('heatmap-topic-page-next'));

    expect(screen.queryByText('Topic 1')).toBeNull();
    expect(screen.getByText('Topic 11')).toBeTruthy();
    expect(screen.getByText('Topic 15')).toBeTruthy();
  });

  test('10 topics or fewer -> no column pagination controls at all', async () => {
    await render(<HeatmapGrid colors={colors} students={makeStudents(1)} topics={makeTopics(5)} />);
    expect(screen.queryByTestId('heatmap-topic-page-next')).toBeNull();
  });

  test('a cell for a student/topic combination not on the current page is simply not rendered — no crash', async () => {
    await render(<HeatmapGrid colors={colors} students={makeStudents(15)} topics={makeTopics(15)} />);
    expect(screen.queryByTestId('heatmap-cell-s15-Topic 15')).toBeNull();
    expect(screen.getByTestId('heatmap-cell-s1-Topic 1')).toBeTruthy();
  });
});
