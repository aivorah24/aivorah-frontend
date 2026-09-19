import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import type { Conversation } from '../types';
import { convoRoleLabel, formatPreview, formatTime, isAivorah, sameDay } from '../utils/messageFormat';
import { renderPersonAvatar } from './PersonAvatar';

interface Props {
  item: Conversation;
  isActive: boolean;
  colors: AppColors;
  styles: any;
  onPress: () => void;
}

export default function ConversationItem({ item, isActive, colors, styles, onPress }: Props) {
  const isToday = sameDay(new Date(item.lastMessageAt), new Date());

  return (
    <TouchableOpacity
      testID={`messages-convo-${item.otherEmail}`}
      style={[styles.convoItem, isActive && styles.convoItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {renderPersonAvatar(item.otherName, item.otherRole, (item as any).photoUrl, 44, isAivorah(item), colors)}
      <View style={{ flex: 1 }}>
        <View style={styles.convoHeader}>
          <Text style={styles.convoName} numberOfLines={1}>{item.otherName}</Text>
          <Text style={styles.convoTime}>{isToday ? formatTime(item.lastMessageAt) : new Date(item.lastMessageAt).toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
        </View>
        <View style={styles.convoFooter}>
          <Text style={styles.convoPreview} numberOfLines={1}>{formatPreview(item.lastMessage)}</Text>
          {item.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          ) : (
            <View style={styles.unreadDot} />
          )}
        </View>
        <View style={styles.convoRolePill}>
          <Text style={styles.convoRolePillText}>{convoRoleLabel(item)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
