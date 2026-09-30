import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import BookEditor from '../components/BookEditor';
import { bookSrc, bookLabel } from '../../../student/learning-paths/lesson-screen/utils/book';

const mockPickBook = jest.fn();
jest.mock('../components/pickLessonBook', () => ({ pickLessonBook: () => mockPickBook() }));
jest.mock('../../curriculum-learning-path/services/curriculumLearningPathService', () => ({
  getBookSections: jest.fn(async () => ({ sections: [{ grade: 6, pdfFile: 'fecu102.pdf', bookPath: 'grade6/science/fecu102.pdf', bookTitle: 'Curiosity', chapterTitle: 'Diversity in the Living World', title: 'Grouping of Seeds', page: 12 }] })),
}));

const colors: any = { bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', primary: '#fa0' };
const NCERT = { pdfFile: 'fecu101.pdf', pdfPage: 1 };

async function setup(lesson: any) {
  const onChange = jest.fn();
  await render(<BookEditor lesson={lesson} grade="Grade 6" subject="Science" colors={colors} onChange={onChange} />);
  return onChange;
}

test('uploading the teacher own PDF replaces the standard book', async () => {
  mockPickBook.mockResolvedValueOnce({ url: 'https://res/book_1.pdf', fileName: 'Chapter 1 notes.pdf' });
  const onChange = await setup(NCERT);
  await fireEvent.press(screen.getByTestId('book-upload'));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ bookUrl: 'https://res/book_1.pdf', bookTitle: 'Chapter 1 notes', pdfFile: '', bookPath: '', pdfPage: 1 }));
});

test('remove clears every kind of book; the page can be typed', async () => {
  const onChange = await setup(NCERT);
  await fireEvent.changeText(screen.getByTestId('page-value'), '7');
  expect(onChange).toHaveBeenLastCalledWith({ pdfPage: 7 });
  await fireEvent.press(screen.getByTestId('book-remove'));
  expect(onChange).toHaveBeenLastCalledWith({ pdfFile: '', bookPath: '', bookUrl: '', bookTitle: '', pdfPage: undefined });
});

test('standard book sections stay folded away until asked for, and picking one drops an uploaded book', async () => {
  const onChange = await setup({ bookUrl: 'https://res/book_1.pdf', bookTitle: 'Mine', pdfPage: 2 });
  expect(screen.queryByTestId('book-section-0')).toBeNull();
  await fireEvent.press(screen.getByTestId('book-sections-toggle'));
  await fireEvent.press(await screen.findByTestId('book-section-0'));
  expect(onChange).toHaveBeenLastCalledWith({ pdfFile: 'fecu102.pdf', pdfPage: 12, bookPath: 'grade6/science/fecu102.pdf', bookUrl: '', bookTitle: '' });
});

test("students' book pane opens the teacher's PDF under its own name", () => {
  const topic = { bookUrl: 'https://res/book_1.pdf', bookTitle: 'Mine', pdfFile: 'teacher-book.pdf' };
  expect(bookSrc(topic, 'Grade 6', 'Science')).toBe('https://res/book_1.pdf');
  expect(bookLabel(topic, 'Grade 6', 'Science')).toBe('Mine');
  expect(bookLabel({ pdfFile: 'fecu101.pdf' }, 'Grade 6', 'Science')).toBe('Curiosity');
});
