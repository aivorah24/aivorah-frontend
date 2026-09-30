import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { TINTS } from '../../../student/learning-paths/lesson-screen/components/SceneVisual';

type Block = { type: string; [k: string]: any };

// Limits the student-side drawing accepts (utils/sceneVisual.ts); beyond them a diagram would not be drawn.
export const LIMITS = { columns: 3, points: 5, steps: 7, events: 7, pairs: 4, nodes: 6, vennItems: 4, tableCols: 8, tableRows: 30 };

export const VISUAL_TYPES = new Set(['visual', 'process', 'comparison', 'timeline', 'cause_and_effect', 'table']);
export const isVisualBlock = (b: Block) => VISUAL_TYPES.has(b.type) && (b.type !== 'visual' || b.visual?.kind !== 'image');

const without = <T,>(list: T[], i: number) => list.filter((_, k) => k !== i);
const replaceAt = <T,>(list: T[], i: number, v: T) => list.map((x, k) => (k === i ? v : x));

function Field({ value, onChange, colors, placeholder, bold, center, testID, multiline = true, style }: {
  value: string; onChange: (v: string) => void; colors: AppColors; placeholder?: string; bold?: boolean; center?: boolean; testID?: string; multiline?: boolean; style?: any;
}) {
  return (
    <TextInput
      testID={testID}
      value={value || ''}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={[{ fontSize: 14, lineHeight: 20, color: colors.textMain, fontWeight: bold ? '800' : '500', textAlign: center ? 'center' : 'left', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.borderColor + '99', borderStyle: 'dashed', outlineStyle: 'none' } as any, style]}
    />
  );
}

function X({ onPress, colors, testID, light }: { onPress: () => void; colors: AppColors; testID?: string; light?: boolean }) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} hitSlop={6} style={{ padding: 3 }}>
      <Feather name="x" size={13} color={light ? '#ffffffcc' : colors.textMuted} />
    </TouchableOpacity>
  );
}

function Add({ label, onPress, colors, testID, disabled }: { label: string; onPress: () => void; colors: AppColors; testID?: string; disabled?: boolean }) {
  if (disabled) return null;
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={{ paddingVertical: 4 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>+ {label}</Text>
    </TouchableOpacity>
  );
}

// Side-by-side columns: coloured heading + bullet points, typed straight into the diagram.
function Columns({ columns, colors, onChange, single }: { columns: { label: string; points: string[] }[]; colors: AppColors; onChange: (c: { label: string; points: string[] }[]) => void; single?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {columns.map((col, ci) => {
          const tint = TINTS[ci % TINTS.length];
          const setCol = (patch: Partial<typeof col>) => onChange(replaceAt(columns, ci, { ...col, ...patch }));
          return (
            <View key={ci} testID={`vcol-${ci}`} style={{ flex: 1, minWidth: 200, borderWidth: 1.5, borderColor: tint, borderRadius: 12, overflow: 'hidden' }}>
              <View style={{ backgroundColor: tint, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4 }}>
                <Field testID={`vcol-label-${ci}`} value={col.label} onChange={(label) => setCol({ label })} colors={colors} bold center multiline={false} placeholder="Heading" style={{ flex: 1, color: '#fff' }} />
                {columns.length > 2 && <X light colors={colors} testID={`vcol-remove-${ci}`} onPress={() => onChange(without(columns, ci))} />}
              </View>
              <View style={{ padding: 8, gap: 2, backgroundColor: tint + '0D' }}>
                {col.points.map((p, pi) => (
                  <View key={pi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 2 }}>
                    <Text style={{ color: colors.textMain, paddingTop: 5 }}>{single ? '' : '•'}</Text>
                    <Field testID={`vcol-point-${ci}-${pi}`} value={p} onChange={(v) => setCol({ points: replaceAt(col.points, pi, v) })} colors={colors} placeholder="Point" style={{ flex: 1 }} />
                    {!single && col.points.length > 1 && <X colors={colors} testID={`vcol-point-remove-${ci}-${pi}`} onPress={() => setCol({ points: without(col.points, pi) })} />}
                  </View>
                ))}
                {!single && <Add testID={`vcol-point-add-${ci}`} label="Point" colors={colors} disabled={col.points.length >= LIMITS.points} onPress={() => setCol({ points: [...col.points, ''] })} />}
              </View>
            </View>
          );
        })}
      </View>
      <Add testID="vcol-add" label="Column" colors={colors} disabled={columns.length >= LIMITS.columns} onPress={() => onChange([...columns, { label: '', points: [''] }])} />
    </View>
  );
}

