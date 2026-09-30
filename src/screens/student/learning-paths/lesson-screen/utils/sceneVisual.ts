import type { SceneVisual } from '../types';

const str = (v: any): v is string => typeof v === 'string' && v.trim().length > 0;
const strs = (v: any, min = 1, max = 12): string[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v.filter(str).map((s: string) => s.trim()).slice(0, max);
  return out.length >= min ? out : null;
};

// Accepts only a well-formed visual; anything malformed is dropped so the board never draws a broken diagram.
export function parseSceneVisual(raw: any): SceneVisual | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const title = str(raw.title) ? { title: raw.title.trim() } : {};
  switch (raw.kind) {
    case 'image':
      return str(raw.url) && /^https:\/\//.test(raw.url)
        ? { kind: 'image', url: raw.url, ...(str(raw.caption) ? { caption: raw.caption } : {}), ...(Number.isInteger(raw.page) ? { page: raw.page } : {}), ...title }
        : undefined;
    case 'flow': {
      const steps = strs(raw.steps, 2, 7);
      return steps ? { kind: 'flow', steps, ...title } : undefined;
    }
    case 'venn': {
      const l = raw.left; const r = raw.right;
      const li = strs(l?.items, 1, 4); const ri = strs(r?.items, 1, 4); const both = strs(raw.both, 1, 4);
      return str(l?.label) && str(r?.label) && li && ri && both
        ? { kind: 'venn', left: { label: l.label, items: li }, right: { label: r.label, items: ri }, both, ...title }
        : undefined;
    }
    case 'table': {
      const headers = strs(raw.headers, 2, 8);
      const rows = Array.isArray(raw.rows) ? raw.rows.filter((row: any) => Array.isArray(row) && row.some(str)).slice(0, 30).map((row: any[]) => row.map((c) => (str(c) ? c.trim() : ''))) : [];
      return headers && rows.length ? { kind: 'table', headers, rows, ...title } : undefined;
    }
    case 'timeline': {
      const events = Array.isArray(raw.events) ? raw.events.filter((e: any) => str(e?.when) && str(e?.what)).slice(0, 7).map((e: any) => ({ when: e.when, what: e.what })) : [];
      return events.length >= 2 ? { kind: 'timeline', events, ...title } : undefined;
    }
    case 'cause_effect': {
      const pairs = Array.isArray(raw.pairs) ? raw.pairs.filter((p: any) => str(p?.cause) && str(p?.effect)).slice(0, 4).map((p: any) => ({ cause: p.cause, effect: p.effect })) : [];
      return pairs.length ? { kind: 'cause_effect', pairs, ...title } : undefined;
    }
    case 'compare': {
      const columns = Array.isArray(raw.columns) ? raw.columns.filter((c: any) => str(c?.label) && strs(c?.points)).slice(0, 3).map((c: any) => ({ label: c.label, points: strs(c.points, 1, 5)! })) : [];
      return columns.length >= 2 ? { kind: 'compare', columns, ...title } : undefined;
    }
    case 'web': {
      const nodes = Array.isArray(raw.nodes) ? raw.nodes.filter((n: any) => str(n?.label)).slice(0, 6).map((n: any) => ({ label: n.label, ...(str(n.note) ? { note: n.note } : {}) })) : [];
      return str(raw.center) && nodes.length >= 2 ? { kind: 'web', center: raw.center, nodes, ...title } : undefined;
    }
    default:
      return undefined;
  }
}
