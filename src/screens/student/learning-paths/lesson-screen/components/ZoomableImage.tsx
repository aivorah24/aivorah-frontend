import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

// Lesson picture that opens full-screen on tap, with zoom in/out (and pinch on phones/tablets),
// so small diagram text is readable.
export default function ZoomableImage({ url, alt, colors }: { url: string; alt?: string; colors: AppColors }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ratio, setRatio] = useState(1.6);
  const { width: winW, height: winH } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    const apply = (w?: number, h?: number) => { if (!cancelled && w && h) setRatio(w / h); };
    try {
      // Measuring is a nicety; a failure must never break the lesson, so keep the default shape.
      const r: any = Image.getSize(url, apply, () => {});
      if (r && typeof r.then === 'function') r.then((s: { width: number; height: number }) => apply(s.width, s.height)).catch(() => {});
    } catch { /* keep default ratio */ }
    return () => { cancelled = true; };
  }, [url]);

  const close = () => { setOpen(false); setStep(0); };
  const baseW = Math.min(winW - 32, (winH - 120) * ratio);
  const zoom = ZOOM_STEPS[step];

  return (
    <>
      <Pressable testID="zoom-image-open" onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Zoom picture${alt ? `: ${alt}` : ''}`}>
        <Image
          source={{ uri: url }}
          style={{ width: '100%', aspectRatio: ratio, maxHeight: 480, borderRadius: 8, backgroundColor: colors.cardDark }}
          resizeMode="contain"
          accessibilityLabel={alt}
        />
        <View style={{ position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Feather name="maximize-2" size={13} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Tap to zoom</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View testID="zoom-image-modal" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: 12 }}>
            <Pressable testID="zoom-out" onPress={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} accessibilityLabel="Zoom out" style={{ opacity: step === 0 ? 0.4 : 1, padding: 8 }}>
              <Feather name="zoom-out" size={24} color="#fff" />
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 14, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Text>
            <Pressable testID="zoom-in" onPress={() => setStep((s) => Math.min(ZOOM_STEPS.length - 1, s + 1))} disabled={step === ZOOM_STEPS.length - 1} accessibilityLabel="Zoom in" style={{ opacity: step === ZOOM_STEPS.length - 1 ? 0.4 : 1, padding: 8 }}>
              <Feather name="zoom-in" size={24} color="#fff" />
            </Pressable>
            <Pressable testID="zoom-close" onPress={close} accessibilityLabel="Close picture" style={{ padding: 8 }}>
              <Feather name="x" size={26} color="#fff" />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }} maximumZoomScale={4} minimumZoomScale={1} bouncesZoom>
            <ScrollView horizontal contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
              <Image
                source={{ uri: url }}
                style={{ width: baseW * zoom, height: (baseW * zoom) / ratio }}
                resizeMode="contain"
                accessibilityLabel={alt}
              />
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
