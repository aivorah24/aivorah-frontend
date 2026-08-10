import React from 'react';
import { View, Text } from 'react-native';
import type { AppColors } from '../../../../theme';

// Render markdown-style AI text with bullets, bold, and structure
export default function FormattedAIText({ text, colors }: { text: string; colors: AppColors }) {
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <View style={{ gap: 5 }}>
      {lines.map((line, li) => {
        const trimmed = line.trim();
        const isStep = /^step\s*\d+[:.]/i.test(trimmed);
        const isAnswer = /^answer[:.]/i.test(trimmed);
        const isPractice = /^(try this|practice|here is a question|question)[:.]/i.test(trimmed);
        const isOption = /^[A-D][).]/.test(trimmed);
        const isBullet = /^[-•]\s/.test(trimmed);
        const isNumbered = /^\d+[.)]\s/.test(trimmed);

        const parts = trimmed.replace(/^[-•]\s+/, '').replace(/^\d+[.)]\s+/, '');
        const boldRegex = /\*\*(.*?)\*\*/g;
        const segments: { text: string; bold: boolean }[] = [];
        let lastIdx = 0;
        let match;
        const source = isBullet || isNumbered ? parts : trimmed;
        while ((match = boldRegex.exec(source)) !== null) {
          if (match.index > lastIdx) segments.push({ text: source.slice(lastIdx, match.index), bold: false });
          segments.push({ text: match[1], bold: true });
          lastIdx = match.index + match[0].length;
        }
        if (lastIdx < source.length) segments.push({ text: source.slice(lastIdx), bold: false });

        return (
          <View key={li} style={{ flexDirection: 'row', paddingLeft: (isBullet || isNumbered || isOption) ? 14 : 0, marginTop: (isStep || isAnswer || isPractice) && li > 0 ? 8 : 2 }}>
            {(isBullet || isNumbered) && (
              <Text style={{ fontSize: 15, color: colors.textMuted, marginRight: 6, lineHeight: 24 }}>
                {isNumbered ? trimmed.match(/^\d+[.)]/)?.[0] || '•' : '•'}
              </Text>
            )}
            <Text style={[
              { fontSize: 15, color: colors.textMain, lineHeight: 24, flex: 1 },
              isStep && { fontWeight: '700', color: colors.accentYellow },
              isAnswer && { fontWeight: '700', color: '#4A9E70' },
              isPractice && { fontWeight: '600', color: colors.textMuted, fontStyle: 'italic' as const },
              isOption && { color: colors.textMain },
            ] as any}>
              {segments.map((seg, si) => (
                <Text key={si} style={seg.bold ? { fontWeight: '700' } : undefined}>{seg.text}</Text>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
