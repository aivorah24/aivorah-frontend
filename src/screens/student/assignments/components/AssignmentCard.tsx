import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { SUBJECT_ICON, SUBJECT_COLOR } from '../constants';
import { formatDueDate } from '../utils';
import { makeStyles } from '../styles';
import type { Assignment } from '../types';

export function AssignmentCard({
  item, colors, styles, openingAssignmentId, onOpen, onViewResult,
}: {
  item: Assignment;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  openingAssignmentId: string | null;
  onOpen: (item: Assignment) => void;
  onViewResult: (item: Assignment) => void;
}) {
  const icon  = SUBJECT_ICON[item.subject] ?? 'book-open';
  const color = SUBJECT_COLOR[item.subject] ?? colors.accentYellow;
  const rawDue = item.status === 'completed'
    ? { label: item.score != null ? `Score: ${item.score}%` : 'Completed', colorKey: 'textMuted' as const, isOverdue: false }
    : formatDueDate(item.dueDate);
  // If student joined after the due date, they can't be overdue on it
  const due = (item.joinedAfterDue && rawDue.isOverdue)
    ? { label: 'Pending', colorKey: 'textMuted' as const, isOverdue: false }
    : rawDue;
  const dueColor = colors[due.colorKey as keyof AppColors] as string;
  const isClosed = (item as any).closed && item.status !== 'completed';
  const statusColor = item.status === 'completed'
    ? colors.accentGreen
    : isClosed ? colors.textDim
    : colors.accentYellow;
  const statusStyle = {
    bg: statusColor + '16',
    color: statusColor,
    border: statusColor + '38',
    label: item.status === 'completed'
      ? (item.score != null ? `${item.score}%` : 'Done')
      : isClosed ? 'Closed'
      : 'Let\'s go!',
  };

  return (
    /* Outer wrapper provides the colored left accent bar */
    <TouchableOpacity testID={`assignments-card-${item.id}`} style={[styles.cardWrapper, { borderColor: color + '35', backgroundColor: color + '07' }]}
      activeOpacity={item.status === 'completed' ? 0.7 : 1}
      onPress={item.status === 'completed' ? () => onViewResult(item) : undefined}
    >
      {/* Colored left bar */}
      <View style={[styles.cardAccent, { backgroundColor: color }]} />

      {/* Card content */}
      <View style={[styles.card, item.status === 'completed' && styles.cardCompleted]}>
        <View style={[styles.subjectIcon, { backgroundColor: color + '22', borderColor: color + '45' }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {item.subject}{item.chapter ? ` · ${item.chapter}` : ''}{item.grade ? ` · ${item.grade}` : ''}
          </Text>
          {/* Type + curriculum row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '40' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 0.3 }}>
                {item.type === 'quiz' ? 'Quiz' : (item.taskSteps?.length ?? 0) > 0 ? 'Scaffolded' : (item.documentUrls?.length ?? 0) > 0 ? `Worksheet · ${item.documentUrls!.length}p` : 'Assignment'}
              </Text>
            </View>
            {item.createdBy === 'parent' && (
              <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.accentGreen + '15', borderWidth: 1, borderColor: colors.accentGreen + '35' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accentGreen }}>By parent</Text>
              </View>
            )}
            {item.curriculum && (
              <Text style={{ fontSize: 10, color: colors.textDim, fontWeight: '500' }}>{item.curriculum}</Text>
            )}
          </View>
          {item.aiFeedback && item.status === 'completed' && (() => {
            try { return <Text style={styles.feedbackPreview} numberOfLines={1}>{JSON.parse(item.aiFeedback!).text}</Text>; }
            catch { return <Text style={styles.feedbackPreview} numberOfLines={1}>{item.aiFeedback}</Text>; }
          })()}
          <View style={styles.cardBottom}>
            {/* Only show due label if it has real info (not plain "Pending") */}
            {due.label !== 'Pending' && (
              <View style={styles.dueRow}>
                {item.status === 'pending' && <Feather name="clock" size={12} color={dueColor} style={{ marginRight: 4 }} />}
                <Text style={[styles.dueText, { color: dueColor }]}>{due.label}</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
            </View>
          </View>
        </View>
        {item.status === 'pending' && !isClosed && (
          <TouchableOpacity
            testID={`assignments-card-${item.id}-start`}
            style={[styles.actionBtn, { backgroundColor: color, borderColor: color + '80', borderWidth: 1 }]}
            activeOpacity={0.7}
            onPress={() => onOpen(item)}
            disabled={openingAssignmentId === item.id}
          >
            {openingAssignmentId === item.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="play" size={13} color="#fff" />}
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>{openingAssignmentId === item.id ? 'Loading' : 'Start'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
