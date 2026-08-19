import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  feedbackAnim: Animated.Value;
  onSubmit: (rating: number) => void;
  onDismiss: () => void;
  styles: any;
  colors: AppColors;
}

export default function FeedbackStrip({ feedbackAnim, onSubmit, onDismiss, styles, colors }: Props) {
  return (
    <Animated.View style={[
      styles.feedbackStrip,
      { opacity: feedbackAnim, transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
    ]}>
      <Text style={styles.feedbackLabel}>How is Aivorah doing?</Text>
      <View style={styles.feedbackBtns}>
        {([1, 2, 3] as const).map(r => (
          <TouchableOpacity key={r} style={styles.feedbackBtn} onPress={() => onSubmit(r)} activeOpacity={0.7}>
            <Text style={styles.feedbackBtnText}>{r === 1 ? '👎' : r === 2 ? '😐' : '👍'}</Text>
            <Text style={styles.feedbackBtnNum}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity testID="feedbackDismiss" onPress={onDismiss} style={styles.feedbackSkip}>
        <Feather name="x" size={14} color={colors.textDim} />
      </TouchableOpacity>
    </Animated.View>
  );
}
