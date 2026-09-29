import React, { useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { useLearningPathDraft } from '../hooks/useLearningPathDraft';
import LearningPathEditor from './LearningPathEditor';

// One learning path open for review: its name, save state, Save / Publish, and every topic as students see it.
export default function LearningPathWorkspace({
  curriculumId, colors, onSaved, onDirtyChange,
}: {
  curriculumId: string;
  colors: AppColors;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const draft = useLearningPathDraft(curriculumId);

  useEffect(() => {
    draft.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  useEffect(() => { onDirtyChange?.(draft.dirty); }, [draft.dirty, onDirtyChange]);

  // Web: warn before leaving the page with edits that are not saved yet.
  useEffect(() => {
    if (Platform.OS !== 'web' || !draft.dirty || typeof window === 'undefined') return undefined;
    const warn = (e: any) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft.dirty]);

  if (draft.loading && !draft.learningPath) return <ActivityIndicator testID="draft-loading" color={colors.primary} />;
  if (!draft.learningPath) return draft.error ? <Text testID="draft-error" style={styles.errorText}>{draft.error}</Text> : null;

  const lp = draft.learningPath;
  const isPublished = draft.isPublished;
  const busy = draft.saving || draft.publishing;
  const canPublish = !busy && (!isPublished || draft.hasUnpublishedChanges);
  const canSave = !busy && draft.dirty;
  const savedAt = lp.updated_at ? new Date(lp.updated_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;
  const saveNote = draft.dirty ? 'You have unsaved changes' : savedAt ? `All changes saved · ${savedAt}` : undefined;
  const publishLabel = draft.publishing ? 'Publishing…'
    : isPublished ? (draft.hasUnpublishedChanges ? 'Publish updates' : 'Published') : 'Publish to students';

  function setTitle(title: string) {
    draft.updateContent({ ...lp.content, metadata: { ...(lp.content.metadata || {}), title } });
  }

  async function handleSave() {
    if (await draft.save()) onSaved?.();
  }

  // Topics the AI could not fill need the teacher's input before students see them.
  function handlePublish() {
    const unresolvedCount = lp.content.units.reduce((n, u) => n + u.topics.filter((t) => t.status === 'needs_teacher_input').length, 0);
    if (unresolvedCount > 0) {
      Alert.alert(
        'Cannot publish yet',
        `Please review and provide input for ${unresolvedCount} topic${unresolvedCount === 1 ? '' : 's'} marked "Needs Your Input".`
      );
      return;
    }
    draft.publish().then((ok) => { if (ok) onSaved?.(); });
  }

  const meta = lp.content.metadata;
  return (
    <View testID="learning-path-review" style={{ gap: 12 }}>
      <View testID="curriculum-metadata" style={styles.headerRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>LEARNING PATH NAME (students see this)</Text>
          <TextInput
            testID="learning-path-title"
            value={meta?.title ?? ''}
            onChangeText={setTitle}
            placeholder={[meta?.grade && `Grade ${meta.grade}`, meta?.subject].filter(Boolean).join(' ') || 'Learning path name'}
            placeholderTextColor={colors.textMuted}
            style={styles.titleInput}
          />
          <Text testID="save-state" style={[styles.muted, draft.dirty && { color: colors.primary, fontWeight: '700' }]}>
            {isPublished ? (draft.hasUnpublishedChanges ? 'Published · your latest edits are not published yet' : 'Published · students see this version') : 'Draft · only you can see this'}
            {saveNote ? ` · ${saveNote}` : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity testID="save-draft" disabled={!canSave} onPress={handleSave} activeOpacity={0.8} style={[styles.btn, { borderColor: colors.primary, opacity: canSave ? 1 : 0.45 }]}>
            <Feather name="bookmark" size={14} color={colors.primary} />
            <Text style={[styles.btnText, { color: colors.primary }]}>{draft.saving ? 'Saving…' : 'Save draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="publish" disabled={!canPublish} onPress={handlePublish} activeOpacity={0.8} style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: canPublish ? 1 : 0.45 }]}>
            <Feather name="send" size={14} color="#fff" />
            <Text style={[styles.btnText, { color: '#fff' }]}>{publishLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {!!draft.error && <Text testID="draft-error" style={styles.errorText}>{draft.error}</Text>}
      <LearningPathEditor content={lp.content} onChange={draft.updateContent} onRebuildTopic={draft.rebuildTopic} />
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.textMuted },
  titleInput: { fontSize: 18, fontWeight: '800', color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  muted: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.accentRed },
});
