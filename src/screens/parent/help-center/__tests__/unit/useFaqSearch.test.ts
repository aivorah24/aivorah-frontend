import { renderHook, act } from '@testing-library/react-native';
import { useFaqSearch } from '../../hooks/useFaqSearch';
import { FAQS } from '../../constants';

describe('useFaqSearch', () => {
  it('returns all FAQs when the search is empty', async () => {
    const { result } = await renderHook(() => useFaqSearch());
    expect(result.current.filteredFaqs).toHaveLength(FAQS.length);
  });

  it('filters by question text, case-insensitively', async () => {
    const { result } = await renderHook(() => useFaqSearch());
    await act(() => result.current.setSearch('TEACHER'));
    expect(result.current.filteredFaqs).toHaveLength(1);
    expect(result.current.filteredFaqs[0].q).toContain("teacher");
  });

  it('filters by answer text too', async () => {
    const { result } = await renderHook(() => useFaqSearch());
    await act(() => result.current.setSearch('badges'));
    expect(result.current.filteredFaqs.length).toBeGreaterThan(0);
  });

  it('returns no results for an unmatched search', async () => {
    const { result } = await renderHook(() => useFaqSearch());
    await act(() => result.current.setSearch('xyzzynomatch'));
    expect(result.current.filteredFaqs).toHaveLength(0);
  });

  it('toggleFaq opens a closed FAQ and closes it again on repeat', async () => {
    const { result } = await renderHook(() => useFaqSearch());
    expect(result.current.openFaq).toBeNull();
    await act(() => result.current.toggleFaq(2));
    expect(result.current.openFaq).toBe(2);
    await act(() => result.current.toggleFaq(2));
    expect(result.current.openFaq).toBeNull();
  });

  it('toggleFaq switches to a different FAQ without needing to close the first', async () => {
    const { result } = await renderHook(() => useFaqSearch());
    await act(() => result.current.toggleFaq(0));
    await act(() => result.current.toggleFaq(1));
    expect(result.current.openFaq).toBe(1);
  });
});
