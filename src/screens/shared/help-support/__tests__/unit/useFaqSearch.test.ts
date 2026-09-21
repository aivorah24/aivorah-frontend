import { renderHook, act } from '@testing-library/react-native';
import { useFaqSearch } from '../../hooks/useFaqSearch';
import type { Faq } from '../../types';

const FAQS: Faq[] = [
  { q: 'How do I add a teacher?', a: 'Go to Teachers → Add Teacher.' },
  { q: 'How do I message parents?', a: 'Use the Messages tab.' },
  { q: 'What does XP mean?', a: 'Experience points earned via badges.' },
];

describe('useFaqSearch', () => {
  it('returns all FAQs when the search is empty', async () => {
    const { result } = await renderHook(() => useFaqSearch(FAQS));
    expect(result.current.filteredFaqs).toHaveLength(FAQS.length);
  });

  it('filters by question text, case-insensitively', async () => {
    const { result } = await renderHook(() => useFaqSearch(FAQS));
    await act(() => result.current.setSearch('TEACHER'));
    expect(result.current.filteredFaqs).toHaveLength(1);
    expect(result.current.filteredFaqs[0].q).toContain('teacher');
  });

  it('filters by answer text too', async () => {
    const { result } = await renderHook(() => useFaqSearch(FAQS));
    await act(() => result.current.setSearch('badges'));
    expect(result.current.filteredFaqs).toHaveLength(1);
  });

  it('returns no results for an unmatched search', async () => {
    const { result } = await renderHook(() => useFaqSearch(FAQS));
    await act(() => result.current.setSearch('xyzzynomatch'));
    expect(result.current.filteredFaqs).toHaveLength(0);
  });

  it('toggleFaq opens a closed FAQ and closes it again on repeat', async () => {
    const { result } = await renderHook(() => useFaqSearch(FAQS));
    expect(result.current.openFaq).toBeNull();
    await act(() => result.current.toggleFaq(1));
    expect(result.current.openFaq).toBe(1);
    await act(() => result.current.toggleFaq(1));
    expect(result.current.openFaq).toBeNull();
  });

  it('toggleFaq switches to a different FAQ without needing to close the first', async () => {
    const { result } = await renderHook(() => useFaqSearch(FAQS));
    await act(() => result.current.toggleFaq(0));
    await act(() => result.current.toggleFaq(1));
    expect(result.current.openFaq).toBe(1);
  });
});
