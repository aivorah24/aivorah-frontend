import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../../theme';
import AICardDecoration from './common/AICardDecoration';

export default function AISuggestedActionCard({
  gold, title, body, hasNeedsAttention, avgProgress, styles, navigation,
}: {
  gold: string;
  title: string;
  body: string;
  hasNeedsAttention: boolean;
  avgProgress: number;
  styles: any;
  navigation: any;
}) {
  return (
    <View style={[styles.aiCard, { marginBottom: spacing.xl }]}>
      <AICardDecoration />
      <View style={styles.aiTop}>
        <View style={styles.aiIconWrap}>
          <Feather name="cpu" size={20} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTag}>AI SUGGESTED ACTION</Text>
          <Text style={styles.aiTitle}>{title}</Text>
          <Text style={styles.aiSub}>{body}</Text>
        </View>
      </View>
      <View style={styles.aiBtnRow}>
        {hasNeedsAttention ? (
          <>
            <TouchableOpacity style={styles.aiBtn} activeOpacity={0.85} onPress={() => navigation.navigate('TeacherSchedule' as any)}>
              <Feather name="calendar" size={14} color={gold} />
              <Text style={styles.aiBtnText}>Schedule Study Hour</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aiBtn, { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: '#fff' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TeacherAssignments' as any)}
            >
              <Feather name="plus-circle" size={14} color="white" />
              <Text style={[styles.aiBtnText, { color: 'white' }]}>Assign Practice Task</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.aiBtn} activeOpacity={0.85} onPress={() => navigation.navigate('TeacherAssignments' as any)}>
            <Feather name="plus-circle" size={14} color={gold} />
            <Text style={styles.aiBtnText}>
              {avgProgress > 0 ? 'Assign Task / Quiz' : 'Create First Assignment'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
