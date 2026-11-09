/**
 * DailyTidbitCard.tsx
 * The World & You card with the "GK Fact | Current Affairs" tabs.
 * GK Fact: today's grade-specific fact (aivorah-world-and-you-service).
 * Current Affairs: the tab switch only — the parent screen shows the daily
 * digest from aivorah-current-affairs-service below this card.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius } from '../../../../theme';
import { useDailyTidbit } from '../hooks/useDailyTidbit';
import { categoryIcon } from '../utils/quizHelpers';

interface Props {
  grade: string;
  onTabChange?: (tab: 'gk' | 'news') => void;
  /** Controlled tab (The World & You owns it so Back can reopen Current Affairs). */
  tab?: 'gk' | 'news';
}

export default function DailyTidbitCard({ grade, onTabChange, tab: controlledTab }: Props) {
  const { colors, isDark } = useTheme();
  const { tab: ownTab, setTab: setOwnTab, data, loading, error, loadTidbit } = useDailyTidbit(grade, undefined, onTabChange);
  const tab = controlledTab ?? ownTab;
  const setTab = (next: 'gk' | 'news') => (controlledTab === undefined ? setOwnTab(next) : onTabChange?.(next));

  // ── Theme tokens ─────────────────────────────────────────────────
  const teal        = '#BAA467';
  const rose        = '#BAA467';
  const cardBg      = isDark ? colors.cardDark  : '#F0F7F6';
  const borderCol   = isDark ? colors.borderColor : teal + '25';
  const activeTab   = tab === 'gk' ? teal : rose;
  const titleColor  = isDark ? colors.textMain : '#1C2A28';
  const mutedColor  = colors.textMuted;

  return (
    <View style={[s.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={[s.iconCircle, { backgroundColor: activeTab + '20' }]}>
            <Feather name={tab === 'gk' ? 'star' : 'radio'} size={14} color={activeTab} />
          </View>
          <View>
            <Text style={[s.cardTitle, { color: titleColor }]}>
              {tab === 'gk' ? 'Did You Know?' : 'Today in the World'}
            </Text>
            <Text style={[s.cardSub, { color: mutedColor }]}>
              {tab === 'gk' ? 'Daily Knowledge' : 'Current Affairs'} · {grade}
            </Text>
          </View>
        </View>
        {tab === 'gk' ? (
          <TouchableOpacity onPress={loadTidbit} style={s.refreshBtn} disabled={loading}>
            <Feather name="refresh-cw" size={14} color={mutedColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tab switcher */}
      <View style={[s.tabs, { backgroundColor: isDark ? colors.bgDark : teal + '10', borderColor: borderCol }]}>
        <TouchableOpacity
          style={[s.tab, tab === 'gk' && { backgroundColor: teal, borderRadius: radius.sm - 2 }]}
          onPress={() => setTab('gk')}
          activeOpacity={0.8}
        >
          <Feather name="star" size={12} color={tab === 'gk' ? '#fff' : mutedColor} />
          <Text style={[s.tabText, { color: tab === 'gk' ? '#fff' : mutedColor }]}>GK Fact</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'news' && { backgroundColor: rose, borderRadius: radius.sm - 2 }]}
          onPress={() => setTab('news')}
          activeOpacity={0.8}
        >
          <Feather name="radio" size={12} color={tab === 'news' ? '#fff' : mutedColor} />
          <Text style={[s.tabText, { color: tab === 'news' ? '#fff' : mutedColor }]}>Current Affairs</Text>
        </TouchableOpacity>
      </View>

      {/* Content — GK only; Current Affairs is rendered by the parent screen */}
      {tab !== 'gk' ? null : loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="small" color={activeTab} />
          <Text style={[s.loadingText, { color: mutedColor }]}>Fetching today&apos;s tidbit...</Text>
        </View>
      ) : error ? (
        <View style={s.loadingBox}>
          <Feather name="wifi-off" size={20} color={mutedColor} />
          <Text style={[s.loadingText, { color: mutedColor }]}>Couldn&apos;t load. Tap refresh to try again.</Text>
        </View>
      ) : data ? (
        <View style={s.content}>
          <View style={[s.categoryBadge, { backgroundColor: teal + '18', borderColor: teal + '40' }]}>
            <Feather name={categoryIcon(data.gk.category) as any} size={11} color={teal} />
            <Text style={[s.categoryText, { color: teal }]}>{data.gk.category}</Text>
          </View>
          <Text style={[s.factText, { color: titleColor }]}>
            {(() => {
              const f = data.gk.fact;
              if (typeof f === 'string' && f.trim().startsWith('{')) {
                try { return JSON.parse(f).fact || f; } catch { return f; }
              }
              return f;
            })()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle:  { fontSize: 14, fontWeight: '700' },
  cardSub:    { fontSize: 11, marginTop: 1 },
  refreshBtn: { padding: 6 },

  tabs: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
  },
  tabText: { fontSize: 12, fontWeight: '600' },

  loadingBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: { fontSize: 12, textAlign: 'center' },

  content:      { gap: spacing.sm },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  factText:     { fontSize: 14, fontWeight: '500', lineHeight: 22 },
});
