import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SubjectCard from '../SubjectCard';

jest.mock('../../../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false, colors: {} }) }));

const base = { subject: 'English', topicCount: 0, topics: [], chapterCount: 5 };

describe('SubjectCard book name', () => {
  test('shows the book name under the unchanged subject name', async () => {
    await render(<SubjectCard data={{ ...base, books: ['Poorvi'] }} completedSet={new Set()} onPress={() => {}} width="100%" />);
    expect(screen.getByTestId('subject-card-name').props.children).toBe('English');
    expect(screen.getByTestId('subject-card-book').props.children).toBe('Poorvi');
  });

  test('joins several books', async () => {
    await render(<SubjectCard data={{ ...base, subject: 'Hindi', books: ['वसंत', 'दूर्वा'] }} completedSet={new Set()} onPress={() => {}} width="100%" />);
    expect(screen.getByTestId('subject-card-book').props.children).toBe('वसंत · दूर्वा');
  });

  test('renders no book line when the server sends none', async () => {
    await render(<SubjectCard data={base} completedSet={new Set()} onPress={() => {}} width="100%" />);
    expect(screen.queryByTestId('subject-card-book')).toBeNull();
  });
});

describe('SubjectCard counts', () => {
  const cbse = { subject: 'English', topicCount: 5, topics: [], chapters: [{}, {}, {}, {}, {}] } as any;

  test('a CBSE subject is labelled by its chapters, not as "topics"', async () => {
    await render(<SubjectCard data={cbse} completedSet={new Set()} onPress={() => {}} width="100%" />);
    expect(screen.getByText('5 chapters')).toBeTruthy();
    expect(screen.queryByText('5 topics')).toBeNull();
  });

  test('completed topics of the subject show in the count and percent', async () => {
    const data = { ...cbse, topicCount: 4, topics: [{ topic: 'A' }, { topic: 'B' }, { topic: 'C' }, { topic: 'D' }] };
    await render(<SubjectCard data={data} completedSet={new Set(['A', 'C'])} onPress={() => {}} width="100%" />);
    expect(screen.getByText('2 completed')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });
});
