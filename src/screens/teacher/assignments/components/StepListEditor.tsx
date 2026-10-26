import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

// Editable numbered list (problems, reflection questions) on a teacher step card
export function StepListEditor({ title, items, onChange, placeholder, addLabel, color, colors, styles, testID }: {
  title: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  color: string;
  colors: AppColors;
  styles: any;
  testID?: string;
}) {
  return (
    <View style={{ gap: 6 }} testID={testID}>
      <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600' }}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color, marginTop: 12, width: 18 }}>{i + 1}.</Text>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: color + '40', minHeight: 44 }]}
            value={item}
            placeholder={placeholder}
            placeholderTextColor={colors.textDim}
            multiline
            onChangeText={t => onChange(items.map((x, j) => (j === i ? t : x)))}
          />
          <TouchableOpacity onPress={() => onChange(items.filter((_, j) => j !== i))} activeOpacity={0.7} style={{ marginTop: 12 }}>
            <Feather name="x" size={14} color={colors.accentRed} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        onPress={() => onChange([...items, ''])}
        activeOpacity={0.75}
        style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: color + '40', borderStyle: 'dashed' }}
      >
        <Text style={{ fontSize: 11, color }}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
