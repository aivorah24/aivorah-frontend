import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import { TABS } from '../constants';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: { available: number; assigned: number; inProgress: number; completed: number };
  styles: any;
  colors: AppColors;
}

export default function ChallengeTabs({ activeTab, setActiveTab, counts, styles, colors }: Props) {
  return (
    <View style={styles.tabRow}>
      {TABS.map(tab => {
        const count = tab === 'Available' ? counts.available : tab === 'Assigned' ? counts.assigned
          : tab === 'In Progress' ? counts.inProgress : counts.completed;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.25)' : colors.borderColor }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === tab ? 'white' : colors.textDim }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
