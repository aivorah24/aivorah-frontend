import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { Message } from '../../types';
import { formatDateDivider, formatTime, sameDay } from '../../utils/messageFormat';

interface CardProps {
  item: Message;
  index: number;
  messages: Message[];
  colors: AppColors;
  styles: any;
}

function DateDividerIfNeeded({ item, index, messages, styles }: CardProps) {
  const prev = index > 0 ? messages[index - 1] : null;
  const showDateDivider = !prev || !sameDay(new Date(prev.created_at), new Date(item.created_at));
  if (!showDateDivider) return null;
  return (
    <View style={styles.dateDividerRow}>
      <View style={styles.dateDividerLine} />
      <View style={styles.dateDividerPill}>
        <Text style={styles.dateDividerPillText}>{formatDateDivider(item.created_at)}</Text>
      </View>
      <View style={styles.dateDividerLine} />
    </View>
  );
}

// ── Auto-Logout card (Aivorah special message) ────────────
export function AutoLogoutCard({ item, index, messages, colors, styles }: CardProps) {
  const text = item.content;
  const nameMatch = text.match(/\[Auto-Logout\]\s+(.+?)\s+was automatically/);
  const childName = nameMatch ? nameMatch[1] : 'Your child';
  const timeMatch = text.match(/at\s+([\d:]+\s*[ap]m)/i);
  const timeStr = timeMatch ? timeMatch[1] : formatTime(item.created_at);
  const hour = new Date(item.created_at).getHours();

  const timeSlot =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 21 ? 'evening' : 'night';

  const slots: Record<string, { icon: string; iconBg: string; tipIcon: string; tipColor: string; tip: string; decorIcon: string }> = {
    morning:   { icon: 'log-out',  iconBg: '#7A6B3A',  tipIcon: 'shield',  tipColor: colors.accentYellow, tip: "Session ended safely. Encourage them to log back in and continue.",  decorIcon: 'lock' },
    afternoon: { icon: 'lock',     iconBg: '#7A6B3A',  tipIcon: 'shield',  tipColor: colors.accentYellow, tip: "Everything's safe! You can check in with them if needed.",             decorIcon: 'clock' },
    evening:   { icon: 'power',    iconBg: '#4A5A6A',  tipIcon: 'clock',   tipColor: '#8AACB8',           tip: "A short break is okay! Encourage them to come back and continue learning.", decorIcon: 'moon' },
    night:     { icon: 'moon',     iconBg: '#3A3A5A',  tipIcon: 'lock',    tipColor: '#A89AC8',           tip: "Session closed for the night. Hope everything is good!",                decorIcon: 'moon' },
  };
  const s = slots[timeSlot];

  return (
    <>
      <DateDividerIfNeeded item={item} index={index} messages={messages} colors={colors} styles={styles} />
      <View style={[styles.autoLogoutCard, { maxWidth: 420, alignSelf: 'flex-start' }]}>
        <View style={styles.timelineDot} />
        <View style={[styles.autoLogoutIcon, { backgroundColor: s.iconBg }]}>
          <Feather name={s.icon as any} size={24} color="#F5F3EE" />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.autoLogoutTitle}>{childName} logged out</Text>
            <Text style={styles.autoLogoutTime}>{timeStr}</Text>
          </View>
          <Text style={styles.autoLogoutDesc}>{childName} was automatically logged out of Aivorah after 5 minutes of inactivity.</Text>
          <View style={[styles.autoLogoutTip, { borderColor: s.tipColor + '30', backgroundColor: s.tipColor + '10' }]}>
            <Feather name={s.tipIcon as any} size={12} color={s.tipColor} />
            <Text style={[styles.autoLogoutTipText, { color: s.tipColor }]}>{s.tip}</Text>
          </View>
        </View>
        <View style={styles.autoLogoutDecor}>
          <Feather name={s.decorIcon as any} size={32} color={colors.accentYellow + '30'} />
        </View>
      </View>
    </>
  );
}

