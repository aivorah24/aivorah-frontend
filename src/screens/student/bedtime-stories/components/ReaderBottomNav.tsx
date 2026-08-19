import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  currentPage: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  sceneLabel: string;
  pastelAccent: string;
  bgDark: string;
  cardDark: string;
  borderColor: string;
  textMain: string;
  textDim: string;
  textMuted: string;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  styles: any;
}

export default function ReaderBottomNav({
  currentPage, totalPages, isFirst, isLast, sceneLabel, pastelAccent,
  bgDark, cardDark, borderColor, textMain, textDim, textMuted,
  onPrev, onNext, onFinish, styles,
}: Props) {
  return (
    <View style={[styles.bottomNav, { backgroundColor: bgDark, borderTopColor: borderColor }]}>
      <TouchableOpacity
        testID="readerPrev"
        style={[styles.navArrow, { borderColor, backgroundColor: cardDark, opacity: isFirst ? 0.3 : 1 }]}
        onPress={onPrev} disabled={isFirst} activeOpacity={0.8}
      >
        <Feather name="chevron-left" size={22} color={textMain} />
      </TouchableOpacity>

      <View style={styles.navCenter}>
        <Text style={[styles.navPageNum, { color: pastelAccent }]}>
          {currentPage + 1} <Text style={[styles.navPageOf, { color: textDim }]}>of {totalPages}</Text>
        </Text>
        <Text style={[styles.navSceneLabel, { color: textMuted }]} numberOfLines={1}>{sceneLabel}</Text>
      </View>

      {isLast ? (
        <TouchableOpacity
          style={[styles.navFinish, { backgroundColor: pastelAccent }]}
          onPress={onFinish} activeOpacity={0.85}
        >
          <Feather name="check-circle" size={16} color="#fff" />
          <Text style={styles.navFinishText}>Finished</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          testID="readerNext"
          style={[styles.navArrow, { backgroundColor: pastelAccent, borderColor: 'transparent' }]}
          onPress={onNext} activeOpacity={0.85}
        >
          <Feather name="chevron-right" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
