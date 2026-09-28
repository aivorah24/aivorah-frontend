import type { SceneVisual } from '../types';
import { parseSceneVisual } from './sceneVisual';

type Block = { type: string; [key: string]: any };

// A 'visual' block carries a ready diagram (the same shapes as the Listen board).
// Learn-tab blocks that describe a diagram are drawn with the same visuals as the Listen board:
// process -> flow chart, comparison -> side-by-side columns (a table when there are many), timeline, cause -> effect, table.
export function blockToVisual(b: Block): SceneVisual | undefined {
  switch (b?.type) {
    case 'visual':
      return parseSceneVisual(b.visual);
    case 'process':
      return parseSceneVisual({ kind: 'flow', title: b.title, steps: b.steps });
    case 'comparison': {
      const items = (Array.isArray(b.items) ? b.items : []).filter((it: any) => it && (it.name || it.label));
      if (items.length >= 2 && items.length <= 3) {
        return parseSceneVisual({ kind: 'compare', title: b.title, columns: items.map((it: any) => ({ label: it.name || it.label, points: [it.description || it.value].filter(Boolean) })) });
      }
      return parseSceneVisual({ kind: 'table', title: b.title, headers: [b.title || 'Item', 'What it means'], rows: items.map((it: any) => [it.name || it.label, it.description || it.value || '']) });
    }
    case 'timeline':
      return parseSceneVisual({ kind: 'timeline', title: b.title, events: (b.events || []).map((e: any) => ({ when: e?.date, what: e?.description })) });
    case 'cause_and_effect':
      return parseSceneVisual({ kind: 'cause_effect', title: b.title, pairs: b.items });
    case 'table':
      return parseSceneVisual({ kind: 'table', title: b.caption, headers: b.headers, rows: b.rows });
    default:
      return undefined;
  }
}
