import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ContextMenuState, Message } from '../types';
import SERVER_URL from '../../../../config/serverUrl';
import MarkdownText from '../../../../components/common/MarkdownText';
import { AIVORAH_EMAIL } from '../constants';
import { fileIcon, formatDateDivider, formatFileSize, formatTime, parseContent, sameDay } from '../utils/messageFormat';
import { AutoLogoutCard, AssignmentCard, ScheduleCard } from './cards/NotificationCards';

interface Props {
  item: Message;
  index: number;
  messages: Message[];
  userEmail: string;
  colors: AppColors;
  styles: any;
  focusedMsgId: string | null;
  copiedMsgId: string | null;
  setFocusedMsgId: (id: string | null) => void;
  setContextMenu: (v: ContextMenuState) => void;
  startEdit: (msg: Message) => void;
  toggleReaction: (msgId: string, emoji: string) => void;
}

export default function MessageBubble({
  item, index, messages, userEmail, colors, styles,
  focusedMsgId, copiedMsgId, setFocusedMsgId, setContextMenu, startEdit, toggleReaction,
}: Props) {
  const isMine = item.sender_email === userEmail;
  const seen = isMine && item.read_at !== null;
  const showEdit = isMine && focusedMsgId === item.id;

  // Auto-Logout messages from Aivorah get a special card
  if (!isMine && item.content.includes('[Auto-Logout]')) {
    return <AutoLogoutCard item={item} index={index} messages={messages} colors={colors} styles={styles} />;
  }
  // Schedule event notification card
  if (!isMine && item.content.startsWith('SCHEDULE_CARD|')) {
    return <ScheduleCard item={item} index={index} messages={messages} colors={colors} styles={styles} />;
  }
  // Assignment notification messages get a card
  if (!isMine && item.content.match(/New Assignment assigned:/i)) {
    return <AssignmentCard item={item} index={index} messages={messages} colors={colors} styles={styles} />;
  }

  // Show a date chip above the first message of each day.
  const prev = index > 0 ? messages[index - 1] : null;
  const showDateDivider = !prev || !sameDay(new Date(prev.created_at), new Date(item.created_at));

  return (
    <>
      {showDateDivider && (
        <View style={styles.dateDivider}>
          <Text style={styles.dateDividerText}>{formatDateDivider(item.created_at)}</Text>
        </View>
      )}
      <View
        {...(Platform.OS === 'web' ? {
          onContextMenu: (e: any) => {
            e.preventDefault?.();
            setContextMenu({ msgId: item.id, x: e.clientX ?? e.nativeEvent?.pageX ?? 0, y: e.clientY ?? e.nativeEvent?.pageY ?? 0, isMine });
          }
        } : {})}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { setContextMenu(null); setFocusedMsgId(focusedMsgId === item.id ? null : (isMine ? item.id : null)); }}
          onLongPress={(e: any) => setContextMenu({ msgId: item.id, x: e.nativeEvent?.pageX ?? 0, y: e.nativeEvent?.pageY ?? 0, isMine })}
        >
          <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
            {showEdit && (
              <TouchableOpacity style={styles.editIconBtn} onPress={() => { setFocusedMsgId(null); startEdit(item); }} activeOpacity={0.7}>
                <Feather name="edit-2" size={12} color={colors.accentYellow} />
              </TouchableOpacity>
            )}
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              {item.reply_to && (
                <View style={[styles.replyQuote, { borderLeftColor: isMine ? 'rgba(11,11,11,0.35)' : colors.accentYellow }]}>
                  <Text style={[styles.replyQuoteName, { color: isMine ? 'rgba(11,11,11,0.7)' : colors.accentYellow }]} numberOfLines={1}>{item.reply_to.senderName}</Text>
                  <Text style={[styles.replyQuoteText, { color: isMine ? 'rgba(11,11,11,0.6)' : colors.textDim }]} numberOfLines={2}>{parseContent(item.reply_to.content).text || 'Attachment'}</Text>
                </View>
              )}
              {(() => {
                const parsed = parseContent(item.content);
                return (
                  <>
                    {parsed.attachment && (
                      <TouchableOpacity
                        style={[styles.attachmentBubble, { borderColor: isMine ? 'rgba(255,255,255,0.3)' : colors.borderColor }]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            // New attachments are absolute Cloudinary URLs; older ones
                            // are server-relative ("/data/uploads/...") — handle both.
                            const u = parsed.attachment!.url;
                            const href = /^https?:\/\//i.test(u) ? u : `${SERVER_URL}${u}`;
                            (window as any).open(href, '_blank');
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather name={fileIcon(parsed.attachment.type) as any} size={18} color={isMine ? '#fff' : colors.accentYellow} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.attachName, { color: isMine ? '#fff' : colors.textMain }]} numberOfLines={1}>
                            {parsed.attachment.name}
                          </Text>
                          <Text style={[styles.attachSize, { color: isMine ? 'rgba(255,255,255,0.6)' : colors.textDim }]}>
                            {formatFileSize(parsed.attachment.size)} · {parsed.attachment.type.toUpperCase()}
                          </Text>
                        </View>
                        <Feather name="download" size={14} color={isMine ? 'rgba(255,255,255,0.7)' : colors.textDim} />
                      </TouchableOpacity>
                    )}
                    {parsed.text ? (
                      item.sender_email === AIVORAH_EMAIL ? (
                        <MarkdownText
                          text={parsed.text}
                          style={[styles.bubbleText, styles.bubbleTextTheirs]}
                          boldStyle={styles.bubbleTextBold}
                        />
                      ) : (
                        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                          {parsed.text}
                        </Text>
                      )
                    ) : null}
                  </>
                );
              })()}
            </View>
            {!!item.reactions && Object.keys(item.reactions).length > 0 && (
              <View style={[styles.reactionsRow, isMine && { alignSelf: 'flex-end' }]}>
                {Object.entries(item.reactions).map(([emoji, count]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reactionPill, item.myReaction === emoji && styles.reactionPillMine]}
                    onPress={() => toggleReaction(item.id, emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionPillText}>{emoji} {count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.bubbleMeta}>
              {copiedMsgId === item.id && <Text style={styles.copiedBadge}>Copied</Text>}
              {item.is_edited && <Text style={styles.editedLabel}>edited</Text>}
              <Text style={styles.bubbleTime}>{formatTime(item.created_at)}</Text>
              {isMine && (
                <View style={styles.tickWrap}>
                  <Feather name="check" size={11} color={seen ? colors.accentYellow : colors.textDim} />
                  {seen && <Feather name="check" size={11} color={colors.accentYellow} style={{ marginLeft: -6 }} />}
                </View>
              )}
              {/* Always-tappable entry point for Copy/Reply/Forward/React — long-press
                  and right-click also work, but this guarantees discoverability. */}
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={(e: any) => setContextMenu({ msgId: item.id, x: e.nativeEvent?.pageX ?? e.clientX ?? 0, y: e.nativeEvent?.pageY ?? e.clientY ?? 0, isMine })}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="more-horizontal" size={14} color={colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}