function Flow({ steps, colors, onChange }: { steps: string[]; colors: AppColors; onChange: (s: string[]) => void }) {
  return (
    <View style={{ gap: 2 }}>
      {steps.map((s, i) => {
        const tint = TINTS[i % TINTS.length];
        return (
          <React.Fragment key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: tint, backgroundColor: tint + '14', borderRadius: 12, paddingHorizontal: 8 }}>
              <Text style={{ fontWeight: '800', color: tint }}>{i + 1}.</Text>
              <Field testID={`vflow-${i}`} value={s} onChange={(v) => onChange(replaceAt(steps, i, v))} colors={colors} center placeholder="Step" style={{ flex: 1 }} />
              {steps.length > 2 && <X colors={colors} testID={`vflow-remove-${i}`} onPress={() => onChange(without(steps, i))} />}
            </View>
            {i < steps.length - 1 && <View style={{ alignItems: 'center' }}><Feather name="arrow-down" size={16} color={colors.textMuted} /></View>}
          </React.Fragment>
        );
      })}
      <Add testID="vflow-add" label="Step" colors={colors} disabled={steps.length >= LIMITS.steps} onPress={() => onChange([...steps, ''])} />
    </View>
  );
}

function Timeline({ events, colors, onChange }: { events: { when: string; what: string }[]; colors: AppColors; onChange: (e: { when: string; what: string }[]) => void }) {
  return (
    <View style={{ paddingLeft: 4 }}>
      {events.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ alignItems: 'center', width: 14 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: TINTS[i % TINTS.length], marginTop: 8 }} />
            {i < events.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.borderColor }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Field testID={`vtime-when-${i}`} value={e.when} onChange={(v) => onChange(replaceAt(events, i, { ...e, when: v }))} colors={colors} bold multiline={false} placeholder="When" style={{ flex: 1 }} />
              {events.length > 2 && <X colors={colors} testID={`vtime-remove-${i}`} onPress={() => onChange(without(events, i))} />}
            </View>
            <Field testID={`vtime-what-${i}`} value={e.what} onChange={(v) => onChange(replaceAt(events, i, { ...e, what: v }))} colors={colors} placeholder="What happened" />
          </View>
        </View>
      ))}
      <Add testID="vtime-add" label="Event" colors={colors} disabled={events.length >= LIMITS.events} onPress={() => onChange([...events, { when: '', what: '' }])} />
    </View>
  );
}

function CauseEffect({ pairs, colors, onChange }: { pairs: { cause: string; effect: string }[]; colors: AppColors; onChange: (p: { cause: string; effect: string }[]) => void }) {
  const box = (tint: string) => ({ flex: 1, borderWidth: 1.5, borderColor: tint, backgroundColor: tint + '14', borderRadius: 12, paddingHorizontal: 6 });
  return (
    <View style={{ gap: 8 }}>
      {pairs.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={box(TINTS[0])}><Field testID={`vce-cause-${i}`} value={p.cause} onChange={(v) => onChange(replaceAt(pairs, i, { ...p, cause: v }))} colors={colors} center placeholder="Cause" /></View>
          <Feather name="arrow-right" size={16} color={colors.textMuted} />
          <View style={box(TINTS[1])}><Field testID={`vce-effect-${i}`} value={p.effect} onChange={(v) => onChange(replaceAt(pairs, i, { ...p, effect: v }))} colors={colors} center placeholder="Effect" /></View>
          {pairs.length > 1 && <X colors={colors} testID={`vce-remove-${i}`} onPress={() => onChange(without(pairs, i))} />}
        </View>
      ))}
      <Add testID="vce-add" label="Cause → effect" colors={colors} disabled={pairs.length >= LIMITS.pairs} onPress={() => onChange([...pairs, { cause: '', effect: '' }])} />
    </View>
  );
}

