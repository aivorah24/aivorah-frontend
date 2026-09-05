import { renderHook, act } from '@testing-library/react-native';
import { useChildrenForm } from '../../hooks/useChildrenForm';

describe('useChildrenForm', () => {
  it('starts with one empty child, active', async () => {
    const { result } = await renderHook(() => useChildrenForm());
    expect(result.current.children).toHaveLength(1);
    expect(result.current.activeChildIdx).toBe(0);
    expect(result.current.activeChild.name).toBe('');
  });

  it('updateChild only edits the active child', async () => {
    const { result } = await renderHook(() => useChildrenForm());
    await act(() => result.current.addAnotherChild());
    await act(() => result.current.updateChild('name', 'Second'));
    expect(result.current.children[0].name).toBe('');
    expect(result.current.children[1].name).toBe('Second');
  });

  it('addAnotherChild appends and switches focus to the new child', async () => {
    const { result } = await renderHook(() => useChildrenForm());
    await act(() => result.current.addAnotherChild());
    expect(result.current.children).toHaveLength(2);
    expect(result.current.activeChildIdx).toBe(1);
  });

  it('removeChild refuses to remove the last remaining child', async () => {
    const { result } = await renderHook(() => useChildrenForm());
    await act(() => result.current.removeChild(0));
    expect(result.current.children).toHaveLength(1);
  });

  it('removeChild drops the given child and clamps the active index', async () => {
    const { result } = await renderHook(() => useChildrenForm());
    await act(() => result.current.addAnotherChild());
    await act(() => result.current.updateChild('name', 'Second'));
    await act(() => result.current.removeChild(1));
    expect(result.current.children).toHaveLength(1);
    expect(result.current.activeChildIdx).toBe(0);
  });
});
