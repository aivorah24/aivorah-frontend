import React, { useEffect, useState } from 'react';
import { Animated, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

export type ToastMessage = { kind: 'success' | 'error'; title: string; detail?: string };

const DURATION_MS = 4000;

// Small floating confirmation in the corner that fades in, then out after a few seconds.
export default function Toast({ toast, colors, onClose }: { toast: ToastMessage | null; colors: AppColors; onClose: () => void }) {
  const [fade] = useState(() => new Animated.Value(0));
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (!toast) return undefined;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: native }).start();
    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => onClose());
    }, DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  const tint = toast.kind === 'success' ? colors.accentGreen : '#C0392B';
  return (
    <Animated.View
      testID="toast"
      pointerEvents="box-none"
      style={{
        position: 'absolute', right: 20, bottom: 20, maxWidth: 380, opacity: fade,
        transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
        backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderLeftWidth: 4, borderLeftColor: tint,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
      }}>
        <Feather name={toast.kind === 'success' ? 'check-circle' : 'alert-circle'} size={18} color={tint} style={{ marginTop: 1 }} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}>{toast.title}</Text>
          {!!toast.detail && <Text style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 2 }}>{toast.detail}</Text>}
        </View>
        <TouchableOpacity testID="toast-close" onPress={onClose} hitSlop={8}>
          <Feather name="x" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
