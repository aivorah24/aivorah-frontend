import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Challenge } from '../types';
import ChallengeCard from './ChallengeCard';
import { useSlowLoadMessage } from '../../../../hooks/useSlowLoadMessage';

interface Props {
  loading: boolean;
  filtered: Challenge[];
  activeTab: string;
  onStart: (ch: Challenge) => void;
  styles: any;
  colors: AppColors;
}

export default function ChallengesGrid({ loading, filtered, activeTab, onStart, styles, colors }: Props) {
  const slowLoad = useSlowLoadMessage(loading);

  if (loading) {
    return (
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accentYellow} />
        {slowLoad && (
          <Text style={{ marginTop: 14, fontSize: 13, color: colors.textDim, textAlign: 'center', paddingHorizontal: 24 }}>
            Still waking up the server — this can take up to a minute on the first load.
          </Text>
        )}
      </View>
    );
  }

  if (filtered.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="target" size={36} color={colors.textDim} />
        <Text style={styles.emptyTitle}>
          {activeTab === 'Assigned' ? 'No assigned challenges yet' :
           activeTab === 'Completed' ? 'No completed challenges yet' :
           'No challenges available'}
        </Text>
        <Text style={styles.emptyText}>
          {activeTab === 'Assigned' ? 'Ask your teacher or parent to assign a challenge' : 'Pull down to refresh'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {filtered.map(ch => (
        <ChallengeCard key={ch.id} ch={ch} onStart={onStart} styles={styles} colors={colors} />
      ))}
    </View>
  );
}
