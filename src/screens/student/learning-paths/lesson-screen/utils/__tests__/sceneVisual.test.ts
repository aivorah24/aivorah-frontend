import { parseSceneVisual } from '../sceneVisual';

describe('parseSceneVisual', () => {
  test('accepts each well-formed kind', () => {
    expect(parseSceneVisual({ kind: 'flow', title: 'How it happened', steps: ['a', 'b', 'c'] })).toEqual({ kind: 'flow', title: 'How it happened', steps: ['a', 'b', 'c'] });
    expect(parseSceneVisual({ kind: 'venn', left: { label: 'Rakesh', items: ['young'] }, right: { label: 'Grandfather', items: ['old'] }, both: ['love the tree'] })?.kind).toBe('venn');
    expect(parseSceneVisual({ kind: 'table', headers: ['Year', 'Event'], rows: [['1947', 'Battle']] })?.kind).toBe('table');
    expect(parseSceneVisual({ kind: 'timeline', events: [{ when: '1923', what: 'Born' }, { when: '1947', what: 'Badgam' }] })?.kind).toBe('timeline');
    expect(parseSceneVisual({ kind: 'cause_effect', pairs: [{ cause: 'No rain', effect: 'Dry fields' }] })?.kind).toBe('cause_effect');
    expect(parseSceneVisual({ kind: 'compare', columns: [{ label: 'A', points: ['x'] }, { label: 'B', points: ['y'] }] })?.kind).toBe('compare');
    expect(parseSceneVisual({ kind: 'web', center: 'Gopi', nodes: [{ label: 'Kind' }, { label: 'Brave', note: 'stands up' }] })?.kind).toBe('web');
    expect(parseSceneVisual({ kind: 'image', url: 'https://x/y.png', caption: 'page 3', page: 3 })).toEqual({ kind: 'image', url: 'https://x/y.png', caption: 'page 3', page: 3 });
  });

  test('drops malformed or unsafe visuals instead of drawing a broken one', () => {
    expect(parseSceneVisual(null)).toBeUndefined();
    expect(parseSceneVisual({ kind: 'mystery' })).toBeUndefined();
    expect(parseSceneVisual({ kind: 'flow', steps: ['only one'] })).toBeUndefined();
    expect(parseSceneVisual({ kind: 'venn', left: { label: 'A', items: ['x'] }, right: { label: 'B', items: [] }, both: ['z'] })).toBeUndefined();
    expect(parseSceneVisual({ kind: 'image', url: 'http://insecure/x.png' })).toBeUndefined();
    expect(parseSceneVisual({ kind: 'compare', columns: [{ label: 'A', points: ['x'] }] })).toBeUndefined();
  });

  test('caps long lists so the diagram stays readable', () => {
    const v = parseSceneVisual({ kind: 'flow', steps: Array.from({ length: 12 }, (_, i) => `s${i}`) });
    expect(v && v.kind === 'flow' && v.steps.length).toBe(7);
  });
});
