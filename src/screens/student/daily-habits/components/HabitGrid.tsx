import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GOLD, safeIcon } from '../constants';
import type { CoinPop, Habit } from '../types';

interface Props {
  tasks: (Habit & { fromParent: boolean })[];
  completed: string[];
  checking: string | null;
  coinPop: CoinPop | null;
  onToggle: (id: string) => void;
  cardDark: string;
  textMain: string;
  textMuted: string;
  textDim: string;
  emptyBorderColor: string;
  styles: any;
}

export default function HabitGrid({
  tasks, completed, checking, coinPop, onToggle,
  cardDark, textMain, textMuted, textDim, emptyBorderColor, styles,
}: Props) {
  if (tasks.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: cardDark, borderColor: emptyBorderColor }]}>
        <Feather name="inbox" size={36} color={textDim} />
        <Text style={[styles.emptyTitle, { color: textMain }]}>No habits yet</Text>
        <Text style={[styles.emptySub, { color: textMuted }]}>Ask your parent to assign daily habits for you.</Text>
      </View>
    );
  }

  return (
    <View style={styles.habitGrid}>
      {tasks.map(task => {
        const done      = completed.includes(task.id);
        const isLoading = checking === task.id;
        const popping   = coinPop?.id === task.id;
        return (
          <TouchableOpacity
            key={task.id}
            style={[styles.habitCard, {
              backgroundColor: done ? GOLD + '18' : cardDark,
              borderColor: done ? GOLD + '60' : GOLD + '30',
            }]}
            onPress={() => onToggle(task.id)}
            activeOpacity={0.8}
            disabled={!!checking}
          >
            <View style={[styles.habitIcon, { backgroundColor: done ? GOLD + '28' : GOLD + '12' }]}>
              {isLoading
                ? <ActivityIndicator size="small" color={GOLD} />
                : <Feather name={safeIcon(task.icon)} size={14} color={GOLD} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.habitLabel, { color: done ? textMain : textMuted, fontWeight: done ? '700' : '500' }]} numberOfLines={2}>{task.label}</Text>
              <View style={styles.habitCoinsRow}>
                <Feather name="star" size={9} color={GOLD} />
                <Text style={[styles.habitCoins, { color: GOLD }]}>+{task.coins}</Text>
              </View>
            </View>
            <View style={[styles.checkbox, { backgroundColor: done ? GOLD : 'transparent', borderColor: done ? GOLD : GOLD + '50' }]}>
              {done && <Feather name="check" size={11} color="#fff" />}
            </View>
            {popping && (
              <View style={[styles.coinPop, { backgroundColor: GOLD }]}>
                <Text style={styles.coinPopText}>+{coinPop!.coins}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
