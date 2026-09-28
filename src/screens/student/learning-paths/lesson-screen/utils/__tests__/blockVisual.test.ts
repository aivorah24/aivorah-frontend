import { blockToVisual } from '../blockVisual';

describe('blockToVisual', () => {
  test('process becomes a flow chart, timeline and cause-effect become their drawings', () => {
    expect(blockToVisual({ type: 'process', title: 'How rain forms', steps: ['Water heats', 'Vapour rises', 'Clouds form'] })).toEqual({ kind: 'flow', title: 'How rain forms', steps: ['Water heats', 'Vapour rises', 'Clouds form'] });
    expect(blockToVisual({ type: 'timeline', title: 'T', events: [{ date: '1857', description: 'Revolt' }, { date: '1947', description: 'Freedom' }] })?.kind).toBe('timeline');
    expect(blockToVisual({ type: 'cause_and_effect', title: 'C', items: [{ cause: 'No rain', effect: 'Dry fields' }] })?.kind).toBe('cause_effect');
  });

  test('a comparison of 2-3 things is side-by-side columns; more becomes a table', () => {
    expect(blockToVisual({ type: 'comparison', items: [{ name: 'Plant cell', description: 'has a cell wall' }, { name: 'Animal cell', description: 'no cell wall' }] })?.kind).toBe('compare');
    const many = [1, 2, 3, 4].map((n) => ({ name: `Item ${n}`, description: `d${n}` }));
    expect(blockToVisual({ type: 'comparison', items: many })?.kind).toBe('table');
  });

  test('tables are drawn; anything incomplete or not a diagram keeps its old rendering', () => {
    expect(blockToVisual({ type: 'table', caption: 'Place value', headers: ['Tens', 'Ones'], rows: [['4', '7']] })?.kind).toBe('table');
    expect(blockToVisual({ type: 'process', steps: ['only one'] })).toBeUndefined();
    expect(blockToVisual({ type: 'explanation', text: 'x' })).toBeUndefined();
  });
});

test('a visual block carries a ready diagram, e.g. a Venn from the Listen scene', () => {
  const venn = { kind: 'venn', left: { label: 'Rakesh', items: ['young'] }, right: { label: 'Grandfather', items: ['old'] }, both: ['love the tree'] };
  expect(blockToVisual({ type: 'visual', visual: venn })?.kind).toBe('venn');
  expect(blockToVisual({ type: 'visual', visual: { kind: 'nope' } })).toBeUndefined();
});
