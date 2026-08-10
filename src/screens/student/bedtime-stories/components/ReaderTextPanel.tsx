import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  sceneIcon: string;
  sceneLabel: string;
  paragraphs: { token: string; gi: number }[][];
  wordIndex: number;
  isHighlightActive: boolean;
  pastelAccent: string;
  textMain: string;
  textMuted: string;
  styles: any;
}

export default function ReaderTextPanel({
  sceneIcon, sceneLabel, paragraphs, wordIndex, isHighlightActive,
  pastelAccent, textMain, textMuted, styles,
}: Props) {
  return (
    <>
      {/* Panel header — scene icon + label, like a storybook chapter heading */}
      <View style={styles.panelHeader}>
        <View style={[styles.panelHeaderIcon, { backgroundColor: pastelAccent + '26' }]}>
          <Feather name={sceneIcon as any} size={15} color={pastelAccent} />
        </View>
        <Text style={[styles.panelHeaderText, { color: pastelAccent }]} numberOfLines={1}>
          {sceneLabel}
        </Text>
      </View>

      {/* Story text — serif, paragraph blocks with a divider, word-by-word highlight.
          Each word keeps its GLOBAL index (gi) so highlighting matches the flat wordIndex. */}
      <View style={styles.storyBody}>
        <View style={[styles.storyAccentBar, { backgroundColor: pastelAccent + '88' }]} />
        <View style={{ flex: 1 }}>
          {paragraphs.map((para, pi) => (
            <React.Fragment key={pi}>
              {pi > 0 && (
                <View style={styles.paraDivider}>
                  <View style={[styles.paraDividerLine, { backgroundColor: pastelAccent + '33' }]} />
                  <Feather name="star" size={11} color={pastelAccent + 'AA'} />
                  <View style={[styles.paraDividerLine, { backgroundColor: pastelAccent + '33' }]} />
                </View>
              )}
              <Text style={styles.storyText}>
                {para.map(({ token, gi }, li) => {
                  const isCurrent = isHighlightActive && gi === wordIndex;
                  const isPast    = gi < wordIndex;
                  const display   = li === para.length - 1 ? token.replace(/\s+$/, '') : token;
                  return (
                    <Text
                      key={gi}
                      style={{
                        color:           isCurrent ? pastelAccent : isPast ? textMuted : textMain,
                        fontWeight:      isCurrent ? '700' : '400',
                        backgroundColor: isCurrent ? pastelAccent + '30' : 'transparent',
                      }}
                    >
                      {display}
                    </Text>
                  );
                })}
              </Text>
            </React.Fragment>
          ))}
        </View>
      </View>
    </>
  );
}