function Web({ center, nodes, colors, onChange }: { center: string; nodes: { label: string; note?: string }[]; colors: AppColors; onChange: (center: string, nodes: { label: string; note?: string }[]) => void }) {
  return (
    <View style={{ gap: 10, alignItems: 'center' }}>
      <View style={{ borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primary + '14', borderRadius: 999, paddingHorizontal: 16, minWidth: 180 }}>
        <Field testID="vweb-center" value={center} onChange={(v) => onChange(v, nodes)} colors={colors} bold center multiline={false} placeholder="Main idea" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {nodes.map((n, i) => {
          const tint = TINTS[i % TINTS.length];
          return (
            <View key={i} style={{ width: 200, borderWidth: 1.5, borderColor: tint, backgroundColor: tint + '10', borderRadius: 12, padding: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Field testID={`vweb-label-${i}`} value={n.label} onChange={(v) => onChange(center, replaceAt(nodes, i, { ...n, label: v }))} colors={colors} bold multiline={false} placeholder="Idea" style={{ flex: 1 }} />
                {nodes.length > 2 && <X colors={colors} testID={`vweb-remove-${i}`} onPress={() => onChange(center, without(nodes, i))} />}
              </View>
              <Field value={n.note || ''} onChange={(v) => onChange(center, replaceAt(nodes, i, { ...n, note: v }))} colors={colors} placeholder="Note (optional)" style={{ fontSize: 12.5 }} />
            </View>
          );
        })}
      </View>
      <Add testID="vweb-add" label="Idea" colors={colors} disabled={nodes.length >= LIMITS.nodes} onPress={() => onChange(center, [...nodes, { label: '' }])} />
    </View>
  );
}

function Venn({ v, colors, onChange }: { v: any; colors: AppColors; onChange: (v: any) => void }) {
  const part = (key: 'left' | 'right' | 'both', tint: string, label?: string) => {
    const items: string[] = key === 'both' ? v.both || [] : v[key]?.items || [];
    const setItems = (next: string[]) => onChange(key === 'both' ? { ...v, both: next } : { ...v, [key]: { ...v[key], items: next } });
    return (
      <View style={{ flex: 1, minWidth: 170, borderWidth: 2, borderColor: tint, backgroundColor: tint + '12', borderRadius: 16, padding: 8, gap: 2 }}>
        {key === 'both'
          ? <Text style={{ textAlign: 'center', fontWeight: '800', color: colors.textMuted, paddingVertical: 4 }}>Both</Text>
          : <Field testID={`vvenn-label-${key}`} value={label || ''} onChange={(t) => onChange({ ...v, [key]: { ...v[key], label: t } })} colors={colors} bold center multiline={false} placeholder="Label" />}
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Field testID={`vvenn-${key}-${i}`} value={it} onChange={(t) => setItems(replaceAt(items, i, t))} colors={colors} placeholder="Point" style={{ flex: 1 }} />
            {items.length > 1 && <X colors={colors} onPress={() => setItems(without(items, i))} />}
          </View>
        ))}
        <Add label="Point" colors={colors} disabled={items.length >= LIMITS.vennItems} onPress={() => setItems([...items, ''])} />
      </View>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {part('left', TINTS[0], v.left?.label)}
      {part('both', '#888888')}
      {part('right', TINTS[1], v.right?.label)}
    </View>
  );
}

