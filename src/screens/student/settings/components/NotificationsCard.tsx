import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface NotificationsCardProps {
  assignmentAlerts: boolean;
  challengeUpdates: boolean;
  onToggleAssignmentAlerts: (v: boolean) => void;
  onToggleChallengeUpdates: (v: boolean) => void;
  colors: any;
  styles: any;
}

export default function NotificationsCard({ assignmentAlerts, challengeUpdates, onToggleAssignmentAlerts, onToggleChallengeUpdates, colors, styles }: NotificationsCardProps) {
  const items = [
    { icon: 'bell', label: 'Assignment Alerts', sub: 'Due date reminders', key: 'assignmentAlerts', val: assignmentAlerts, set: onToggleAssignmentAlerts },
    { icon: 'bar-chart-2', label: 'Challenge Updates', sub: 'New challenges and leaderboard changes', key: 'challengeUpdates', val: challengeUpdates, set: onToggleChallengeUpdates },
    { icon: 'file-text', label: 'Weekly Report', sub: 'Progress summary every week', badgeKey: 'weeklyReport' },
    { icon: 'zap', label: 'AI Suggestions', sub: 'Personalised learning tips from AI', badgeKey: 'aiSuggestions' },
    { icon: 'send', label: 'Push Notifications', sub: 'Real-time alerts on your device', badgeKey: 'pushNotifications' },
  ];

  return (
    <View style={styles.card}>
      {items.map((item: any, i) => (
        <View key={item.label}>
          {i > 0 && <View style={styles.rowDivider} />}
          <View style={styles.iconRow} testID={`settings-notif-${item.key || item.badgeKey}-row`}>
            <View style={styles.iconBox}><Feather name={item.icon as any} size={18} color={colors.textMuted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{item.label}</Text>
              <Text style={styles.fieldSub}>{item.sub}</Text>
            </View>
            {item.key ? (
              <Switch
                testID={`settings-notif-${item.key}-switch`}
                value={item.val}
                onValueChange={item.set}
                trackColor={{ false: colors.borderColor, true: colors.accentYellow }}
                thumbColor="white"
              />
            ) : (
              <View style={styles.comingSoonBadge} testID={`settings-notif-${item.badgeKey}-badge`}><Text style={styles.comingSoonText}>Soon</Text></View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
