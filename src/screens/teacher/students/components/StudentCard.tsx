import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { Student } from '../types';
import { StudentStatusBadge } from '../../../../components/common/StudentStatusBadge';
import { resolveStudentStatus } from '../../../../utils/studentStatus';
import { initials, toTitleCase, avatarGradient, lastActiveLabel } from '../utils/studentDisplay';
import { normalizeCurriculum } from '../../../../utils/curriculum';

function StudentAvatarComponent({ photoUrl, name, grad, styles }: {
  photoUrl?: string; name: string; grad: [string, string]; styles: any;
}) {
  const [imgErr, setImgErr] = useState(false);
  if (photoUrl && !imgErr) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={styles.avatar}
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
      <Text style={styles.avatarText}>{initials(name)}</Text>
    </LinearGradient>
  );
}
export const StudentAvatar = memo(StudentAvatarComponent);

interface Props {
  student: Student;
  colors: AppColors;
  gold: string;
  styles: any;
  promoteMode: boolean;
  isSelectedForPromote: boolean;
  removingId: string | null;
  onPress: () => void;
  onRemove: () => void;
}

export default function StudentCard({
  student: s, colors, gold, styles, promoteMode, isSelectedForPromote,
  removingId, onPress, onRemove,
}: Props) {
  const displayName = toTitleCase(s.name);
  const grad = avatarGradient(displayName);

  return (
    <TouchableOpacity
      testID={`teacher-students-card-${s.id}`}
      style={[styles.studentCard, promoteMode && isSelectedForPromote && styles.studentCardSelected]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        {promoteMode && (
          <Feather
            name={isSelectedForPromote ? 'check-square' : 'square'}
            size={16}
            color={isSelectedForPromote ? gold : colors.textDim}
            style={{ marginRight: 2 }}
          />
        )}
        <StudentAvatar photoUrl={s.photoUrl} name={displayName} grad={grad} styles={styles} />
        <View style={styles.cardInfo}>
          <Text style={styles.studentName}>{displayName}</Text>
          <Text style={styles.studentMeta}>{s.grade} · {normalizeCurriculum(s.curriculum)}</Text>
        </View>
        <StudentStatusBadge status={resolveStudentStatus(s)} testID={`teacher-students-status-${s.id}`} />
        {!promoteMode && (
          <TouchableOpacity
            testID={`teacher-students-remove-${s.id}`}
            onPress={onRemove}
            disabled={removingId === s.id}
            style={{ padding: 4, marginLeft: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {removingId === s.id
              ? <ActivityIndicator size="small" color={colors.accentRed} />
              : <Feather name="user-minus" size={15} color={colors.accentRed} />}
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={resolveStudentStatus(s) === 'needs_attention' ? ['#B8797E', '#C4836A'] : ['#5F8A86', '#5A8A70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${s.progressPct}%` as any }]}
          />
        </View>
        <Text style={styles.progressText}>{s.progressPct}%</Text>
      </View>

      {/* Stats row */}
      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Feather name="zap" size={12} color="#C5BD96" />
          <Text style={styles.cardStatVal}>{s.xpPoints} XP</Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="activity" size={12} color="#C4836A" />
          <Text style={styles.cardStatVal}>{s.currentStreak}d streak</Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="book-open" size={12} color="#7AADA8" />
          <Text style={styles.cardStatVal}>{s.completedTopics.length} topics</Text>
        </View>
        <View style={styles.cardStat}>
          <Feather name="clock" size={12} color={colors.textDim} />
          <Text style={styles.cardStatVal}>{lastActiveLabel(s.lastActive)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
