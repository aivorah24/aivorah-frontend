import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

// ── Single page image with zoom ───────────────────────────────────────────────
export function WorksheetPageImage({ url, pageNum, color, colors }: { url: string; pageNum: number; color: string; colors: AppColors }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setZoomed(true)} activeOpacity={0.92}>
        <Image source={{ uri: url }} style={{ width: '100%', height: 360, borderRadius: 12, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: color + '30' }} resizeMode="contain" />
        <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="zoom-in" size={12} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>Tap to zoom</Text>
        </View>
      </TouchableOpacity>
      {zoomed && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setZoomed(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.97)' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 48, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 10 }}
              onPress={() => setZoomed(false)} activeOpacity={0.8}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 8 }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 0.75 }} resizeMode="contain" />
            </ScrollView>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', paddingBottom: 24 }}>Pinch to zoom - Scroll to pan</Text>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Worksheet reference thumbnail (fixed size, for horizontal scroll) ─────────
export function WorksheetRefThumb({ url, pageNum, color, colors }: { url: string; pageNum: number; color: string; colors: AppColors }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setZoomed(true)} activeOpacity={0.85}>
        <View style={{ width: 200, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: color + '40', backgroundColor: '#f5f5f5' }}>
          <Image source={{ uri: url }} style={{ width: 200, height: 360 }} resizeMode="cover" resizeMethod="resize" />
          <View style={{ paddingVertical: 4, backgroundColor: color + '15', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Feather name="zoom-in" size={10} color={color} />
            <Text style={{ fontSize: 10, fontWeight: '700', color }}>Page {pageNum}</Text>
          </View>
        </View>
      </TouchableOpacity>
      {zoomed && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setZoomed(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.97)' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 48, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 10 }}
              onPress={() => setZoomed(false)} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: url }} style={{ flex: 1 }} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </View>
  );
}
