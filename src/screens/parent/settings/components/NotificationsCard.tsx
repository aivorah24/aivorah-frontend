import React from 'react';
import { View, Text, Switch } from 'react-native';
import type { NotificationPrefs } from '../types';

const ITEMS: Array<{ key: keyof NotificationPrefs; label: string; sub: string; soon?: boolean }> = [
  { key: 'assignmentAlerts', label: 'Assignment Alerts', sub: 'New assignments for your child' },
  { key: 'teacherMessages', label: 'Teacher Messages', sub: 'New messages from teachers' },
  { key: 'weeklyReport', label: 'Weekly Progress Report', sub: "Summary of your child's week", soon: true },
  { key: 'progressNudges', label: 'AI Progress Nudges', sub: 'Tips when your child needs attention', soon: true },
  { key: 'challengeUpdates', label: 'Challenge Updates', sub: 'New challenges and rankings' },
];

export default function NotificationsCard({ prefs, onToggle, styles, colors }: {
  prefs: NotificationPrefs; onToggle: (key: keyof NotificationPrefs, value: boolean) => void; styles: any; colors: any;
}) {
  return (
    <View style={styles.card}>
      {ITEMS.map((item, i) => (
        <View key={item.key}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{item.label}</Text>
              <Text style={styles.fieldSub}>{item.sub}</Text>
            </View>
            {item.soon ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.accentYellow + '18' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentYellow }}>Soon</Text>
              </View>
            ) : (
              <Switch
                value={prefs[item.key]}
                onValueChange={(v) => onToggle(item.key, v)}
                trackColor={{ false: colors.borderColor, true: colors.accentYellow }}
                thumbColor="white"
              />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
