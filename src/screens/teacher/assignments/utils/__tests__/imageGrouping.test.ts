import { resolveImageGroups, groupedImageIdSet, type PickedImage } from '../imageGrouping';

const img = (id: string): PickedImage => ({ id, name: `${id}.jpg`, base64: `b64-${id}`, mime: 'image/jpeg' });

describe('resolveImageGroups', () => {
  test('with no groups, every image is its own single-page worksheet', () => {
    const pending = [img('a'), img('b'), img('c')];
    const { groups, ungrouped } = resolveImageGroups(pending, []);
    expect(groups).toEqual([]);
    expect(ungrouped.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  test('a group combines its images, in the order they were added, into one worksheet', () => {
    const pending = [img('a'), img('b'), img('c')];
    const { groups, ungrouped } = resolveImageGroups(pending, [
      { id: 'g1', imageIds: ['c', 'a'] }, // deliberately out of pending order
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map(i => i.id)).toEqual(['c', 'a']);
    expect(ungrouped.map(i => i.id)).toEqual(['b']);
  });

  test('multiple independent groups plus leftover ungrouped images', () => {
    const pending = [img('a'), img('b'), img('c'), img('d'), img('e')];
    const { groups, ungrouped } = resolveImageGroups(pending, [
      { id: 'g1', imageIds: ['a', 'b'] },
      { id: 'g2', imageIds: ['d', 'e'] },
    ]);
    expect(groups.map(g => g.map(i => i.id))).toEqual([['a', 'b'], ['d', 'e']]);
    expect(ungrouped.map(i => i.id)).toEqual(['c']);
  });

  test('an id in a group that no longer exists in pendingImages is silently dropped, not a crash', () => {
    const pending = [img('a'), img('b')];
    const { groups } = resolveImageGroups(pending, [{ id: 'g1', imageIds: ['a', 'ghost', 'b'] }]);
    expect(groups[0].map(i => i.id)).toEqual(['a', 'b']);
  });
});

describe('groupedImageIdSet', () => {
  test('flattens all grouped ids across groups', () => {
    const set = groupedImageIdSet([
      { id: 'g1', imageIds: ['a', 'b'] },
      { id: 'g2', imageIds: ['c'] },
    ]);
    expect([...set].sort()).toEqual(['a', 'b', 'c']);
  });

  test('empty groups produce an empty set', () => {
    expect(groupedImageIdSet([]).size).toBe(0);
  });
});
