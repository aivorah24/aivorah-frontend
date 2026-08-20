import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { makeStyles } from '../ProfileScreen';

interface Avatar {
  id: string;
  gradient: [string, string, ...string[]];
  icon: string;
}

interface ProfileHeroProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  user: any;
  photoUrl: string | null;
  uploading: boolean;
  currentAvatar: Avatar;
  heroGreen: string;
  heroGold: string;
  onEditPress: () => void;
  onPickPhoto: () => void;
  onNavigateSubscription: () => void;
}

// The profile hero card — avatar, name, bio, and role/grade/curriculum/
// location/school/plan tag row. Pure presentation; all mutation handlers
// (edit, pick photo, navigate) are passed down from the screen.
export function ProfileHero({
  styles,
  colors,
  isDark,
  user,
  photoUrl,
  uploading,
  currentAvatar,
  heroGreen,
  heroGold,
  onEditPress,
  onPickPhoto,
  onNavigateSubscription,
}: ProfileHeroProps) {
  return (
    <View style={styles.heroCard}>
      <LinearGradient colors={isDark ? ['#111111', '#1C2420', '#152220'] : ['#F5F1E6', '#E6DEBC', '#C3DCD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBg} />

      {/* Edit button top-right */}
      <TouchableOpacity style={styles.editCornerBtn} onPress={onEditPress}>
        <Feather name="edit-2" size={13} color={colors.accentYellow} />
        <Text style={styles.editCornerText}>Edit</Text>
      </TouchableOpacity>

      {/* Centered avatar */}
      <TouchableOpacity testID="avatarPickButton" style={styles.avatarWrap} onPress={onPickPhoto} activeOpacity={0.85}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={styles.avatarPhoto} />
          : <LinearGradient colors={currentAvatar.gradient} style={styles.avatarGrad}>
              <Feather name={currentAvatar.icon as any} size={36} color="white" />
            </LinearGradient>}
        <View style={styles.cameraRing}>
          {uploading ? <ActivityIndicator size="small" color="white" /> : <Feather name="camera" size={11} color="white" />}
        </View>
      </TouchableOpacity>

      {/* Name + bio */}
      <Text style={styles.heroName}>{user?.name || 'Student'}</Text>
      {(user as any)?.bio ? <Text style={styles.heroBio}>{(user as any).bio}</Text> : null}

      {/* Tags */}
      <View style={styles.heroTags}>
        {/* Role badge — always visible so it's unmistakable which profile
            (student/parent/teacher) is being viewed, not just discoverable
            by clicking into a settings popup. */}
        <View style={[styles.tag, { backgroundColor: isDark ? colors.accentGreen + '22' : '#FFFFFFB0', borderColor: heroGreen + '80' }]}>
          <Feather name="user" size={10} color={heroGreen} />
          <Text style={[styles.tagText, { color: heroGreen }]}>Student</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: isDark ? colors.accentYellow + '22' : '#FFFFFFB0', borderColor: heroGold + '80' }]}>
          <Feather name="book-open" size={10} color={heroGold} />
          <Text style={[styles.tagText, { color: heroGold }]}>{user?.grade || 'Grade 3'}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: isDark ? colors.accentYellow + '22' : '#FFFFFFB0', borderColor: heroGold + '80' }]}>
          <Feather name="globe" size={10} color={heroGold} />
          <Text style={[styles.tagText, { color: heroGold }]}>{user?.curriculum || 'IB PYP'}</Text>
        </View>
        {user?.location && (
          <View style={[styles.tag, { backgroundColor: isDark ? colors.accentGreen + '22' : '#FFFFFFB0', borderColor: heroGreen + '80' }]}>
            <Feather name="map-pin" size={10} color={heroGreen} />
            <Text style={[styles.tagText, { color: heroGreen }]}>{user.location}</Text>
          </View>
        )}
        {(user as any)?.school && (
          <View style={[styles.tag, { backgroundColor: isDark ? colors.accentGreen + '22' : '#FFFFFFB0', borderColor: heroGreen + '80' }]}>
            <Feather name="home" size={10} color={heroGreen} />
            <Text style={[styles.tagText, { color: heroGreen }]}>{(user as any).school}</Text>
          </View>
        )}
        {/* Plan badge */}
        <TouchableOpacity
          style={[styles.tag, (user as any)?.isPro
            ? { backgroundColor: isDark ? '#C5A56A22' : '#FFFFFFB0', borderColor: '#C5A56A80' }
            : { backgroundColor: isDark ? 'rgba(147,176,172,0.18)' : '#FFFFFFB0', borderColor: heroGreen + '80' }
          ]}
          onPress={onNavigateSubscription}
          activeOpacity={0.7}
        >
          <Feather name={(user as any)?.isPro ? 'sun' : 'feather'} size={10} color={(user as any)?.isPro ? '#C5A56A' : heroGold} />
          <Text style={[styles.tagText, { color: (user as any)?.isPro ? '#C5A56A' : heroGold }]}>
            {(user as any)?.isPro ? 'Pro Plan' : 'Free Plan'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