// A table edited like a spreadsheet: type in any cell, add or remove rows and columns.
export function TableGrid({ headers, rows, colors, onChange }: { headers: string[]; rows: string[][]; colors: AppColors; onChange: (headers: string[], rows: string[][]) => void }) {
  const cols = headers.length;
  const cellW = 170;
  const cell = { width: cellW, borderRightWidth: 1, borderColor: colors.borderColor, minHeight: 38, justifyContent: 'center' as const };
  const fit = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? '');
  const grid = rows.map(fit);
  return (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={{ flexDirection: 'row', paddingLeft: 30 }}>
            {headers.map((_, ci) => (
              <View key={ci} style={{ width: cellW, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                <TouchableOpacity testID={`vtable-col-left-${ci}`} disabled={ci === 0} onPress={() => {
                  const swap = <T,>(a: T[]) => { const c = [...a]; [c[ci - 1], c[ci]] = [c[ci], c[ci - 1]]; return c; };
                  onChange(swap(headers), grid.map(swap));
                }} style={{ opacity: ci === 0 ? 0.2 : 1, padding: 2 }}>
                  <Feather name="chevron-left" size={13} color={colors.textMuted} />
                </TouchableOpacity>
                {cols > 2 && <X colors={colors} testID={`vtable-col-remove-${ci}`} onPress={() => onChange(without(headers, ci), grid.map((r) => without(r, ci)))} />}
              </View>
            ))}
          </View>
          <View style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', backgroundColor: TINTS[0] + '22' }}>
              <View style={{ width: 30 }} />
              {headers.map((h, ci) => (
                <View key={ci} style={cell}>
                  <Field testID={`vtable-h-${ci}`} value={h} onChange={(v) => onChange(replaceAt(headers, ci, v), grid)} colors={colors} bold multiline={false} placeholder={`Heading ${ci + 1}`} />
                </View>
              ))}
            </View>
            {grid.map((r, ri) => (
              <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.borderColor, backgroundColor: ri % 2 ? colors.cardDark : 'transparent' }}>
                <View style={{ width: 30, alignItems: 'center', justifyContent: 'center' }}>
                  {grid.length > 1 && <X colors={colors} testID={`vtable-row-remove-${ri}`} onPress={() => onChange(headers, without(grid, ri))} />}
                </View>
                {r.map((c, ci) => (
                  <View key={ci} style={cell}>
                    <Field testID={`vtable-c-${ri}-${ci}`} value={c} onChange={(v) => onChange(headers, replaceAt(grid, ri, replaceAt(r, ci, v)))} colors={colors} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Add testID="vtable-row-add" label="Row" colors={colors} disabled={grid.length >= LIMITS.tableRows} onPress={() => onChange(headers, [...grid, headers.map(() => '')])} />
        <Add testID="vtable-col-add" label="Column" colors={colors} disabled={cols >= LIMITS.tableCols} onPress={() => onChange([...headers, ''], grid.map((r) => [...r, '']))} />
      </View>
    </View>
  );
}

// Edits a drawn block in its own shape — the columns, flow, timeline, table… exactly as students see it.
export default function VisualBlockEditor({ block, colors, onChange }: { block: Block; colors: AppColors; onChange: (b: Block) => void }) {
  const titleKey = block.type === 'table' ? 'caption' : 'title';
  const title = block.type === 'visual' ? block.visual?.title : block[titleKey];
  const setTitle = (t: string) => onChange(block.type === 'visual' ? { ...block, visual: { ...block.visual, title: t } } : { ...block, [titleKey]: t });

  let body: React.ReactNode = null;
  if (block.type === 'visual') {
    const v = block.visual || {};
    const setV = (patch: object) => onChange({ ...block, visual: { ...v, ...patch } });
    if (v.kind === 'compare') body = <Columns columns={v.columns || []} colors={colors} onChange={(columns) => setV({ columns })} />;
    else if (v.kind === 'flow') body = <Flow steps={v.steps || []} colors={colors} onChange={(steps) => setV({ steps })} />;
    else if (v.kind === 'timeline') body = <Timeline events={v.events || []} colors={colors} onChange={(events) => setV({ events })} />;
    else if (v.kind === 'cause_effect') body = <CauseEffect pairs={v.pairs || []} colors={colors} onChange={(pairs) => setV({ pairs })} />;
    else if (v.kind === 'table') body = <TableGrid headers={v.headers || []} rows={v.rows || []} colors={colors} onChange={(headers, rows) => setV({ headers, rows })} />;
    else if (v.kind === 'web') body = <Web center={v.center || ''} nodes={v.nodes || []} colors={colors} onChange={(center, nodes) => setV({ center, nodes })} />;
    else if (v.kind === 'venn') body = <Venn v={v} colors={colors} onChange={(next) => onChange({ ...block, visual: next })} />;
  } else if (block.type === 'process') {
    body = <Flow steps={(block.steps || []).map((s: any) => (typeof s === 'string' ? s : s?.action || s?.explanation || ''))} colors={colors} onChange={(steps) => onChange({ ...block, steps })} />;
  } else if (block.type === 'comparison') {
    const items: any[] = block.items || [];
    body = (
      <Columns
        single
        columns={items.map((it) => ({ label: it.name || it.label || '', points: [it.description || it.value || ''] }))}
        colors={colors}
        onChange={(cols) => onChange({ ...block, items: cols.map((c) => ({ name: c.label, description: c.points[0] || '' })) })}
      />
    );
  } else if (block.type === 'timeline') {
    body = <Timeline events={(block.events || []).map((e: any) => ({ when: e.date || '', what: e.description || '' }))} colors={colors} onChange={(ev) => onChange({ ...block, events: ev.map((e) => ({ date: e.when, description: e.what })) })} />;
  } else if (block.type === 'cause_and_effect') {
    body = <CauseEffect pairs={(block.items || []).map((p: any) => ({ cause: p.cause || '', effect: p.effect || '' }))} colors={colors} onChange={(items) => onChange({ ...block, items })} />;
  } else if (block.type === 'table') {
    body = <TableGrid headers={block.headers || ['', '']} rows={block.rows || [['', '']]} colors={colors} onChange={(headers, rows) => onChange({ ...block, headers, rows })} />;
  }

  return (
    <View testID="visual-block-editor" style={{ gap: 8 }}>
      <Field testID="visual-title" value={title || ''} onChange={setTitle} colors={colors} bold multiline={false} placeholder="Title (optional)" style={{ fontSize: 16 }} />
      {body || <Text style={{ fontSize: 12.5, color: colors.textMuted }}>This drawing can&apos;t be edited here.</Text>}
    </View>
  );
}