// ── Schedule event notification card ─────────────────
export function ScheduleCard({ item, index, messages, colors, styles }: CardProps) {
  // Format: "SCHEDULE_CARD|childName|title|date|startTime|type"
  const parts = item.content.split('|');
  const childName = parts[1] || '';
  const evTitle = parts[2] || 'Event';
  const evDate = parts[3] || '';
  const evTime = parts[4] || '';
  const evType = parts[5] || 'lesson';

  const typeLabel: Record<string, string> = {
    lesson: 'Lesson', study: 'Study Session', challenge: 'Challenge',
    deadline: 'Deadline', assignment: 'Assignment', break: 'Break',
  };
  const typeIcon: Record<string, any> = {
    lesson: 'book-open', study: 'edit', challenge: 'award',
    deadline: 'alert-circle', assignment: 'clipboard', break: 'coffee',
  };
  const formattedDate = evDate ? new Date(evDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const tip = `${childName ? `Check ${childName}'s schedule` : 'Check the schedule'} to stay updated!`;

  return (
    <>
      <DateDividerIfNeeded item={item} index={index} messages={messages} colors={colors} styles={styles} />
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentCardHeader}>
          <View style={styles.assignmentAvatarWrap}>
            <Feather name="calendar" size={20} color={colors.accentYellow} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.assignmentSender}>AIVORAH</Text>
              <View style={styles.assignmentAIBadge}><Text style={styles.assignmentAIBadgeText}>AI</Text></View>
              <Text style={styles.assignmentTime}>{formatTime(item.created_at)}</Text>
            </View>
            <Text style={styles.assignmentHeadline}>New event has been scheduled!</Text>
          </View>
        </View>
        <View style={styles.assignmentDetail}>
          <View style={styles.assignmentDetailIcon}>
            <Feather name={typeIcon[evType] || 'calendar'} size={18} color={colors.accentYellow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignmentTitle} numberOfLines={2}>{evTitle}</Text>
            <Text style={styles.assignmentSubject}>{typeLabel[evType] || evType}</Text>
          </View>
          {(formattedDate || evTime) ? (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="calendar" size={12} color={colors.textDim} />
                <Text style={styles.assignmentDueLabel}>Scheduled</Text>
              </View>
              <Text style={styles.assignmentDueDate}>{formattedDate}</Text>
              {evTime ? <Text style={[styles.assignmentDueDate, { fontSize: 11 }]}>{evTime}</Text> : null}
            </View>
          ) : null}
        </View>
        <View style={styles.assignmentTip}>
          <Feather name="zap" size={12} color={colors.accentYellow} />
          <Text style={styles.assignmentTipText}>{tip}</Text>
        </View>
      </View>
      <Text style={styles.assignmentDayLabel}>{new Date(item.created_at).toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
    </>
  );
}

// ── Assignment notification card ──────────────────────
export function AssignmentCard({ item, index, messages, colors, styles }: CardProps) {
  // Parse: [ChildName] New Assignment assigned: "TITLE" (Subject). Due: DD Mon.
  const childMatch = item.content.match(/^\[(.+?)\]/);
  const titleMatch = item.content.match(/"([^"]+)"/);
  const subjectMatch = item.content.match(/\(([^)]+)\)/);
  const dueMatch = item.content.match(/Due:\s*(.+?)\.?\s*$/);
  const childName = childMatch ? childMatch[1] : '';
  const title = titleMatch ? titleMatch[1] : item.content;
  const subject = subjectMatch ? subjectMatch[1] : '';
  const due = dueMatch ? dueMatch[1] : '';

  return (
    <>
      <DateDividerIfNeeded item={item} index={index} messages={messages} colors={colors} styles={styles} />
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentCardHeader}>
          <View style={styles.assignmentAvatarWrap}>
            <Feather name="clipboard" size={20} color={colors.accentYellow} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.assignmentSender}>AIVORAH</Text>
              <View style={styles.assignmentAIBadge}><Text style={styles.assignmentAIBadgeText}>AI</Text></View>
              <Text style={styles.assignmentTime}>{formatTime(item.created_at)}</Text>
            </View>
            <Text style={styles.assignmentHeadline}>New assignment has been assigned!</Text>
          </View>
        </View>
        <View style={styles.assignmentDetail}>
          <View style={styles.assignmentDetailIcon}>
            <Feather name="book-open" size={18} color={colors.accentYellow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignmentTitle} numberOfLines={2}>{title}</Text>
            {subject ? <Text style={styles.assignmentSubject}>{subject}</Text> : null}
          </View>
          {due ? (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="calendar" size={12} color={colors.textDim} />
                <Text style={styles.assignmentDueLabel}>Due Date</Text>
              </View>
              <Text style={styles.assignmentDueDate}>{due}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.assignmentTip}>
          <Feather name="zap" size={12} color={colors.accentYellow} />
          <Text style={styles.assignmentTipText}>
            {childName ? `Encourage ${childName} to start early and do their best!` : 'Encourage your child to start early and do their best!'}
          </Text>
        </View>
      </View>
      <Text style={styles.assignmentDayLabel}>{new Date(item.created_at).toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
    </>
  );
}
