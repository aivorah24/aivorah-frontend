import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { DifficultyFilter, PassageSummary } from '../types';
import { DEFAULT_GRADIENT, LEVEL_META, levelMeta } from '../utils/levelMeta';
import type { ReadAloudStyles } from './styles';

const FILTERS: DifficultyFilter[] = ['all', 'easy', 'medium', 'hard'];

interface Props {
  s: ReadAloudStyles;
  colors: AppColors;
  lexile: number | null;
  passages: PassageSummary[];
  hasPassages: boolean;
  loading: boolean;
  error: string | null;
  filter: DifficultyFilter;
  onFilter: (f: DifficultyFilter) => void;
  onPick: (title?: string) => void;
  onRetry: () => void;
  busy: boolean;
  openError?: string | null;
}

export default function PassagePicker({ s, colors, lexile, passages, hasPassages, loading, error, filter, onFilter, onPick, onRetry, busy, openError }: Props) {
  return (
    <View style={s.pickContainer}>
      <LinearGradient colors={['#9FB2A418', '#C3DCD810']} style={s.heroCard}>
        <View style={s.heroIconCircle}>
          <Feather name="mic" size={28} color={colors.accentYellow} />
        </View>
        <Text style={[s.heroTitle, { color: colors.textMain }]}>Read Aloud</Text>
        <Text style={[s.heroSub, { color: colors.textMuted }]}>Pick a story, listen or read it aloud, and see how you do!</Text>
        {lexile != null && (
          <View style={s.lexilePill}>
            <Feather name="bar-chart-2" size={14} color={colors.accentYellow} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accentYellow, marginLeft: 6 }}>Lexile {lexile}L</Text>
          </View>
        )}
      </LinearGradient>

      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          const lm = f === 'all' ? null : LEVEL_META[f];
          return (
            <TouchableOpacity
              key={f}
              testID={`read-aloud-filter-${f}`}
              style={[s.filterTab, active && { backgroundColor: lm?.bg || colors.accentYellow + '18', borderColor: lm?.border || colors.accentYellow + '40' }]}
              onPress={() => onFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterTabText, { color: active ? (lm?.text || colors.accentYellow) : colors.textDim }]}>{lm ? lm.label : 'All'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.centerMessage}>
          <ActivityIndicator color={colors.accentYellow} />
          <Text style={s.centerMessageText}>Loading stories…</Text>
        </View>
      ) : error ? (
        <View style={s.centerMessage}>
          <Feather name="alert-circle" size={22} color={colors.textMuted} />
          <Text style={s.centerMessageText}>{`Couldn't load stories. ${error}`}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={onRetry} accessibilityRole="button">
            <Text style={{ color: colors.accentYellow, fontWeight: '700' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : !passages.length ? (
        <View style={s.centerMessage}>
          <Text style={s.centerMessageText}>{hasPassages ? 'No stories at this level yet.' : 'No stories for your grade yet.'}</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {passages.map((p) => {
            const lm = levelMeta(p.level);
            return (
              <TouchableOpacity
                key={p.title}
                testID="read-aloud-passage-card"
                accessibilityLabel={p.title}
                style={[s.gridCard, { borderColor: colors.borderColor }]}
                onPress={() => onPick(p.title)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <LinearGradient colors={p.gradient || DEFAULT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gridCardGradient}>
                  <View style={s.gridCardIconCircle}>
                    <Feather name={(p.icon || 'book-open') as any} size={22} color="#fff" />
                  </View>
                </LinearGradient>
                <View style={s.gridCardBody}>
                  <Text style={[s.gridCardTitle, { color: colors.textMain }]} numberOfLines={2}>{p.title}</Text>
                  <View style={s.gridCardMeta}>
                    <View style={[s.levelPill, { backgroundColor: lm.bg, borderColor: lm.border }]}>
                      <Text style={[s.levelPillText, { color: lm.text }]}>{lm.label}</Text>
                    </View>
                    <Text style={[s.gridCardTopic, { color: colors.textDim }]}>{p.topic}</Text>
                  </View>
                  <Text style={[s.gridCardWords, { color: colors.textDim }]}>{p.wordCount} words</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {openError ? <Text style={s.centerMessageText} accessibilityRole="alert">{openError}</Text> : null}

      <TouchableOpacity
        style={[s.surpriseBtn, { borderColor: colors.accentYellow + '40' }]}
        onPress={() => onPick()}
        disabled={busy || !!error}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator size="small" color={colors.accentYellow} /> : (
          <>
            <Feather name="shuffle" size={16} color={colors.accentYellow} />
            <Text style={{ color: colors.accentYellow, fontWeight: '600', fontSize: 14 }}>Surprise Me!</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
