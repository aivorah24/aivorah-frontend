import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ChildData } from '../types';
import { STATUS_META } from '../../../../utils/studentStatus';

export default function ChildCard({
  child, isSelected, onPress, onViewCreds, colors, s,
}: {
  child: ChildData; isSelected: boolean;
  onPress: () => void; onViewCreds: (c: ChildData) => void;
  colors: AppColors; s: any;
}) {
  const { color: badgeColor, label: badgeLabel } = STATUS_META[child.status] ?? STATUS_META.getting_started;

  return (
    <TouchableOpacity
      style={[s.childCard, isSelected && { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '0C' }]}
      onPress={onPress} activeOpacity={0.85}
    >
      <TouchableOpacity
        testID={`child-card-creds-${child.id}`}
        accessibilityLabel={`View ${child.name}'s login credentials`}
        style={s.childKeyBtn}
        onPress={() => onViewCreds(child)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        activeOpacity={0.7}
      >
        <Feather name="key" size={10} color={colors.textDim} />
      </TouchableOpacity>

      <View style={[s.childAvatar, { backgroundColor: isSelected ? colors.accentYellow + '20' : colors.borderColor + '80' }]}>
        <Text style={[s.childAvatarText, { color: isSelected ? colors.accentYellow : colors.textMain }]}>
          {child.name[0]}
        </Text>
      </View>
      <Text style={s.childName}>{child.name}</Text>
      <Text style={s.childGrade}>{child.grade}</Text>
      <View style={[s.statusBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '40' }]}>
        <View style={[s.statusDot, { backgroundColor: badgeColor }]} />
        <Text style={[s.statusText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}
