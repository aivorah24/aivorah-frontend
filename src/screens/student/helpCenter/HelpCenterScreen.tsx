import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { FAQS, buildTopics } from './constants';
import type { HelpTopic } from './types';
import { useHelpChat } from './hooks/useHelpChat';
import { useSupportTicket } from './hooks/useSupportTicket';
import SupportCards from './components/SupportCards';
import TopicsList from './components/TopicsList';
import FaqList from './components/FaqList';
import ChatModal from './components/ChatModal';
import TopicModal from './components/TopicModal';
import TicketModal from './components/TicketModal';

export default function HelpCenterScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const TOPICS = useMemo(() => buildTopics(colors), [colors]);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  const chat = useHelpChat(firstName);
  const ticket = useSupportTicket(user?.email);

  const filteredTopics = useMemo(() =>
    TOPICS.filter(t =>
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.articles.some(a => a.toLowerCase().includes(search.toLowerCase()))
    ), [search, TOPICS]);

  const filteredFaqs = useMemo(() =>
    FAQS.filter(f =>
      search === '' ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  function handleGoToTopic(topic: HelpTopic) {
    setActiveTopic(null);
    navigation.navigate(topic.screen);
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Help Center"
          subtitle={`We're here to support you, ${firstName}.`}
          showBack
          onBack={() => navigation.goBack()}
          onMenuPress={() => navigation.openDrawer()}
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.heroSection}>
            <View style={styles.heroPill}>
              <View style={styles.heroPillDot} />
              <Text style={styles.heroPillText}>HELP CENTER · AIVORAH</Text>
            </View>
            <Text style={styles.heroHeadline}>How can we{'\n'}help you?</Text>
          </View>

          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={colors.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search topics, questions..."
              placeholderTextColor={colors.textDim}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
                <Feather name="x" size={16} color={colors.textDim} />
              </TouchableOpacity>
            )}
          </View>
          {search.length > 0 && (
            <Text style={styles.searchCount}>{filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} · {filteredFaqs.length} FAQ{filteredFaqs.length !== 1 ? 's' : ''}</Text>
          )}

          <Text style={styles.sectionTitle}>Still need help?</Text>
          <SupportCards
            colors={colors}
            isDark={isDark}
            onOpenChat={() => chat.setChatVisible(true)}
            onOpenTicket={() => ticket.setTicketVisible(true)}
          />

          <Text style={styles.sectionTitle}>Browse Topics</Text>
          <TopicsList topics={filteredTopics} search={search} colors={colors} isDark={isDark} onSelectTopic={setActiveTopic} />

          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <FaqList
            faqs={filteredFaqs}
            search={search}
            openFaq={openFaq}
            onToggleFaq={(i) => setOpenFaq(openFaq === i ? null : i)}
            colors={colors}
          />

        </ScrollView>

        <ChatModal
          visible={chat.chatVisible}
          onClose={() => chat.setChatVisible(false)}
          colors={colors}
          isDark={isDark}
          chatMsgs={chat.chatMsgs}
          chatLoading={chat.chatLoading}
          chatInput={chat.chatInput}
          setChatInput={chat.setChatInput}
          sendSupportMessage={chat.sendSupportMessage}
          chatScrollRef={chat.chatScrollRef}
        />

        <TopicModal
          topic={activeTopic}
          activeArticle={activeArticle}
          onSelectArticle={setActiveArticle}
          onClose={() => setActiveTopic(null)}
          onGoToTopic={handleGoToTopic}
          colors={colors}
        />

        <TicketModal
          visible={ticket.ticketVisible}
          onClose={() => ticket.setTicketVisible(false)}
          userEmail={user?.email}
          subject={ticket.ticketSubject}
          setSubject={ticket.setTicketSubject}
          message={ticket.ticketMessage}
          setMessage={ticket.setTicketMessage}
          loading={ticket.ticketLoading}
          onSubmit={ticket.handleSubmitTicket}
          colors={colors}
        />

      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 60, maxWidth: 960, alignSelf: 'center', width: '100%' },

  heroSection: { paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: 14 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.accentYellow + '50', backgroundColor: c.accentYellow + '10' },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accentYellow },
  heroPillText: { fontSize: 10, fontWeight: '700', color: c.accentYellow, letterSpacing: 1.2 },
  heroHeadline: { fontSize: 40, fontWeight: '700', color: c.textMain, lineHeight: 48, fontFamily: fonts.serif, letterSpacing: -0.5 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 28, paddingHorizontal: spacing.xl, height: 52, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: c.textMain, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  searchCount: { fontSize: 12, color: c.textDim, marginBottom: spacing.md, marginLeft: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: c.textMain, marginTop: spacing.xl, marginBottom: spacing.md, fontFamily: fonts.serif },
});
