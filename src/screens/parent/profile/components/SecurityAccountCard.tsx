import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../../theme';

export default function SecurityAccountCard({
  onChangePassword, onEdit, onNavigate, colors, s,
}: {
  onChangePassword: () => void;
  onEdit: () => void;
  onNavigate: (screen: string) => void;
  colors: any; s: any;
}) {
  const tiles = [
    { icon: 'user',   title: 'Personal Information',  sub: 'Update your personal details',  action: onEdit },
    { icon: 'bell',   title: 'Notification Settings', sub: 'Manage your alerts & emails',   action: () => onNavigate('ParentSettings') },
    { icon: 'shield', title: 'Privacy & Security',    sub: 'Control your data & privacy',   action: () => onNavigate('ParentSettings') },
    { icon: 'award',  title: 'Subscription',          sub: 'View your plan & billing',      action: () => onNavigate('ParentSubscription') },
  ];

  return (
    <View style={[s.card, { marginTop: spacing.lg }]}>
      <View style={s.secHeader}>
        <View style={s.cardHeader}>
          <Feather name="lock" size={16} color={colors.accentYellow} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Security & Account</Text>
            <Text style={s.secSub}>Keep your account secure</Text>
          </View>
        </View>
        <TouchableOpacity style={s.changePassBtn} onPress={onChangePassword}>
          <Feather name="lock" size={12} color={colors.accentYellow} />
          <Text style={s.changePassText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      <View style={s.secTilesRow}>
        {tiles.map((tile) => (
          <TouchableOpacity key={tile.title} style={s.secTile} activeOpacity={0.75} onPress={tile.action}>
            <View style={s.secTileIcon}>
              <Feather name={tile.icon as any} size={16} color={colors.accentYellow} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.secTileTitle}>{tile.title}</Text>
              <Text style={s.secTileSub}>{tile.sub}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textDim} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
