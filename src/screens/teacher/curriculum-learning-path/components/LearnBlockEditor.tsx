import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import { TeacherContentBlock } from '../types';

// Fields that are data, not wording the teacher should edit.
export const HIDDEN_KEYS = new Set(['type', 'url', 'exampleType', 'synthetic', 'bookPage', 'step', 'step_number', 'correctIndex']);

export const LABELS: Record<string, string> = {
  overview: 'Overview', explanation: 'Explanation', key_terms: 'Key terms', key_points: 'Key points', example: 'Example',
  worked_example: 'Worked example', formula: 'Formula', process: 'Steps', comparison: 'Comparison', table: 'Table',
  activity: 'Activity', tip: 'Tip', common_mistake: 'Common mistake', image: 'Picture', visual: 'Diagram', timeline: 'Timeline', cause_and_effect: 'Cause and effect',
};

export function setAt(value: any, path: (string | number)[], next: string): any {
  if (!path.length) return next;
  const [head, ...rest] = path;
  const copy = Array.isArray(value) ? [...value] : { ...value };
  copy[head as any] = setAt(value[head as any], rest, next);
  return copy;
}

// Every string inside a block, with its path, so any block type can be edited without a per-type form.
export function textFields(value: any, path: (string | number)[] = []): { path: (string | number)[]; label: string; text: string }[] {
  if (typeof value === 'string') return [{ path, label: String(path[path.length - 1] ?? ''), text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => textFields(v, [...path, i]));
  if (value && typeof value === 'object') {
    return Object.keys(value).filter((k) => !HIDDEN_KEYS.has(k)).flatMap((k) => textFields(value[k], [...path, k]));
  }
  return [];
}

export default function LearnBlockEditor({
  blocks, colors, onChange,
}: { blocks: TeacherContentBlock[]; colors: AppColors; onChange: (blocks: TeacherContentBlock[]) => void }) {
  const input = { fontSize: 13.5, lineHeight: 20, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, padding: 8 } as const;
  return (
    <View testID="learn-block-editor" style={{ gap: 12 }}>
      {blocks.map((block, bi) => (
        <View key={bi} style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 10, padding: 10, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
              {LABELS[block.type] || block.type}{block.exampleType === 'SOURCE_DERIVED' ? ' · from the book' : ''}
            </Text>
            <TouchableOpacity testID={`remove-block-${bi}`} onPress={() => onChange(blocks.filter((_, k) => k !== bi))}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Remove</Text>
            </TouchableOpacity>
          </View>
          {textFields(block).map((f) => (
            <TextInput
              key={f.path.join('.')}
              testID={`block-${bi}-${f.path.join('.')}`}
              value={f.text}
              multiline
              onChangeText={(v) => onChange(blocks.map((b, k) => (k === bi ? setAt(b, f.path, v) : b)))}
              style={input}
            />
          ))}
        </View>
      ))}
      <TouchableOpacity testID="add-explanation-block" onPress={() => onChange([...blocks, { type: 'explanation', text: '' }])}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>+ Add paragraph</Text>
      </TouchableOpacity>
    </View>
  );
}
