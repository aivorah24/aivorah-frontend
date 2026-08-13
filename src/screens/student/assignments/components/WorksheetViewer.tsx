import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Assignment } from '../types';

// ── Worksheet Viewer — expanded by default, tap image to zoom fullscreen ─────
export function WorksheetViewer({ assignment, color, colors }: { assignment: Assignment; color: string; colors: AppColors }) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const urls = (assignment.documentUrls?.length ?? 0) > 0 ? assignment.documentUrls! : (assignment.documentUrl ? [assignment.documentUrl] : []);
  if (urls.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="file-text" size={13} color={color} />
        <Text style={{ fontSize: 12, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Worksheet{urls.length > 1 ? ` (${urls.length} pages)` : ''}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textDim, marginLeft: 4 }}>Tap image to zoom</Text>
      </View>

      {urls.map((url, idx) => (
        url.match(/\.(jpg|jpeg|png|gif|webp)/i) || url.includes('cloudinary') ? (
          <View key={idx}>
            {urls.length > 1 && (
              <Text style={{ fontSize: 11, color: colors.textDim, marginBottom: 4, fontWeight: '600' }}>Page {idx + 1}</Text>
            )}
            <TouchableOpacity onPress={() => setZoomUrl(url)} activeOpacity={0.9}>
              <Image
                source={{ uri: url }}
                style={{ width: '100%', height: 340, borderRadius: 12, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: color + '30' }}
                resizeMode="contain"
              />
              <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 5 }}>
                <Feather name="zoom-in" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity key={idx} onPress={() => Linking.openURL(url)} activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: color + '10', borderWidth: 1, borderColor: color + '30' }}>
            <Feather name="file-text" size={18} color={color} />
            <Text style={{ flex: 1, color, fontWeight: '600' }}>Open Page {idx + 1}</Text>
            <Feather name="external-link" size={14} color={color} />
          </TouchableOpacity>
        )
      ))}

      {/* Fullscreen zoom modal */}
      {zoomUrl && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setZoomUrl(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 48, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 8 }}
              onPress={() => setZoomUrl(null)} activeOpacity={0.8}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bouncesZoom
            >
              <Image
                source={{ uri: zoomUrl }}
                style={{ width: '100%', height: undefined, aspectRatio: 0.75 }}
                resizeMode="contain"
              />
            </ScrollView>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, paddingBottom: 24 }}>Pinch to zoom - Tap X to close</Text>
          </View>
        </Modal>
      )}
    </View>
  );
}
