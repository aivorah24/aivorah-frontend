import React from 'react';
import { View, Text, Switch } from 'react-native';
import type { AppColors } from '../../../../theme';
import SectionHeader from './SectionHeader';

// Only "Parent Messages" is a real, live toggle — Weekly Class Report and AI
// Class Insights show a static "Soon" badge (real state exists for both,
// loaded/saved alongside the others, but there is deliberately no control
// to change them yet). See BUGS_AND_FIXES.md / teacher/settings/settings.spec.js
// for the E2E test that pins this exact behavior.
export default function NotificationsSection({
  parentMessages, setParentMessages, saveNotifPrefs, clearUnreadChallenges,
  colors, gold, styles,
}: {
  parentMessages: boolean;
  setParentMessages: (v: boolean) => void;
  saveNotifPrefs: (override: Record<string, boolean>) => void;
  clearUnreadChallenges: () => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  const items = [
    { key: 'teacherMessages', label: 'Parent Messages', sub: 'New messages from parents', val: parentMessages, set: setParentMessages },
    { key: 'weeklyReport', label: 'Weekly Class Report', sub: 'Summary of class activity each week', soon: true },
    { key: 'aiInsights', label: 'AI Class Insights', sub: 'Smart suggestions for your class', soon: true },
  ] as const;

  return (
    <>
      <SectionHeader icon="bell" label="Notifications" color={colors.accentYellow} styles={styles} />
      <View style={styles.card} testID="teacher-settings-notifications-section">
        {items.map((item: any, i) => (
          <View key={item.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.toggleRow} testID={`teacher-settings-notif-row-${item.key}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>{item.label}</Text>
                <Text style={styles.fieldSub}>{item.sub}</Text>
              </View>
              {item.soon ? (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: gold + '18' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: gold }}>Soon</Text>
                </View>
              ) : (
                <Switch
                  testID={`teacher-settings-notif-toggle-${item.key}`}
                  value={item.val}
                  onValueChange={(v) => {
                    item.set(v);
                    saveNotifPrefs({ [item.key]: v });
                    // Turning ON dismisses the OFF-period backlog so it doesn't replay.
                    if (v && item.key === 'challengeUpdates') clearUnreadChallenges();
                  }}
                  trackColor={{ false: colors.borderColor, true: gold }}
                  thumbColor="white"
                />
              )}
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
