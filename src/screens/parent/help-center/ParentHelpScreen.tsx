/**
 * ParentHelpScreen.tsx
 * FAQ search, live chat with "Aivorah 24/7", and support-ticket submission.
 * Screen-level orchestration only - state lives in hooks/, network calls
 * in services/, sections in components/.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import ScreenLayout from '../../../components/common/ScreenLayout';
import Header from '../../../components/common/Header';
import { useAuth } from '../../../context/AuthContext';

import { useFaqSearch } from './hooks/useFaqSearch';
import { useSupportChat } from './hooks/useSupportChat';
import { useSupportTicket } from './hooks/useSupportTicket';

import { HeroSearch } from './components/HeroSearch';
import { SupportCards } from './components/SupportCards';
import { FaqList } from './components/FaqList';
import { ChatModal } from './components/ChatModal';
import { TicketModal } from './components/TicketModal';

export default function ParentHelpScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const faq = useFaqSearch();
  const chat = useSupportChat(firstName);
  const ticket = useSupportTicket(user?.email);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Help Center"
          subtitle={`We're here to support you, ${firstName}.`}
          showBack={true}
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <HeroSearch colors={colors} styles={styles} search={faq.search} setSearch={faq.setSearch} resultCount={faq.filteredFaqs.length} />
          <SupportCards colors={colors} styles={styles} onOpenChat={() => chat.setChatVisible(true)} onOpenTicket={ticket.openTicket} />
          <FaqList colors={colors} styles={styles} search={faq.search} openFaq={faq.openFaq} toggleFaq={faq.toggleFaq} filteredFaqs={faq.filteredFaqs} />

          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Aivorah v1.0.0 · NuShift</Text>
          </View>
        </ScrollView>

        <ChatModal
          colors={colors} styles={styles}
          visible={chat.chatVisible} onClose={() => chat.setChatVisible(false)}
          chatMsgs={chat.chatMsgs} chatLoading={chat.chatLoading}
          chatInput={chat.chatInput} setChatInput={chat.setChatInput}
          chatScrollRef={chat.chatScrollRef} sendSupportMessage={chat.sendSupportMessage}
        />

        <TicketModal
          colors={colors} styles={styles}
          visible={ticket.ticketVisible} onClose={ticket.closeTicket} email={user?.email}
          ticketSubject={ticket.ticketSubject} setTicketSubject={ticket.setTicketSubject}
          ticketMessage={ticket.ticketMessage} setTicketMessage={ticket.setTicketMessage}
          ticketLoading={ticket.ticketLoading} ticketError={ticket.ticketError} ticketSuccess={ticket.ticketSuccess}
          onSubmit={ticket.handleSubmitTicket}
        />
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48 },

  hero: { alignItems: 'center', paddingVertical: spacing.xxl, marginBottom: spacing.lg },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentYellow + '18', borderWidth: 1, borderColor: c.accentYellow + '40', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  heroTitle: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '800', color: c.textMain, textAlign: 'center', marginBottom: spacing.sm, letterSpacing: -0.5 },
  heroSub: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl, paddingHorizontal: spacing.xl },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 28, paddingHorizontal: spacing.xl, height: 52, width: '100%' },
  searchInput: { flex: 1, fontFamily: fonts.serif, fontSize: 14, color: c.textMain, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  searchResultCount: { fontFamily: fonts.serif, fontSize: 12, color: c.textDim, marginTop: spacing.md },

  sectionTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: c.textMain, marginBottom: spacing.lg, marginTop: spacing.xl },
  emptyText: { fontFamily: fonts.serif, fontSize: 14, color: c.textDim, fontStyle: 'italic', marginBottom: spacing.xl },

  faqItem: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  faqItemOpen: { borderColor: c.accentYellow + '60' },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  faqQWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  faqNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  faqNumText: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.accentYellow },
  faqQ: { flex: 1, fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMain, lineHeight: 20, paddingTop: 4 },
  faqA: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, lineHeight: 21, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.borderColor },

  supportRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  supportCard: { flex: 1, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  supportCardPrimary: { borderColor: c.accentYellow + '40', backgroundColor: c.accentYellow + '08' },
  supportIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center' },
  supportTitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: c.textMain, textAlign: 'center' },
  supportSub: { fontFamily: fonts.serif, fontSize: 11, color: c.textMuted, textAlign: 'center' },
  supportArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center' },

  versionRow: { alignItems: 'center', paddingTop: spacing.xl },
  versionText: { fontFamily: fonts.serif, fontSize: 11, color: c.textDim },

  chatOverlay: { flex: 1, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch', backgroundColor: 'rgba(0,0,0,0.5)', padding: Platform.OS === 'web' ? 24 : 0 },
  chatBox: { borderRadius: Platform.OS === 'web' ? 20 : undefined, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: Platform.OS === 'web' ? 1 : 0, overflow: 'hidden', maxHeight: Platform.OS === 'web' ? 600 : ('85%' as any), ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 560 } as any : {}) },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.borderColor },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chatAiOrb: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chatTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700' },
  chatSubtitle: { fontFamily: fonts.serif, fontSize: 11, marginTop: 1 },
  chatMsgs: { maxHeight: 320 },
  chatBubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%' },
  chatBubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  chatBubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  chatBubbleTxt: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20 },
  chatSuggestScroll: { maxHeight: 44 },
  chatSuggestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chatSuggestTxt: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1 },
  chatTextInput: { flex: 1, fontFamily: fonts.serif, fontSize: 14, paddingVertical: 8 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 480 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700', color: c.textMain },
  ticketNote: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, marginBottom: spacing.lg },
  modalFieldLabel: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: spacing.md },
  ticketInput: { backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  ticketTextInput: { fontFamily: fonts.serif, fontSize: 14, color: c.textMain, minHeight: 44 },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMuted },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#0B0B0B' },

  // New for the inline ticket error/success state (replacing Alert.alert,
  // which react-native-web doesn't implement).
  errorTxt: { color: '#ef4444', fontSize: 13, marginTop: spacing.md, marginBottom: spacing.sm },
  hintBox: { borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.lg },
});
