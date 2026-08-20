import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import { SectionHead } from './common/SectionHead';
import type { makeStyles } from '../ProfileScreen';

interface Avatar {
  id: string;
  label: string;
  gradient: [string, string, ...string[]];
  icon: string;
}

interface AvatarPickerCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  avatars: Avatar[];
  selAvatar: string;
  photoUrl: string | null;
  onSelectAvatar: (id: string) => void;
}

// "Choose Your Look" card — horizontal avatar style picker. An avatar is only
// shown as "active" when there's no custom uploaded photo overriding it.
export function AvatarPickerCard({ styles, colors, isDark, avatars, selAvatar, photoUrl, onSelectAvatar }: AvatarPickerCardProps) {
  return (
    <View style={styles.card}>
      <SectionHead icon="user" iconBg={isDark ? 'rgba(147,176,172,0.18)' : 'rgba(195,220,216,0.35)'} iconColor={colors.accentYellow} title="Choose Your Look" sub="Pick an avatar style" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {avatars.map(av => {
          const active = selAvatar === av.id && !photoUrl;
          return (
            <TouchableOpacity key={av.id} onPress={() => onSelectAvatar(av.id)} style={styles.avOption} activeOpacity={0.8}>
              <View style={[styles.avRing, active && { borderColor: colors.accentYellow }]}>
                <LinearGradient colors={av.gradient} style={styles.avCircle}>
                  <Feather name={av.icon as any} size={26} color="white" />
                </LinearGradient>
                {active && <View style={[styles.avCheck, { backgroundColor: colors.accentYellow }]}><Feather name="check" size={9} color="white" /></View>}
              </View>
              <Text style={[styles.avLabel, active && { color: colors.accentYellow, fontWeight: '700' }]}>{av.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
