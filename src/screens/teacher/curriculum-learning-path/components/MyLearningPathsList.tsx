import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { listMyLearningPaths, deleteLearningPath } from '../services/curriculumLearningPathService';
import { MyLearningPathSummary } from '../types';

function when(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

// Every learning path this teacher has made — drafts and published — so any of them can be reopened and edited.
export default function MyLearningPathsList({
  colors, openCurriculumId, onOpen, onDeleted, refreshKey,
}: {
  colors: AppColors;
  openCurriculumId: string | null;
  onOpen: (curriculumId: string) => void;
  onDeleted: (curriculumId: string) => void;
  refreshKey: number;
}) {
  const [paths, setPaths] = useState<MyLearningPathSummary[] | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    listMyLearningPaths()
      .then(({ learningPaths }) => { setPaths(learningPaths); setError(''); })
      .catch((e) => setError(e.message || 'Could not load your learning paths.'));
  }, []);
  useEffect(load, [load, refreshKey]);

  async function remove(curriculumId: string) {
    setConfirmDelete(null);
    try {
      await deleteLearningPath(curriculumId);
      onDeleted(curriculumId);
      load();
    } catch (e: any) {
      setError(e.message || 'Could not delete this learning path.');
    }
  }

  const card = { borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 16, padding: 16, gap: 10 } as const;
  return (
    <View testID="my-learning-paths" style={card}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>My Learning Paths</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>
        Drafts are only visible to you. Published paths are shown to your connected students of that grade and subject.
      </Text>
      {!paths && !error && <ActivityIndicator color={colors.primary} />}
      {!!error && <Text testID="my-paths-error" style={{ fontSize: 12, color: colors.accentRed }}>{error}</Text>}
      {paths?.length === 0 && <Text style={{ fontSize: 13, color: colors.textMuted }}>No learning paths yet. Upload a curriculum above to create one.</Text>}
      {paths?.map((p) => {
        const open = p.curriculumId === openCurriculumId;
        const statusLabel = p.status === 'published'
          ? (p.hasUnpublishedChanges ? 'Published · edits not published yet' : 'Published')
          : 'Draft';
        const statusColor = p.status === 'published' ? (p.hasUnpublishedChanges ? colors.primary : colors.accentGreen) : colors.textMuted;
        return (
          <View key={p.id} testID={`my-path-${p.curriculumId}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, borderColor: open ? colors.primary : colors.borderColor }}>
            <Feather name={p.status === 'published' ? 'send' : 'edit-3'} size={16} color={statusColor} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }}>{p.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {[p.grade && `Grade ${String(p.grade).replace(/^grade\s*/i, '')}`, p.subject, `saved ${when(p.updatedAt)}`].filter(Boolean).join(' · ')}
              </Text>
              <Text testID={`my-path-status-${p.curriculumId}`} style={{ fontSize: 12, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
            </View>
            {open ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Open below</Text>
            ) : (
              <TouchableOpacity testID={`open-path-${p.curriculumId}`} onPress={() => onOpen(p.curriculumId)} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Continue editing</Text>
              </TouchableOpacity>
            )}
            {confirmDelete === p.curriculumId ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity testID={`confirm-delete-${p.curriculumId}`} onPress={() => remove(p.curriculumId)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentRed }}>Delete for good</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmDelete(null)}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Keep</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity testID={`delete-path-${p.curriculumId}`} onPress={() => setConfirmDelete(p.curriculumId)}>
                <Feather name="trash-2" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}
