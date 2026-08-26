import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ContextMenuState, Message } from '../types';
import { QUICK_REACTS } from '../constants';
import { parseContent } from '../utils/messageFormat';

interface Props {
  contextMenu: ContextMenuState;
  onClose: () => void;
  styles: any;
  messages: Message[];
  toggleReaction: (msgId: string, emoji: string) => void;
  copyMessageText: (text: string, msgId: string) => void;
  setReplyTo: (m: Message | null) => void;
  setForwardMsg: (m: Message | null) => void;
  loadContactsIfNeeded: () => void;
  contactsLength: number;
  setEditingMsg: (m: Message | null) => void;
  setEditText: (t: string) => void;
  deleteMessage: (msgId: string) => void;
}

export default function MessageContextMenu({
  contextMenu, onClose, styles, messages, toggleReaction, copyMessageText,
  setReplyTo, setForwardMsg, loadContactsIfNeeded, contactsLength,
  setEditingMsg, setEditText, deleteMessage,
}: Props) {
  if (!contextMenu) return null;

  const winW = Dimensions.get('window').width;
  const winH = Dimensions.get('window').height;
  const menuW = 230;
  const menuH = contextMenu.isMine ? 330 : 250;
  const hasCoords = contextMenu.x > 0 || contextMenu.y > 0;

  const clampedLeft = hasCoords
    ? Math.min(Math.max(16, contextMenu.x - (contextMenu.isMine ? menuW - 24 : 24)), winW - menuW - 16)
    : undefined;
  const clampedTop = hasCoords
    ? Math.min(Math.max(30, contextMenu.y - 10), winH - menuH - 30)
    : undefined;

  const findMsg = () => messages.find(m => m.id === contextMenu.msgId);

  const handleCopy = () => { const msg = findMsg(); if (msg) copyMessageText(parseContent(msg.content).text || '', msg.id); onClose(); };
  const handleReply = () => { const msg = findMsg(); if (msg) setReplyTo(msg); onClose(); };
  const handleForward = () => { const msg = findMsg(); if (msg) { setForwardMsg(msg); if (!contactsLength) loadContactsIfNeeded(); } onClose(); };
  const handleEdit = () => { const msg = findMsg(); if (msg) { setEditingMsg(msg); setEditText(parseContent(msg.content).text || ''); } onClose(); };
  const handleDelete = () => { deleteMessage(contextMenu.msgId); onClose(); };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.contextMenuOverlay, !hasCoords && { justifyContent: 'center', alignItems: 'center' }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={hasCoords ? {
            position: 'absolute',
            left: clampedLeft,
            top: clampedTop,
            width: menuW,
          } : {
            width: menuW,
            alignSelf: contextMenu.isMine ? 'flex-end' : 'flex-start',
            marginHorizontal: 32,
          }}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation?.()}
          {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation?.() } : {})}
        >
          <View style={styles.quickReactRow}>
            {QUICK_REACTS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => { toggleReaction(contextMenu.msgId, e); onClose(); }}
                {...(Platform.OS === 'web' ? { onClick: () => { toggleReaction(contextMenu.msgId, e); onClose(); } } : {})}
                activeOpacity={0.6}
              >
                <Text style={styles.quickReactEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.contextMenuBox}>
            <TouchableOpacity
              style={styles.contextMenuItem}
              activeOpacity={0.7}
              onPress={handleCopy}
              {...(Platform.OS === 'web' ? { onClick: handleCopy } : {})}
            >
              <Feather name="copy" size={17} color="#B8B9BC" />
              <Text style={styles.contextMenuText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contextMenuItem}
              activeOpacity={0.7}
              onPress={handleReply}
              {...(Platform.OS === 'web' ? { onClick: handleReply } : {})}
            >
              <Feather name="corner-up-left" size={17} color="#B8B9BC" />
              <Text style={styles.contextMenuText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contextMenuItem}
              activeOpacity={0.7}
              onPress={handleForward}
              {...(Platform.OS === 'web' ? { onClick: handleForward } : {})}
            >
              <Feather name="corner-up-right" size={17} color="#B8B9BC" />
              <Text style={styles.contextMenuText}>Forward</Text>
            </TouchableOpacity>
            {contextMenu.isMine && (
              <TouchableOpacity
                style={styles.contextMenuItem}
                activeOpacity={0.7}
                onPress={handleEdit}
                {...(Platform.OS === 'web' ? { onClick: handleEdit } : {})}
              >
                <Feather name="edit-2" size={17} color="#B8B9BC" />
                <Text style={styles.contextMenuText}>Edit</Text>
              </TouchableOpacity>
            )}
            {contextMenu.isMine && (
              <>
                <View style={styles.contextMenuDivider} />
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  activeOpacity={0.7}
                  onPress={handleDelete}
                  {...(Platform.OS === 'web' ? { onClick: handleDelete } : {})}
                >
                  <Feather name="trash-2" size={17} color="#F26B6B" />
                  <Text style={[styles.contextMenuText, { color: '#F26B6B' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
