import React from 'react';
import { View, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Shared fullscreen image overlay — opened from the Detail modal's worksheet
// thumbnails and the Bulk/Upload wizard's page thumbnails alike — extracted
// verbatim (no behavior change) from TeacherAssignmentsScreen.tsx, eleventh
// step of its hooks/components decomposition (2026-08-25).
export function FullscreenImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* On React Native Web, flex:1 alone doesn't reliably stretch the Modal's
          own portal container to the full viewport — it can leave gaps with the
          page behind it peeking through. Force explicit fullscreen coverage. */}
      <View style={[
        { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
        Platform.OS === 'web' ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' } as any) : null,
      ]}>
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{ uri }}
          style={{ width: '92%', height: '80%' }}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}
