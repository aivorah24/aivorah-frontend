import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import type { AppColors } from '../../../../theme';

interface Props {
  colors: AppColors;
  gold: string;
  label: string;
  options: string[];
  selected: string | undefined;
  onSelect: (v: string | undefined) => void;
}

export default function FilterBar({ colors, gold, label, options, selected, onSelect }: Props) {
  if (options.length === 0) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            testID={`filter-${label}-all`}
            onPress={() => onSelect(undefined)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
              borderColor: !selected ? gold : colors.borderColor,
              backgroundColor: !selected ? gold + '20' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: !selected ? '700' : '400', color: !selected ? gold : colors.textMuted }}>All</Text>
          </TouchableOpacity>
          {options.map((opt) => {
            const active = selected === opt;
            return (
              <TouchableOpacity
                key={opt}
                testID={`filter-${label}-${opt}`}
                onPress={() => onSelect(opt)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                  borderColor: active ? gold : colors.borderColor,
                  backgroundColor: active ? gold + '20' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: active ? '700' : '400', color: active ? gold : colors.textMuted }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
