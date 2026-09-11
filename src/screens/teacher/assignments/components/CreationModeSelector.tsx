import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ScrollView } from 'react-native';

// The "choose how you want to create this assignment" landing screen —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// as part of splitting the Create Assignment Modal wizard into per-flow
// components (2026-08-25), following the design the user specified.
export function CreationModeSelector({
  isIBPYP, gold, colors,
  setCreateMode, setType, setUploadStep, uploadScrollRef, setBulkPhase, setBulkItems,
}: {
  isIBPYP: boolean;
  gold: string;
  colors: AppColors;
  setCreateMode: (m: 'choose' | 'ai' | 'upload' | 'bulk') => void;
  setType: (t: 'assignment' | 'quiz') => void;
  setUploadStep: (s: 1 | 2 | 3) => void;
  uploadScrollRef: React.RefObject<ScrollView | null>;
  setBulkPhase: (p: 'pick' | 'group' | 'classify' | 'generate' | 'assign') => void;
  setBulkItems: (items: any[]) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 18 }}>
        Choose how you want to create this assignment:
      </Text>

      {/* Option 1: AI Assignment */}
      <TouchableOpacity
        style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: gold + '40', backgroundColor: gold + '18', gap: 8 }}
        onPress={() => { setCreateMode('ai'); setType('assignment'); }}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: gold + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="cpu" size={20} color={gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: gold }}>
              {isIBPYP ? 'Generate IB PYP Assignment' : 'Generate AI Assignment'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
              AI creates Purpose, Learning Outcomes, Task Steps, Word Bank, and Stamps
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={gold} />
        </View>
      </TouchableOpacity>

      {/* Option 2: Upload Worksheet */}
      <TouchableOpacity
        style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: gold + '40', backgroundColor: gold + '18', gap: 8 }}
        onPress={() => { setCreateMode('upload'); setUploadStep(1); uploadScrollRef.current?.scrollTo({ y: 0, animated: false }); }}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: gold + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="upload" size={20} color={gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: gold }}>Upload Worksheet (PDF / Image)</Text>
            <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
              Extract questions from worksheet, use as-is or convert to interactive quiz
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={gold} />
        </View>
      </TouchableOpacity>

      {/* Option 3: Bulk Upload — several separate worksheets at once */}
      <TouchableOpacity
        style={{ padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: gold + '40', backgroundColor: gold + '18', gap: 8 }}
        onPress={() => { setCreateMode('bulk'); setBulkPhase('pick'); setBulkItems([]); }}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: gold + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="layers" size={20} color={gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: gold }}>Bulk Upload (Multiple Worksheets)</Text>
            <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
              Upload several separate worksheets at once — each becomes its own assignment
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={gold} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
