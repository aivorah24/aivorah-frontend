import React from 'react';
import { Text } from 'react-native';

// Read-along text: the word being spoken is highlighted, words already read are muted.
// Each token keeps its global index (gi) so it matches a flat wordIndex.
export default function HighlightedWords({
  tokens, wordIndex, active, accent, textMain, textMuted, style,
}: {
  tokens: { token: string; gi: number }[];
  wordIndex: number;
  active: boolean;
  accent: string;
  textMain: string;
  textMuted: string;
  style?: any;
}) {
  return (
    <Text style={style}>
      {tokens.map(({ token, gi }, li) => {
        const isCurrent = active && gi === wordIndex;
        const isPast = gi < wordIndex;
        const display = li === tokens.length - 1 ? token.replace(/\s+$/, '') : token;
        return (
          <Text
            key={gi}
            style={{
              color: isCurrent ? accent : isPast ? textMuted : textMain,
              fontWeight: isCurrent ? '700' : '400',
              backgroundColor: isCurrent ? accent + '30' : 'transparent',
            }}
          >
            {display}
          </Text>
        );
      })}
    </Text>
  );
}
