import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LearningPathCard } from '../../components/LearningPathCard';

// Any style/colour lookup resolves to an empty value; only rendered rows matter here.
const anyObj: any = new Proxy({}, { get: () => ({}) });
const colors: any = new Proxy({}, { get: () => '#000000' });

const row = (subject: string, chapterNo: number, title: string) => ({
  title, subject, chapterNo, color: '#000', icon: 'book-open' as const,
  status: 'not_started' as const, doneCount: 0, totalTopics: 1,
});

// CBSE Grade 10 English really has several chapters titled "Unit" and "Let's Begin".
const english = [
  row('English', 18, 'The Book That Saved the Earth'),
  row('English', 19, 'Unit'), row('English', 20, 'Unit'), row('English', 21, 'Unit'),
  row('English', 23, "Let's Begin"), row('English', 24, "Let's Begin"),
];
const hindi = [row('Hindi', 1, 'सूरदास'), row('Hindi', 2, 'तुलसीदास')];

const props = (rows: any[], subject: string) => ({
  styles: anyObj, colors, isDark: true, cardBg: '', cardBorder: '', subtleBg: '',
  noContentGrade: false, studentGrade: 'Grade 10', topicsGoal: 0, learningPathCurriculum: 'CBSE',
  lessonSubjects: ['English', 'Hindi'], effectiveLessonSubjectFilter: subject, setLessonSubjectFilter: jest.fn(),
  filteredChapterRows: rows, searchQuery: '', navigation: { navigate: jest.fn() },
});

describe('LearningPathCard — chapters with repeated titles', () => {
  test('switching from English to Hindi leaves no English rows behind', async () => {
    const view = await render(<LearningPathCard {...props(english, 'English')} />);
    expect(screen.getAllByText('Unit')).toHaveLength(3);

    await view.rerender(<LearningPathCard {...props(hindi, 'Hindi')} />);

    expect(screen.queryByText('Unit')).toBeNull();
    expect(screen.queryByText("Let's Begin")).toBeNull();
    expect(screen.queryByText(/English · Chapter/)).toBeNull();
    expect(screen.getByText('सूरदास')).toBeTruthy();
    expect(screen.getByText('तुलसीदास')).toBeTruthy();
  });

  test('every repeated-title chapter gets its own row', async () => {
    await render(<LearningPathCard {...props(english, 'English')} />);
    expect(screen.getAllByText('Unit')).toHaveLength(3);
    expect(screen.getAllByText("Let's Begin")).toHaveLength(2);
  });
});
