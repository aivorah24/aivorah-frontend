import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useIsFocused, useRoute, useNavigation } from '@react-navigation/native';
import CreateChannelModal from '../../../features/channels/components/CreateChannelModal';
import type { Channel } from '../../../features/channels/api/channelsApi';

import { makeStyles } from './styles';
import type { Contact } from './types';
import { isAivorah } from './utils/messageFormat';
import { AIVORAH_EMAIL } from './constants';
import { useContacts } from './hooks/useContacts';
import { useConversations } from './hooks/useConversations';
import { useMessageThread } from './hooks/useMessageThread';

import ConversationList from './components/ConversationList';
import ChatPanel from './components/ChatPanel';
import ContactsModal from './components/ContactsModal';
import NewMenu from './components/NewMenu';
import EditMessageModal from './components/EditMessageModal';
import ForwardMessageModal from './components/ForwardMessageModal';
import MessageContextMenu from './components/MessageContextMenu';

export default function MessagesScreen(_props: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refresh } = useNotification();
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const openWith: string | undefined = route.params?.openWith;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const userEmail = (user?.email || '').toLowerCase();
  const userName = user?.name || userEmail;
  const userRole = user?.role || 'teacher';

  const [showContacts, setShowContacts] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newMenuPos, setNewMenuPos] = useState({ top: 120, left: 340 });
  const newBtnRef = React.useRef<any>(null);

  const { contacts, loadingContacts, loadContacts } = useContacts(userEmail, userRole);

  // Thread hook needs activeConvo's email for the conversations hook's "force
  // this one to 0 unread" logic, so we thread it through after both are created.
  const [activeConvoEmailForList, setActiveConvoEmailForList] = useState<string | null>(null);

  const {
    conversations, setConversations, loadingConvos, loadConversations,
    channels, setChannels, loadChannels, showChannels,
    convoFilter, setConvoFilter, convoSearch, setConvoSearch,
    totalUnread, unifiedInbox,
  } = useConversations(userEmail, userRole, activeConvoEmailForList);

  const thread = useMessageThread({
    userEmail, userName, userRole, isFocused,
    refreshNotifications: refresh,
    loadConversations, setConversations, setChannels, loadChannels,
  });

  // Deep-link from a "message from X" notification tap (see Header.tsx) —
  // opens X's conversation directly instead of leaving the screen on its
  // default conversation-list/New view. Waits for conversations to actually
  // load (a fresh notification implies one already exists for this sender).
  // Fires at most once per mount (openedFromNotifRef) — openConversation()
  // itself doesn't touch `conversations`, but re-running this on every list
  // refresh would re-force the user back into this chat even after they'd
  // navigated elsewhere.
  const openedFromNotifRef = React.useRef(false);
  React.useEffect(() => {
    if (!openWith || loadingConvos || openedFromNotifRef.current) return;
    const match = conversations.find(c => c.otherEmail?.toLowerCase() === openWith.toLowerCase());
    if (match) {
      openedFromNotifRef.current = true;
      thread.openConversation(match);
      // Consume the param so a later refresh/re-navigation to this screen (which
      // on web keeps `openWith` in the URL) doesn't keep forcing this same
      // conversation open over whatever the user does next.
      navigation.setParams({ openWith: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWith, loadingConvos, conversations]);

  // Keep the conversations hook's "active email" ref in sync with the real active convo.
  React.useEffect(() => {
    // Breaks a circular dependency: useConversations (called above, before `thread`
    // exists) needs the active convo email, so it's threaded back in via this effect
    // rather than computed inline. Not simplifiable without reordering the hooks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveConvoEmailForList(thread.activeConvo?.otherEmail ?? null);
  }, [thread.activeConvo]);

  function onNewPress() {
    const canCreate = userRole === 'teacher' || userRole === 'school_admin' || userRole === 'super_admin';
    if (canCreate) {
      // Anchor the chooser just below the New button (not the screen edge).
      newBtnRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
        setNewMenuPos({ top: y + h + 6, left: Math.max(12, x + w - 224) });
      });
      setShowNewMenu(true);
    } else { setShowContacts(true); loadContacts(); } // parents: direct New chat
  }

  function onSelectContact(contact: Contact) {
    setShowContacts(false);
    thread.startConversation(contact);
  }

  function onAivorahBannerPress() {
    const aiConvo = conversations.find(c => isAivorah(c));
    if (aiConvo) thread.openConversation(aiConvo);
    else thread.startConversation({ id: AIVORAH_EMAIL, email: AIVORAH_EMAIL, name: 'Aivorah', role: 'teacher', context: '' });
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <ConversationList
          colors={colors}
          styles={styles}
          userRole={userRole}
          loadingConvos={loadingConvos}
          unifiedInbox={unifiedInbox}
          activeConvoEmail={thread.activeConvo?.otherEmail ?? null}
          convoFilter={convoFilter}
          setConvoFilter={setConvoFilter}
          convoSearch={convoSearch}
          setConvoSearch={setConvoSearch}
          showChannels={showChannels}
          channels={channels}
          totalUnread={totalUnread}
          conversations={conversations}
          newBtnRef={newBtnRef}
          onNewPress={onNewPress}
          onOpenChannel={thread.openChannel}
          onOpenConversation={thread.openConversation}
          onAivorahBannerPress={onAivorahBannerPress}
        />

        <ChatPanel
          colors={colors}
          styles={styles}
          userRole={userRole}
          userEmail={userEmail}
          activeChannel={thread.activeChannel}
          onCloseChannel={() => thread.setActiveChannel(null)}
          onChannelsReload={loadChannels}
          activeConvo={thread.activeConvo}
          loadingThread={thread.loadingThread}
          messages={thread.messages}
          flatListRef={thread.flatListRef}
          focusedMsgId={thread.focusedMsgId}
          setFocusedMsgId={thread.setFocusedMsgId}
          copiedMsgId={thread.copiedMsgId}
          setContextMenu={thread.setContextMenu}
          startEdit={thread.startEdit}
          toggleReaction={thread.toggleReaction}
          showEmoji={thread.showEmoji}
          setShowEmoji={thread.setShowEmoji}
          emojiCategory={thread.emojiCategory}
          setEmojiCategory={thread.setEmojiCategory}
          replyTo={thread.replyTo}
          setReplyTo={thread.setReplyTo}
          attachment={thread.attachment}
          removeAttachment={thread.removeAttachment}
          uploading={thread.uploading}
          sending={thread.sending}
          pickFile={thread.pickFile}
          inputText={thread.inputText}
          setInputText={thread.setInputText}
          sendMessage={thread.sendMessage}
        />
      </View>

      <EditMessageModal
        visible={!!thread.editingMsg}
        onClose={() => thread.setEditingMsg(null)}
        colors={colors}
        styles={styles}
        editText={thread.editText}
        setEditText={thread.setEditText}
        onSave={thread.saveEdit}
      />

      <MessageContextMenu
        contextMenu={thread.contextMenu}
        onClose={() => thread.setContextMenu(null)}
        styles={styles}
        messages={thread.messages}
        toggleReaction={thread.toggleReaction}
        copyMessageText={thread.copyMessageText}
        setReplyTo={thread.setReplyTo}
        setForwardMsg={thread.setForwardMsg}
        loadContactsIfNeeded={loadContacts}
        contactsLength={contacts.length}
        setEditingMsg={thread.setEditingMsg}
        setEditText={thread.setEditText}
        deleteMessage={thread.deleteMessage}
      />

      <ForwardMessageModal
        forwardMsg={thread.forwardMsg}
        onClose={() => thread.setForwardMsg(null)}
        colors={colors}
        styles={styles}
        loadingContacts={loadingContacts}
        channels={channels}
        contacts={contacts}
        onForwardToConvo={(email, name) => thread.forwardMessage({ kind: 'convo', email, name })}
        onForwardToChannel={(id) => thread.forwardMessage({ kind: 'channel', id })}
      />

      <ContactsModal
        visible={showContacts}
        onClose={() => setShowContacts(false)}
        colors={colors}
        styles={styles}
        userRole={userRole}
        loadingContacts={loadingContacts}
        contacts={contacts}
        onSelectContact={onSelectContact}
      />

      <NewMenu
        visible={showNewMenu}
        onClose={() => setShowNewMenu(false)}
        colors={colors}
        styles={styles}
        position={newMenuPos}
        onSelectDm={() => { setShowNewMenu(false); setShowContacts(true); loadContacts(); }}
        onSelectChannel={() => { setShowNewMenu(false); setShowCreateChannel(true); }}
      />

      <CreateChannelModal
        visible={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreated={() => { setShowCreateChannel(false); loadChannels(); }}
      />
    </ScreenLayout>
  );
}
