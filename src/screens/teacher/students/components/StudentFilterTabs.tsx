import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import type { StudentStats } from '../types';

interface Props {
  gradeTabs: string[];
  activeTab: string;
  setActiveTab: (t: string) => void;
  stats: StudentStats;
  styles: any;
}

export default function StudentFilterTabs({ gradeTabs, activeTab, setActiveTab, stats, styles }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
      {gradeTabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          testID={`teacher-students-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => setActiveTab(tab)}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          {tab === 'Needs Attention' && stats.attention > 0 && (
            <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{stats.attention}</Text></View>
          )}
          {tab === 'Active Today' && stats.activeToday > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#5A8A70' }]}><Text style={styles.tabBadgeText}>{stats.activeToday}</Text></View>
          )}
          {tab === 'Inactive' && stats.inactive > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#8A8358' }]}><Text style={styles.tabBadgeText}>{stats.inactive}</Text></View>
          )}
          {tab === 'Streak Risk' && stats.streakRisk > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#C4836A' }]}><Text style={styles.tabBadgeText}>{stats.streakRisk}</Text></View>
          )}
          {tab === 'Top Performers' && stats.topPerformers > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#5A8A70' }]}><Text style={styles.tabBadgeText}>{stats.topPerformers}</Text></View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
