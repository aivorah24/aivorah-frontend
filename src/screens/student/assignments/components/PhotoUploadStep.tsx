import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { AppColors } from '../../../../theme';

// ── Photo Upload Step ─────────────────────────────────────────────────────────
export function PhotoUploadStep({
  stepColor, colors, drawingBase64, drawingMime, isArt, onCapture,
}: {
  stepColor: string;
  colors: AppColors;
  drawingBase64: string | null | undefined;
  drawingMime: string | null | undefined;
  isArt: boolean;
  onCapture: (b64: string, mime: string) => void;
}) {
  const label = isArt ? 'Upload your artwork' : 'Upload your drawing / diagram';
  const hint  = isArt
    ? 'Draw or create your artwork on paper, then take a photo or choose an image.'
    : 'Draw your diagram or sketch on paper, then take a photo or choose an image.';

  async function pick() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const b64 = dataUrl.split(',')[1];
          onCapture(b64, file.type || 'image/jpeg');
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photos.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      onCapture(asset.base64 ?? '', asset.mimeType ?? 'image/jpeg');
    }
  }

  const previewUri = drawingBase64
    ? `data:${drawingMime ?? 'image/jpeg'};base64,${drawingBase64}`
    : null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 20 }}>{hint}</Text>
      {previewUri ? (
        <View style={{ gap: 8 }}>
          <Image
            source={{ uri: previewUri }}
            style={{ width: '100%', height: 220, borderRadius: 12, resizeMode: 'contain', backgroundColor: colors.cardDark }}
          />
          <TouchableOpacity onPress={pick} activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: stepColor }}>
            <Feather name="refresh-cw" size={15} color={stepColor} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: stepColor }}>Change photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={pick} activeOpacity={0.8}
          style={{ height: 160, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
            borderColor: stepColor + '60', backgroundColor: stepColor + '08',
            alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Feather name="upload" size={28} color={stepColor} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: stepColor }}>{label}</Text>
          <Text style={{ fontSize: 12, color: colors.textDim }}>Tap to choose from your photos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
