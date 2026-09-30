import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import LearningBlocks from '../../../student/learning-paths/lesson-screen/components/LearningBlocks';
import { LABELS, setAt, textFields } from '../../curriculum-learning-path/components/LearnBlockEditor';
import { pickLessonImage } from './pickLessonImage';
import VisualBlockEditor, { isVisualBlock } from './VisualBlockEditor';
import { blockToVisual } from '../../../student/learning-paths/lesson-screen/utils/blockVisual';

type Block = { type: string; [k: string]: any };

const INSERTS: { label: string; icon: any; make: () => Block | 'image' }[] = [
  { label: 'Paragraph', icon: 'align-left', make: () => ({ type: 'explanation', text: '' }) },
  { label: 'Key points', icon: 'list', make: () => ({ type: 'key_points', items: [''] }) },
  { label: 'Example', icon: 'check-circle', make: () => ({ type: 'example', text: '' }) },
  { label: 'Activity', icon: 'edit-3', make: () => ({ type: 'activity', text: '' }) },
  { label: 'Tip', icon: 'info', make: () => ({ type: 'tip', text: '' }) },
  { label: 'Key terms', icon: 'book', make: () => ({ type: 'key_terms', items: [{ term: '', definition: '' }] }) },
  { label: 'Table', icon: 'grid', make: () => ({ type: 'table', caption: '', headers: ['', ''], rows: [['', ''], ['', '']] }) },
  { label: 'Columns', icon: 'columns', make: () => ({ type: 'visual', visual: { kind: 'compare', title: '', columns: [{ label: '', points: [''] }, { label: '', points: [''] }] } }) },
  { label: 'Steps', icon: 'arrow-down-circle', make: () => ({ type: 'process', title: '', steps: ['', ''] }) },
  { label: 'Picture', icon: 'image', make: () => 'image' },
];

const FIELD_NAMES: Record<string, string> = {
  text: 'Text', caption: 'Caption', problem: 'Problem', finalAnswer: 'Answer', title: 'Title', term: 'Word', definition: 'Meaning',
  action: 'Step', explanation: 'Explanation', equation: 'Working', calculation: 'Working', why: 'Why', alt_text: 'Describe the picture',
};
const fieldLabel = (path: (string | number)[]) => {
  const last = path[path.length - 1];
  if (typeof last === 'number') {
    const parent = String(path[path.length - 2] ?? '');
    if (parent === 'items') return `Point ${last + 1}`;
    if (parent === 'headers') return `Column ${last + 1}`;
    if (typeof path[path.length - 2] === 'number') return `Row ${Number(path[path.length - 2]) + 1} · cell ${last + 1}`;
    return `${last + 1}`;
  }
  return FIELD_NAMES[String(last)] || String(last);
};

