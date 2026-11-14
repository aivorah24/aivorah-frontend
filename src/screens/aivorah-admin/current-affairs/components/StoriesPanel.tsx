import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import StoryEditor from './StoryEditor';
import { Button, LoadState, Segment } from './ui';
import { listStories } from '../services/currentAffairsAdminService';
import { useLoad } from '../hooks/useLoad';
import type { ContentStatus } from '../types';
import type { CaStyles } from '../styles';

const FILTERS: { value: ContentStatus; label: string }[] = [
  { value: 'review', label: 'To review' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'rejected', label: 'Rejected' },
];

/** The review queue and every other story, by status; opens the editor. */
export default function StoriesPanel({ styles, accent }: { styles: CaStyles; accent: string }) {
  const [status, setStatus] = useState<ContentStatus>('review');
  const [open, setOpen] = useState<string | null>(null);
  const fetchStories = useCallback(() => listStories(status), [status]);
  const { data, loading, error, reload } = useLoad(fetchStories, 'Could not load stories');
  const stories = data || [];

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.toolbar}>
        <Segment styles={styles} testID="ca-stories-filter" options={FILTERS} value={status} onChange={(v) => { setStatus(v); setOpen(null); }} />
        <Text style={styles.toolbarText}>{loading ? '' : `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}</Text>
        <Button styles={styles} label="New story" icon="plus" kind="primary" onPress={() => setOpen('new')} testID="ca-story-new" />
      </View>

      {open ? <StoryEditor key={open} id={open} styles={styles} accent={accent} onChanged={reload} onClose={() => setOpen(null)} /> : null}

      <View style={styles.card}>
        <LoadState styles={styles} loading={loading && !data} error={error} onRetry={reload} color={accent} />
        {!loading && !error && !stories.length ? (
          <Text style={styles.emptyText} testID="ca-stories-empty">
            {status === 'review' ? 'Nothing waiting for review.' : 'No stories here yet.'}
          </Text>
        ) : null}
        {stories.map((s) => (
          <TouchableOpacity key={s.id} testID={`ca-story-row-${s.id}`} style={[styles.listRow, open === s.id && styles.listRowOn]} onPress={() => setOpen(s.id)}>
            <View style={styles.row}>
              <Text style={styles.chip}>{s.category}</Text>
              <Text style={styles.listMeta}>{s.publish_date} · {s.source}{s.reviewed_by === 'auto' ? ' · published automatically' : ''}</Text>
            </View>
            <Text style={styles.listTitle}>{s.title_kid}</Text>
            <Text style={styles.listMeta} numberOfLines={2}>{s.summary_kid}</Text>
            {s.review_notes && status === 'review' ? <Text style={styles.notes} numberOfLines={3}>{s.review_notes}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
