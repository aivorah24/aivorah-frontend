import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

// Shared "what the student sees" overlay for a rendered interactive-quiz
// HTML — opened from the Detail modal and the Generate-quiz preview alike —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// twelfth step of its hooks/components decomposition (2026-08-25).
//
// The worksheet HTML itself is always dark-themed (self-contained
// "Enchanted Forest" template, independent of the app's light/dark
// toggle) — this header bar must match that fixed dark look too,
// not follow colors.bgCard, or it renders as a jarring white bar
// in light mode sitting directly above dark worksheet content.
export function StudentPreviewOverlay({ html, colors, onClose }: { html: string; colors: AppColors; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#1C1C1C' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(195,220,216,0.15)', backgroundColor: '#1C1C1C' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Student Preview</Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={html}
            style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textDim }}>Preview available on web only</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
