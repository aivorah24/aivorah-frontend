import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import GradeRow from '../GradeRow';
import type { GradeRow as GradeRowData } from '../../types';

const colors = {
  borderColor: 'rgba(245,243,238,0.14)', textHeading: '#F5F3EE', textDim: '#6E736B',
  textMuted: '#A9B0AC', bgDark: '#0B0B0B', accentYellow: '#BAA467',
} as any;

const BASE_GRADE: GradeRowData = {
  name: 'Grade 6', archived: false, unassignedCount: 0, totalStudents: 5,
  sections: [
    { name: 'A', archived: false, studentCount: 3 },
    { name: 'B', archived: false, studentCount: 2 },
  ],
};

async function renderRow(overrides: Partial<GradeRowData> = {}, props: Partial<React.ComponentProps<typeof GradeRow>> = {}) {
  const grade = { ...BASE_GRADE, ...overrides };
  const onRename = jest.fn();
  const onAddSection = jest.fn();
  const onToggleArchive = jest.fn();
  await render(
    <GradeRow grade={grade} isLast={false} colors={colors} onRename={onRename} onAddSection={onAddSection} onToggleArchive={onToggleArchive} {...props} />
  );
  return { onRename, onAddSection, onToggleArchive };
}

describe('GradeRow', () => {
  it('renders the grade name and total student count', async () => {
    await renderRow();
    expect(screen.getByText('Grade 6')).toBeTruthy();
    expect(screen.getByText('5 students')).toBeTruthy();
  });

  it('renders "1 student" (singular) when totalStudents is 1', async () => {
    await renderRow({ totalStudents: 1 });
    expect(screen.getByText('1 student')).toBeTruthy();
  });

  it('renders each section as a chip with its student count', async () => {
    await renderRow();
    expect(screen.getByText('Section A')).toBeTruthy();
    expect(screen.getByText('· 3 students')).toBeTruthy();
    expect(screen.getByText('Section B')).toBeTruthy();
    expect(screen.getByText('· 2 students')).toBeTruthy();
  });

  it('shows "No sections yet" when there are no sections and no unassigned students', async () => {
    await renderRow({ sections: [], unassignedCount: 0 });
    expect(screen.getByText('No sections yet')).toBeTruthy();
  });

  it('shows an unassigned-students chip when unassignedCount > 0', async () => {
    await renderRow({ unassignedCount: 2 });
    expect(screen.getByText('No section')).toBeTruthy();
    expect(screen.getByText('· 2')).toBeTruthy();
  });

  it('renders an archived section chip with dashed/dimmed styling', async () => {
    await renderRow({ sections: [{ name: 'A', archived: true, studentCount: 0 }] });
    const chipText = screen.getByText('Section A');
    // Walk up to the chip View and confirm the archived variant's styles are applied.
    const chipView = chipText.parent;
    const flatStyle = [].concat(chipView?.props.style).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    expect(flatStyle.opacity).toBe(0.55);
    expect(flatStyle.borderStyle).toBe('dashed');
  });

  it('shows the Archived tag when the grade is archived', async () => {
    await renderRow({ archived: true });
    expect(screen.getByText('Archived')).toBeTruthy();
    expect(screen.getByText('Restore')).toBeTruthy();
  });

  it('shows "Archive" (not "Restore") for a non-archived grade', async () => {
    await renderRow({ archived: false });
    expect(screen.queryByText('Archived')).toBeNull();
    expect(screen.getByText('Archive')).toBeTruthy();
  });

  it('calls onRename, onAddSection, and onToggleArchive independently', async () => {
    const { onRename, onAddSection, onToggleArchive } = await renderRow();
    const user = userEvent.setup();
    await user.press(screen.getByText('Rename'));
    await user.press(screen.getByText('Add section'));
    await user.press(screen.getByText('Archive'));
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onAddSection).toHaveBeenCalledTimes(1);
    expect(onToggleArchive).toHaveBeenCalledTimes(1);
  });
});
