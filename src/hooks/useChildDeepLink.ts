import { useEffect } from 'react';

// Handles a notification deep link into a parent screen: route params
// { childId, highlightId }. Selects that child, waits until the list loaded
// for *that* child (siblings can share a class-wide item), then opens it.
// onOpen(null) means the item isn't in the child's list anymore.
export function useChildDeepLink<T extends { id: string }>({
  route, navigation, children, selectedIdx, setSelectedIdx, items, itemsChildId, onOpen,
}: {
  route: any;
  navigation: any;
  children: { id: string }[];
  selectedIdx: number;
  setSelectedIdx: (i: number) => void;
  items: T[];
  itemsChildId: string | null;
  onOpen: (item: T | null) => void;
}) {
  const childId: string | undefined = route?.params?.childId;
  const highlightId: string | undefined = route?.params?.highlightId;
  const clear = () => navigation?.setParams?.({ childId: undefined, highlightId: undefined });

  useEffect(() => {
    if (!childId || children.length === 0) return;
    const idx = children.findIndex(c => c.id === childId);
    if (idx === -1) {
      clear();
      if (highlightId) onOpen(null);
      return;
    }
    if (idx !== selectedIdx) setSelectedIdx(idx);
    // Only react to a new deep link or a new children list, not to the user switching tabs afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, children]);

  useEffect(() => {
    if (!highlightId) return;
    const selected = children[selectedIdx];
    if (!selected || (childId && selected.id !== childId) || itemsChildId !== selected.id) return;
    clear();
    onOpen(items.find(i => String(i.id) === String(highlightId)) ?? null);
    // onOpen/clear are recreated each render; the params are cleared after the first open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, childId, children, selectedIdx, items, itemsChildId]);
}
