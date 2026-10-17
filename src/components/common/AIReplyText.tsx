import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { AppColors } from '../../theme';
import { parseAIReply, blockWords } from '../../utils/aiReply';
import type { ReadPosition } from '../../hooks/useReplyReader';

interface Props {
  text: string;
  colors: AppColors;
  // Line/row and word currently being read aloud, if any.
  position?: ReadPosition | null;
  fontSize?: number;
  lineHeight?: number;
}

// Renders an AI reply: bold, bullets, numbered steps, headings, dividers and
// markdown tables, highlighting whatever is being read aloud.
export default function AIReplyText({ text, colors, position, fontSize = 15, lineHeight = 24 }: Props) {
  const blocks = useMemo(() => parseAIReply(text), [text]);
  const hl = { backgroundColor: colors.accentYellow + '30', color: colors.accentYellow, fontWeight: '700' as const };

  return (
    <View style={{ gap: 5 }}>
      {blocks.map((b, bi) => {
        const reading = position?.block === bi;

        if (b.kind === 'rule') {
          return <View key={bi} testID="ai-reply-rule" style={[s.rule, { backgroundColor: colors.borderColor }]} />;
        }

        if (b.kind === 'table') {
          const cols = Math.max(b.header.length, ...b.rows.map((r) => r.length));
          return (
            <ScrollView key={bi} horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              <View testID="ai-reply-table" style={[s.table, { borderColor: colors.borderColor }]}>
                <View style={[s.row, { backgroundColor: colors.accentYellow + '18', borderColor: colors.borderColor }]}>
                  {Array.from({ length: cols }).map((_, ci) => (
                    <Text key={ci} style={[s.cell, { fontSize: fontSize - 1, color: colors.textMain, fontWeight: '700', borderColor: colors.borderColor }]}>
                      {b.header[ci] ?? ''}
                    </Text>
                  ))}
                </View>
                {b.rows.map((r, ri) => {
                  const on = reading && position?.row === ri;
                  return (
                    <View key={ri} style={[s.row, { borderColor: colors.borderColor }, on && { backgroundColor: colors.accentYellow + '30' }]}>
                      {Array.from({ length: cols }).map((_, ci) => (
                        <Text key={ci} style={[s.cell, { fontSize: fontSize - 1, color: on ? colors.accentYellow : colors.textMain, borderColor: colors.borderColor }]}>
                          {r[ci] ?? ''}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          );
        }

        const t = b.text;
        const isStep = /^step\s*\d+[:.→]/i.test(t);
        const isAnswer = /^answer[:.]/i.test(t);
        const isPractice = /^(try this|practice|here is a question|question)[:.]/i.test(t);
        const words = blockWords(t);
        const marker = b.kind === 'bullet' ? '•' : b.kind === 'numbered' ? b.marker : null;
        return (
          <View key={bi} style={{ flexDirection: 'row', paddingLeft: marker ? 14 : 0, marginTop: (isStep || isAnswer || isPractice || b.kind === 'heading') && bi > 0 ? 8 : 2 }}>
            {marker && <Text style={{ fontSize, color: colors.textMuted, marginRight: 6, lineHeight }}>{marker}</Text>}
            <Text
              style={[
                { fontSize, color: colors.textMain, lineHeight, flex: 1 },
                b.kind === 'heading' && { fontWeight: '700', fontSize: fontSize + 1 },
                isStep && { fontWeight: '700', color: colors.accentYellow },
                isAnswer && { fontWeight: '700', color: '#4A9E70' },
                isPractice && { fontWeight: '600', color: colors.textMuted, fontStyle: 'italic' as const },
                reading && { backgroundColor: colors.accentYellow + '12' },
              ] as any}
            >
              {words.map((w, wi) => (
                <Text key={wi} style={[w.bold && { fontWeight: '700' }, reading && position?.word === wi && hl] as any}>
                  {w.word}{wi < words.length - 1 ? ' ' : ''}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  rule: { height: 1, marginVertical: 8, opacity: 0.7 },
  table: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { minWidth: 96, maxWidth: 220, paddingHorizontal: 10, paddingVertical: 7, borderRightWidth: StyleSheet.hairlineWidth },
});
