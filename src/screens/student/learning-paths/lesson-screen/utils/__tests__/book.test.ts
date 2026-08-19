import { subjectToBookFolder, bookSrc, bookTitleFor } from '../book';

describe('subjectToBookFolder', () => {
  test('resolves real compound "... Science" subjects before the bare science fallback', () => {
    expect(subjectToBookFolder('Computer Science')).toBe('computer_science');
    expect(subjectToBookFolder('Political Science')).toBe('political_science');
    expect(subjectToBookFolder('Social Science')).toBe('social_science');
    expect(subjectToBookFolder('Home Science')).toBe('home_science');
  });

  test('resolves a real bare "Science" to the plain science folder', () => {
    expect(subjectToBookFolder('Science')).toBe('science');
  });

  test('resolves real EVS/Environmental Studies to "evs"', () => {
    expect(subjectToBookFolder('EVS')).toBe('evs');
    expect(subjectToBookFolder('Environmental Studies')).toBe('evs');
  });

  test('resolves the real remaining known subjects', () => {
    expect(subjectToBookFolder('Mathematics')).toBe('mathematics');
    expect(subjectToBookFolder('English')).toBe('english');
    expect(subjectToBookFolder('Business Studies')).toBe('business_studies');
    expect(subjectToBookFolder('Physical Education')).toBe('physical_education');
    expect(subjectToBookFolder('Fine Arts')).toBe('fine_arts');
  });

  test('falls back to a real underscored slug for an unrecognized subject', () => {
    expect(subjectToBookFolder('Sanskrit Grammar')).toBe('sanskrit_grammar');
  });
});

describe('bookSrc', () => {
  test('uses the real authoritative bookPath from the topic payload when present', () => {
    const url = bookSrc({ bookPath: 'grade11/mathematics/kemh101.pdf' }, 'Grade 11', 'Mathematics');
    expect(url).toContain('/data/ncert_books/grade11/mathematics/kemh101.pdf');
  });

  test('rebuilds a real path from grade+subject+pdfFile when bookPath is missing (older lessons)', () => {
    const url = bookSrc({ pdfFile: 'jemh101.pdf' }, 'Grade 6', 'Mathematics');
    expect(url).toContain('/data/ncert_books/grade6/mathematics/jemh101.pdf');
  });
});

describe('bookTitleFor', () => {
  test('returns the real known Grade 6 book titles', () => {
    expect(bookTitleFor('Grade 6', 'English')).toBe('Poorvi');
    expect(bookTitleFor('Grade 6', 'Science')).toBe('Curiosity');
    expect(bookTitleFor('Grade 6', 'Social Science')).toBe('Exploring Society: India and Beyond');
    expect(bookTitleFor('Grade 6', 'Mathematics')).toBe('Ganita Prakash');
  });

  test('falls back to a real neutral non-misleading label for a grade without a mapped title', () => {
    expect(bookTitleFor('Grade 8', 'Science')).toBe('Grade 8 Science Textbook');
  });

  test('falls back to a real neutral label for a Grade 6 subject with no mapped title', () => {
    expect(bookTitleFor('Grade 6', 'Hindi')).toBe('Grade 6 Hindi Textbook');
  });
});
