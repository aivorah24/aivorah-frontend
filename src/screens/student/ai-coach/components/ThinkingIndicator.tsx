import React, { useEffect, useMemo } from 'react';
import { View, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

export default function ThinkingIndicator({ colors }: { colors: AppColors }) {
  const shimmer = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4 }}>
      <Animated.View style={{
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: colors.accentYellow,
        opacity: shimmer,
      }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="zap" size={10} color="#fff" />
        </View>
      </Animated.View>
      <Animated.Text style={{ fontSize: 13, color: colors.textMuted, opacity: shimmer, fontWeight: '500' }}>
        Aivorah is thinking...
      </Animated.Text>
    </View>
  );
}
