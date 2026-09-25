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
