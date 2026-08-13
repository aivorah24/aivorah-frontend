import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarGradient, getAvatarIcon } from '../../../../constants/avatarStyles';
import type { ModalType } from '../types';

interface ProfileCardProps {
  user: any;
  levelLabel: string;
  photoUrl: string | null;
  uploading: boolean;
  onPickPhoto: () => void;
  onOpenModal: (type: ModalType) => void;
  colors: any;
  styles: any;
}

export default function ProfileCard({ user, levelLabel, photoUrl, uploading, onPickPhoto, onOpenModal, colors, styles }: ProfileCardProps) {
  const fields = [
    { label: 'Display Name', value: user?.name || '—', modal: 'name' as const },
    { label: 'Email Address', value: user?.email || '—', modal: 'email' as const },
    { label: 'Grade / Year', value: user?.grade || 'Not set', modal: 'grade' as const },
    { label: 'Curriculum', value: user?.curriculum || 'Not set', modal: 'curriculum' as const },
    { label: 'Location', value: user?.location || 'Not set', modal: 'location' as const },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.profileRow}>
        <TouchableOpacity style={styles.avatarBig} onPress={onPickPhoto} activeOpacity={0.85} testID="settings-avatar-button">
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
          ) : user?.avatarStyle ? (
            <LinearGradient
              colors={getAvatarGradient(user.avatarStyle)}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name={getAvatarIcon(user.avatarStyle) as any} size={28} color="white" />
            </LinearGradient>
          ) : (
            <Feather name="user" size={30} color={colors.textMuted} />
          )}
          <View style={styles.avatarCam}>
            {uploading ? <ActivityIndicator size="small" color={colors.accentYellow} /> : <Feather name="camera" size={11} color={colors.accentYellow} />}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileRole}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student'} · {levelLabel}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>
      <View style={styles.divider} />

      {fields.map((f, i) => (
        <View key={f.label}>
          {i > 0 && <View style={styles.rowDivider} />}
          <View style={styles.infoRow} testID={`settings-field-${f.modal}-row`}>
            <Text style={styles.infoLabel}>{f.label}</Text>
            <Text style={styles.infoValue} numberOfLines={1} testID={`settings-field-${f.modal}-value`}>{f.value}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => onOpenModal(f.modal)} activeOpacity={0.7} testID={`settings-field-${f.modal}-edit-button`}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
