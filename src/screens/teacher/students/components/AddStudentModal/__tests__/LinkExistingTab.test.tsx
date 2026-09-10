import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LinkExistingTab from '../LinkExistingTab';

// Bug 3 RCA: the grade-filter chips used to do an exact string match
// (`s.grade === linkGradeFilter`) against real students, but the codebase's
// own grade data mixes "Grade 6" (teacher preference format) and "6" (some
// student rows' format) for the same grade — an exact match silently hid
// real, eligible students. Fixed by reusing rosterFilters.ts's already-tested
// normalizeGrade() (same fix already applied for the Student Progress
// screen's grade filter, per its own header comment documenting this exact
// class of bug).

const colors: any = { textDim: '#888', textMain: '#111', textMuted: '#555', cardDark: '#222', borderColor: '#333', accentRed: 'red' };

async function renderTab(overrides: Partial<React.ComponentProps<typeof LinkExistingTab>> = {}) {
  const props: React.ComponentProps<typeof LinkExistingTab> = {
    colors, gold: '#d4af37', isDark: true, styles: {},
    allowedGrades: ['Grade 6'],
    linkSearch: '', setLinkSearch: jest.fn(),
    linkGradeFilter: 'All', setLinkGradeFilter: jest.fn(),
    linkableStudents: [],
    linkableLoading: false,
    selectedStudents: [],
    toggleSelectedStudent: jest.fn(),
    linkEmail: '', linking: false, linkError: '',
    onCancel: jest.fn(), onSubmit: jest.fn(),
    ...overrides,
  };
  return render(<LinkExistingTab {...props} />);
}

describe('LinkExistingTab — grade filter (Bug 3)', () => {
  // LinkExistingTab is fully controlled (linkGradeFilter comes in as a prop,
  // not local state) — driving the filter directly, like the other tests
  // below, rather than pressing a chip and expecting a mocked setter to
  // magically re-render the component.
  test('a student stored as bare "6" still shows up when the "Grade 6" filter is active', async () => {
    await renderTab({
      linkGradeFilter: 'Grade 6',
      allowedGrades: ['Grade 6'],
      linkableStudents: [{ id: 's1', name: 'Bare Digit Kid', email: 'bd@real.com', grade: '6' }],
    });
    // Exact-string match ("6" !== "Grade 6") would have hidden this student.
    expect(screen.getByText('Bare Digit Kid')).toBeTruthy();
  });

  test('a genuinely different grade is excluded once a grade chip is selected', async () => {
    await renderTab({
      linkGradeFilter: 'Grade 7',
      allowedGrades: ['Grade 6', 'Grade 7'],
      linkableStudents: [
        { id: 's1', name: 'Grade 6 Kid', email: 'a@real.com', grade: '6' },
        { id: 's2', name: 'Grade 7 Kid', email: 'b@real.com', grade: 'Grade 7' },
      ],
    });
    expect(screen.queryByText('Grade 6 Kid')).toBeNull();
    expect(screen.getByText('Grade 7 Kid')).toBeTruthy();
  });

  test('search and grade filter combine correctly', async () => {
    await renderTab({
      linkSearch: 'sri',
      linkGradeFilter: 'Grade 6',
      allowedGrades: ['Grade 6'],
      linkableStudents: [
        { id: 's1', name: 'SriSiva', email: 'a@real.com', grade: 'Grade 6' },
        { id: 's2', name: 'Other Kid', email: 'b@real.com', grade: 'Grade 6' },
        { id: 's3', name: 'SriSiva Wrong Grade', email: 'c@real.com', grade: 'Grade 7' },
      ],
    });
    expect(screen.getByText('SriSiva')).toBeTruthy();
    expect(screen.queryByText('Other Kid')).toBeNull();
    expect(screen.queryByText('SriSiva Wrong Grade')).toBeNull();
  });

  test('shows the empty state when the backend genuinely returns no candidates', async () => {
    await renderTab({ linkableStudents: [] });
    expect(screen.getByText(/No unlinked students found/i)).toBeTruthy();
  });
});
