import { renderHook, waitFor } from '@testing-library/react-native';
import { useChildSubjects } from '../../hooks/useChildSubjects';
import type { Child } from '../../types';

const CBSE_8 = ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Arts', 'Physical Education and Well Being'];
const IB_MYP_8 = ['Language and Literature', 'Individuals and Societies', 'Sciences', 'Mathematics', 'Design'];

const child = (over: Partial<Child>): Child => ({ id: 'c', name: 'Kid', email: 'k@t.com', grade: 'Grade 8', studyTimeMinutes: 0, ...over });

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    const list = String(url).includes('curriculum=CBSE') ? CBSE_8 : String(url).includes('curriculum=IB%20MYP') ? IB_MYP_8 : [];
    return Promise.resolve({ json: async () => ({ subjects: list.map(subject => ({ subject, topicCount: 1, topics: [] })) }) });
  }) as any;
});

describe('useChildSubjects', () => {
  it('lists a CBSE child\'s subjects from the same endpoint as My Learning Journey', async () => {
    const { result } = await renderHook(() => useChildSubjects(child({ curriculum: 'CBSE', profileCurriculum: 'CBSE', profileGrade: 'Grade 8' })));
    await waitFor(() => expect(result.current.subjects).toEqual(CBSE_8));
    expect(result.current.notice).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/curriculum/subjects?grade=Grade%208&curriculum=CBSE'));
  });

  it('NCERT resolves to the CBSE list, like the student screen', async () => {
    const { result } = await renderHook(() => useChildSubjects(child({ curriculum: 'NCERT' })));
    await waitFor(() => expect(result.current.subjects).toEqual(CBSE_8));
  });

  it('lists an IB child\'s IB subjects', async () => {
    const { result } = await renderHook(() => useChildSubjects(child({ curriculum: 'IB MYP' })));
    await waitFor(() => expect(result.current.subjects).toEqual(IB_MYP_8));
  });

  it('switching child refreshes the list', async () => {
    const { result, rerender } = await renderHook(({ c }: { c: Child }) => useChildSubjects(c), {
      initialProps: { c: child({ id: 'a', curriculum: 'CBSE' }) },
    });
    await waitFor(() => expect(result.current.subjects).toEqual(CBSE_8));
    await rerender({ c: child({ id: 'b', curriculum: 'IB MYP' }) });
    await waitFor(() => expect(result.current.subjects).toEqual(IB_MYP_8));
  });

  it('unset curriculum shows a message, not the service\'s defaulted curriculum list', async () => {
    const { result } = await renderHook(() => useChildSubjects(child({ name: 'Riya', curriculum: 'IB PYP', profileCurriculum: '', profileGrade: '' })));
    await waitFor(() => expect(result.current.notice).toMatch(/Riya's curriculum or grade isn't set/));
    expect(result.current.subjects).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('a curriculum with no subjects shows a message', async () => {
    const { result } = await renderHook(() => useChildSubjects(child({ curriculum: 'ICSE' })));
    await waitFor(() => expect(result.current.notice).toBe('No subjects available for ICSE Grade 8 yet.'));
    expect(result.current.subjects).toEqual([]);
  });

  it('a no-content grade shows a message without fetching', async () => {
    const { result } = await renderHook(() => useChildSubjects(child({ curriculum: 'CBSE', grade: 'LKG' })));
    await waitFor(() => expect(result.current.notice).toBe("Subjects for LKG aren't available yet."));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
