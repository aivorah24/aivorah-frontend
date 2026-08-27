import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

export default function ProfileHeroCard({
  firstName, userName, photoUri, onPickPhoto, onEdit, colors, s,
}: {
  firstName: string; userName: string; photoUri: string | null;
  onPickPhoto: () => void; onEdit: () => void; colors: AppColors; s: any;
}) {
  return (
    <View style={s.heroCard}>
      <View style={s.heroLeft}>
        <TouchableOpacity style={s.heroAvatar} onPress={onPickPhoto} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <Text style={s.heroAvatarText}>{firstName[0] || 'P'}</Text>
          )}
          <View style={s.avatarEditBadge}>
            <Feather name="camera" size={10} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={{ gap: 4 }}>
          <Text style={s.heroWelcome}>Welcome back,</Text>
          <Text style={s.heroName}>{userName}</Text>
          <View style={s.heroTags}>
            <View style={s.heroTag}>
              <Feather name="check-circle" size={11} color={colors.accentGreen} />
              <Text style={[s.heroTagText, { color: colors.accentGreen }]}>Verified Account</Text>
            </View>
            <View style={[s.heroTag, { borderColor: colors.accentYellow + '40' }]}>
              <Feather name="star" size={11} color={colors.accentYellow} />
              <Text style={[s.heroTagText, { color: colors.accentYellow }]}>Premium Member</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.heroQuote}>
        <Text style={s.quoteGlyph}>&quot;</Text>
        <Text style={s.quoteText}>
          Every step today,{'\n'}a <Text style={s.quoteHighlight}>brighter</Text> tomorrow.
        </Text>
        <View style={s.sparkleRow}>
          <View style={s.sparkleDot} /><View style={[s.sparkleDot, { width: 4, height: 4 }]} /><View style={s.sparkleDot} />
        </View>
      </View>

      <TouchableOpacity style={s.editBtn} activeOpacity={0.8} onPress={onEdit}>
        <Feather name="edit-2" size={13} color="#0B0B0B" />
        <Text style={s.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}
