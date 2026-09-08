import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Channel } from '../../../../features/channels/api/channelsApi';
import { fmtChannelTime } from '../../../../features/channels/api/channelsApi';
import { pastelBg, pastelText } from '../../../../features/channels/utils/avatar';
import { isGroupIcon } from '../../../../features/channels/utils/icons';
import type { Conversation, ConvoFilter } from '../types';
import { isAivorah } from '../utils/messageFormat';
import ConversationItem from './ConversationItem';

type InboxItem = { key: string; time: number } & ({ kind: 'channel'; data: Channel } | { kind: 'convo'; data: Conversation });

interface Props {
  colors: AppColors;
  styles: any;
  userRole: string;
  loadingConvos: boolean;
  unifiedInbox: InboxItem[];
  activeConvoEmail: string | null;
  convoFilter: ConvoFilter;
  setConvoFilter: (f: ConvoFilter) => void;
  convoSearch: string;
  setConvoSearch: (s: string) => void;
  showChannels: boolean;
  channels: Channel[];
  totalUnread: number;
  conversations: Conversation[];
  newBtnRef: React.RefObject<any>;
  onNewPress: () => void;
  onOpenChannel: (ch: Channel) => void;
  onOpenConversation: (c: Conversation) => void;
  onAivorahBannerPress: () => void;
}

export default function ConversationList({
  colors, styles, userRole, loadingConvos, unifiedInbox, activeConvoEmail,
  convoFilter, setConvoFilter, convoSearch, setConvoSearch, showChannels,
  channels, totalUnread, conversations, newBtnRef, onNewPress,
  onOpenChannel, onOpenConversation, onAivorahBannerPress,
}: Props) {
  return (
    <View style={styles.sidebar}>
      {/* Big header */}
      <View style={styles.sidebarHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="star" size={20} color={colors.accentYellow} />
          <View>
            <Text style={styles.sidebarTitle}>Conversations</Text>
            <Text style={styles.sidebarSubtitle}>Stay connected with Aivorah</Text>
          </View>
        </View>
        {userRole !== 'student' && (
          <TouchableOpacity
            testID="messages-new-button"
            ref={newBtnRef}
            style={styles.newBtn}
            onPress={onNewPress}
            activeOpacity={0.7}
          >
            <Feather name="edit" size={13} color={colors.accentYellow} />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search — filters conversations & channels by name, WhatsApp-style. */}
      <View style={styles.convoSearchBar}>
        <Feather name="search" size={14} color={colors.textDim} />
        <TextInput
          testID="messages-search-input"
          style={styles.convoSearchInput}
          value={convoSearch}
          onChangeText={setConvoSearch}
          placeholder="Search chats and groups…"
          placeholderTextColor={colors.textDim}
        />
        {!!convoSearch && (
          <TouchableOpacity onPress={() => setConvoSearch('')}><Feather name="x" size={14} color={colors.textDim} /></TouchableOpacity>
        )}
      </View>

      {/* Filter tabs — students keep the lean DM tabs; everyone else gets the
          unified inbox tabs (channels merged in). Horizontally scrollable
          so labels never clip on narrower panels. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
        nestedScrollEnabled
        {...(Platform.OS === 'web' ? { persistentScrollbar: false } : {})}
      >
        {(showChannels ? (['all', 'unread', 'staff'] as const) : (['all', 'unread', 'starred'] as const)).map(tab => {
          const chUnread = channels.reduce((n, c) => n + c.unread, 0);
          const count = tab === 'all' ? conversations.length + channels.length
            : tab === 'unread' ? totalUnread + chUnread
            : tab === 'staff' ? channels.filter(c => c.category === 'staff').length + conversations.filter(c => ['teacher', 'school_admin'].includes(c.otherRole)).length
            : conversations.filter(c => isAivorah(c)).length; // 'starred' tab (student-only path)
          const active = convoFilter === tab;
          const icon = tab === 'all' ? 'message-square' : tab === 'unread' ? 'mail' : tab === 'staff' ? 'users' : 'star';
          return (
            <TouchableOpacity key={tab} testID={`messages-filter-${tab}`} style={[styles.filterTab, active && styles.filterTabActive]} onPress={() => setConvoFilter(tab)} activeOpacity={0.7}>
              <Feather name={icon as any} size={11} color={active ? colors.accentYellow : colors.textDim} />
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
              {count > 0 && <View style={[styles.filterBadge, active && styles.filterBadgeActive]}><Text style={[styles.filterBadgeText, active && { color: '#0B0B0B' }]}>{count}</Text></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Unified inbox — channels and DMs share one scrollable, recency-
          sorted list (WhatsApp-style), instead of channels being pinned
          above the DM list regardless of which is more recent. */}
      {loadingConvos ? (
        <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 24 }} />
      ) : unifiedInbox.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="message-square" size={32} color={colors.textDim} />
          <Text style={styles.emptyText}>No messages yet</Text>
          {userRole !== 'student' && (
            <Text style={styles.emptySubText}>Tap <Text style={{ color: colors.accentYellow }}>New</Text> to start a conversation</Text>
          )}
          {userRole === 'student' && (
            <Text style={styles.emptySubText}>Messages from your teacher or parent will appear here.</Text>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {unifiedInbox.map((item) => item.kind === 'channel' ? (
            <TouchableOpacity key={item.key} style={styles.chRow} onPress={() => onOpenChannel(item.data)} activeOpacity={0.75}>
              <View style={[styles.chBadge, { backgroundColor: pastelBg(item.data.name) }]}><Feather name={isGroupIcon(item.data.iconLabel) ? item.data.iconLabel : 'users'} size={18} color={pastelText(item.data.name)} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.chName} numberOfLines={1}>{item.data.name}</Text>
                  <Text style={styles.chTime}>{item.data.lastMessage ? fmtChannelTime(item.data.lastMessage.at) : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={styles.chSub} numberOfLines={1}>{item.data.memberCount} members{item.data.posting === 'staff_only' ? ' · broadcast' : ''}{item.data.lastMessage ? ` · ${item.data.lastMessage.body}` : ''}</Text>
                  {item.data.unread > 0 && <View style={styles.chUnread}><Text style={styles.chUnreadText}>{item.data.unread}</Text></View>}
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <ConversationItem
              key={item.key}
              item={item.data}
              isActive={activeConvoEmail === item.data.otherEmail}
              colors={colors}
              styles={styles}
              onPress={() => onOpenConversation(item.data)}
            />
          ))}
        </ScrollView>
      )}

      {/* Aivorah bottom banner — opens the existing thread, or starts a
          fresh one if this user has never messaged Aivorah before (the
          banner previously did nothing in that case). */}
      <TouchableOpacity testID="messages-aivorah-banner" style={styles.aivBanner} activeOpacity={0.8} onPress={onAivorahBannerPress}>
        <View style={styles.aivBannerIcon}><Feather name="cpu" size={22} color={colors.accentYellow} /></View>
        <Text style={styles.aivBannerText}>Aivorah is here to <Text style={{ color: colors.accentYellow, fontWeight: '700' }}>support</Text>{'\n'}your child&apos;s learning journey.</Text>
        <Feather name="chevron-right" size={16} color={colors.accentYellow} />
      </TouchableOpacity>
    </View>
  );
}
