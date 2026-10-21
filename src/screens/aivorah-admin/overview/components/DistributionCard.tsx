import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Props {
  title: string;
  rows: { label: string; value: number }[];
  color: string;
  styles: any;
}

// A simple horizontal bar-list — no charting library, just styled Views,
// consistent with the rest of this screen's plain RN components.
export default function DistributionCard({ title, rows, color, styles }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={styles.distCard} testID={`dist-card-${title}`}>
      <Text style={styles.distCardTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyRowText}>No data yet.</Text>
      ) : (
        <ScrollView style={styles.distCardBody} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {rows.map((r) => (
            <View key={r.label} style={styles.barRow} testID={`dist-row-${title}-${r.label}`}>
              <Text style={styles.barLabel} numberOfLines={1}>{r.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(r.value / max) * 100}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.barValue}>{r.value}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