function InsertBar({ colors, busy, onInsert }: { colors: AppColors; busy: boolean; onInsert: (b: Block | 'image') => void }) {
  const [open, setOpen] = useState(false);
  if (busy) return <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 6 }} />;
  return (
    <View style={{ alignItems: 'center', marginVertical: 2 }}>
      {!open ? (
        <TouchableOpacity testID="insert-open" onPress={() => setOpen(true)} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="plus" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.primary + '0D' }}>
          {INSERTS.map((ins) => (
            <TouchableOpacity key={ins.label} testID={`insert-${ins.label}`} onPress={() => { setOpen(false); onInsert(ins.make()); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor }}>
              <Feather name={ins.icon} size={13} color={colors.primary} />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.textMain }}>{ins.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setOpen(false)} style={{ padding: 6 }}>
            <Feather name="x" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function BlockForm({ block, colors, onChange, onReplaceImage }: { block: Block; colors: AppColors; onChange: (b: Block) => void; onReplaceImage: () => void }) {
  if (isVisualBlock(block)) return <VisualBlockEditor block={block} colors={colors} onChange={onChange} />;
  const input = { fontSize: 13.5, lineHeight: 20, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, padding: 8, backgroundColor: colors.bgDark } as const;
  const lineList = Array.isArray(block.items) && block.items.every((x: any) => typeof x === 'string');
  return (
    <View style={{ gap: 8 }}>
      {(block.type === 'image' || block.type === 'visual_representation') && (
        <View style={{ gap: 6 }}>
          {!!block.url && <Image source={{ uri: block.url }} style={{ width: '100%', height: 180, borderRadius: 8 }} resizeMode="contain" />}
          <TouchableOpacity testID="replace-image" onPress={onReplaceImage}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary }}>
            <Feather name="upload" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{block.url ? 'Replace with another picture' : 'Choose a picture'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {textFields(block).map((f) => (
        <View key={f.path.join('.')} style={{ gap: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{fieldLabel(f.path)}</Text>
          <TextInput testID={`field-${f.path.join('.')}`} value={f.text} multiline onChangeText={(v) => onChange(setAt(block, f.path, v))} style={input} />
        </View>
      ))}
      {lineList && (
        <TouchableOpacity testID="add-line" onPress={() => onChange({ ...block, items: [...block.items, ''] })}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>+ Add point</Text>
        </TouchableOpacity>
      )}
      {block.type === 'key_terms' && (
        <TouchableOpacity onPress={() => onChange({ ...block, items: [...(block.items || []), { term: '', definition: '' }] })}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>+ Add word</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Rise-style lesson canvas: each block looks exactly as the student sees it; click one to edit it in place,
// "+" between blocks adds a new one (text, points, example, table, picture...).
export default function BlockCanvas({ blocks, colors, onChange }: { blocks: Block[]; colors: AppColors; onChange: (blocks: Block[]) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [busyAt, setBusyAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const replace = (i: number, b: Block) => onChange(blocks.map((x, k) => (k === i ? b : x)));
  const moveBy = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const copy = [...blocks];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
    setSelected(j);
  };

  async function withPicture(at: number, apply: (url: string) => void) {
    setError('');
    setBusyAt(at);
    try {
      const url = await pickLessonImage();
      if (url) apply(url);
    } catch (e: any) {
      setError(e.message || 'Could not add the picture.');
    } finally {
      setBusyAt(null);
    }
  }

  function insertAt(at: number, b: Block | 'image') {
    if (b === 'image') {
      withPicture(at, (url) => {
        onChange([...blocks.slice(0, at), { type: 'image', url, caption: '' }, ...blocks.slice(at)]);
        setSelected(at);
      });
      return;
    }
    onChange([...blocks.slice(0, at), b, ...blocks.slice(at)]);
    setSelected(at);
  }

  const tool = (icon: any, onPress: () => void, testID: string, disabled = false) => (
    <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled} style={{ padding: 5, opacity: disabled ? 0.3 : 1 }}>
      <Feather name={icon} size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View testID="block-canvas" style={{ gap: 2 }}>
      {!!error && <Text style={{ fontSize: 12, color: '#C0392B' }}>{error}</Text>}
      <InsertBar colors={colors} busy={busyAt === 0} onInsert={(b) => insertAt(0, b)} />
      {blocks.map((block, i) => {
        const isSel = selected === i;
        return (
          <View key={i}>
            <View style={{ borderWidth: isSel ? 2 : 1, borderColor: isSel ? colors.primary : 'transparent', borderRadius: 12, padding: isSel ? 10 : 2 }}>
              {isSel ? (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.primary }}>{(LABELS[block.type] || block.type).toUpperCase()}</Text>
                    {tool('arrow-up', () => moveBy(i, -1), `block-up-${i}`, i === 0)}
                    {tool('arrow-down', () => moveBy(i, 1), `block-down-${i}`, i === blocks.length - 1)}
                    {tool('copy', () => { onChange([...blocks.slice(0, i + 1), JSON.parse(JSON.stringify(block)), ...blocks.slice(i + 1)]); }, `block-copy-${i}`)}
                    {tool('trash-2', () => { onChange(blocks.filter((_, k) => k !== i)); setSelected(null); }, `block-delete-${i}`)}
                    <TouchableOpacity testID={`block-done-${i}`} onPress={() => setSelected(null)} style={{ marginLeft: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primary }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <BlockForm block={block} colors={colors} onChange={(b) => replace(i, b)} onReplaceImage={() => withPicture(i, (url) => replace(i, { ...block, url }))} />
                </View>
              ) : (
                <TouchableOpacity testID={`block-${i}`} activeOpacity={0.8} onPress={() => setSelected(i)}>
                  <View pointerEvents="none">
                    <LearningBlocks blocks={[block]} colors={colors} />
                  </View>
                  <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity testID={`block-edit-${i}`} onPress={() => setSelected(i)} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor }}>
                      <Feather name="edit-2" size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity testID={`block-remove-${i}`} onPress={() => onChange(blocks.filter((_, k) => k !== i))} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor }}>
                      <Feather name="trash-2" size={13} color="#C0392B" />
                    </TouchableOpacity>
                  </View>
                  {isVisualBlock(block) && !blockToVisual(block) && (
                    <Text style={{ fontSize: 12, color: colors.textMuted, padding: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderColor, borderRadius: 8 }}>
                      {LABELS[block.type] || 'Diagram'}{block.title || block.caption || block.visual?.title ? ` — ${block.title || block.caption || block.visual?.title}` : ''} · click to fill it in (students see it once it has content)
                    </Text>
                  )}
                  {(block.type === 'image' || block.type === 'visual_representation') && !block.url && (
                    <Text style={{ fontSize: 12, color: colors.textMuted, padding: 8 }}>Picture — click to choose one</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <InsertBar colors={colors} busy={busyAt === i + 1} onInsert={(b) => insertAt(i + 1, b)} />
          </View>
        );
      })}
      {!blocks.length && <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>Empty lesson — use + to add the first part.</Text>}
    </View>
  );
}
