import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CardHeader } from '../../../onboarding/OnboardingSharedFields';
import { AVATAR_STYLES } from '../../../../constants/avatarStyles';

const TEAL = '#5F8A86';

export function AvatarCard({
  styles, teal = TEAL, done, avatarStyle, setAvatarStyle,
}: {
  styles: any; teal?: string; done: boolean; avatarStyle: string; setAvatarStyle: (v: string) => void;
}) {
  return (
    <View style={[styles.card, styles.cardFull]}>
      <CardHeader icon="smile" title="5. Your Avatar" subtitle="Choose an avatar that represents you." done={done} styles={styles} />
      <View style={styles.avatarGrid}>
        {AVATAR_STYLES.map((av) => (
          <TouchableOpacity key={av.id}
            style={[styles.avatarTile, avatarStyle === av.id && styles.avatarTileActive]}
            onPress={() => setAvatarStyle(av.id)} activeOpacity={0.8}>
            <LinearGradient colors={av.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarCircle}>
              <Feather name={av.icon as any} size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.avatarLbl, avatarStyle === av.id && { color: teal }]}>{av.label}</Text>
            {avatarStyle === av.id && (
              <View style={styles.tileCheck}><Feather name="check" size={10} color="#fff" /></View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
