import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { useDailyTasks } from './hooks/useDailyTasks';
import { GOLD, GOLD_BG, GOLD_BORDER, ICONS, COIN_OPTIONS, TASK_SUGGESTIONS } from './constants';

export default function ParentDailyTasksScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const parentEmail = user?.email || '';

  const {
    children, loadingChildren, selectedChild, setSelectedChild,
    tasks, loadingTasks,
    saving, error, setError,
    refreshing, onRefresh,
    addTask, removeTask,
  } = useDailyTasks(parentEmail);

  // New task form (form-local UI state stays in the screen)
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string>('check-circle');
  const [coins, setCoins] = useState('5');

  async function handleAddTask() {
    const ok = await addTask(label, icon, coins);
    if (ok) {
      setLabel('');
      setIcon('check-circle');
      setCoins('5');
    }
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Daily Tasks"
          subtitle="Assign habits to your children"
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        >
          {/* Page header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleRow}>
              <View style={styles.pageTitleIcon}>
                <Feather name="check-square" size={18} color={GOLD} />
              </View>
              <View>
                <Text style={styles.pageTitle}>Daily Tasks</Text>
                <Text style={styles.pageSubtitle}>Tasks you assign appear in your child&apos;s Daily Habits screen</Text>
              </View>
            </View>
          </View>

          {/* Child selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT CHILD</Text>
            {loadingChildren ? (
              <ActivityIndicator color={GOLD} />
            ) : children.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="users" size={32} color={colors.textDim} />
                <Text style={styles.emptyText}>No children linked yet.</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ParentMyKids')} activeOpacity={0.8}>
                  <Text style={[styles.emptyText, { color: GOLD, marginTop: 4 }]}>Go to My Kids to add one</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.childPills}>
                {children.map(child => {
                  const active = selectedChild?.id === child.id;
                  return (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.childPill, active && styles.childPillActive]}
                      onPress={() => setSelectedChild(child)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.pillAvatar, { backgroundColor: active ? GOLD_BG : colors.bgDark }]}>
                        <Text style={[styles.pillAvatarText, { color: active ? GOLD : colors.textMuted }]}>
                          {child.name?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.pillName, active && { color: GOLD }]}>{child.name}</Text>
                        <Text style={styles.pillGrade}>{child.grade ?? ''}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {selectedChild && (
            <>
              {/* Existing tasks */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ASSIGNED TASKS — {selectedChild.name?.toUpperCase()}</Text>
                {loadingTasks ? (
                  <ActivityIndicator color={GOLD} style={{ paddingVertical: 24 }} />
                ) : tasks.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Feather name="inbox" size={28} color={colors.textDim} />
                    <Text style={styles.emptyText}>No tasks assigned yet. Add one below.</Text>
                  </View>
                ) : (
                  <View style={styles.taskList}>
                    {tasks.map(task => (
                      <View key={task.id} testID={`task-card-${task.id}`} style={[styles.taskRow, !isMobile && styles.taskRowHalf]}>
                        <View style={styles.taskIconWrap}>
                          <Feather name={(task.icon as any) || 'check-circle'} size={15} color={GOLD} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskLabel}>{task.label}</Text>
                          <Text style={styles.taskCoins}>{task.coins} coins</Text>
                        </View>
                        {task.completedToday && (
                          <View style={styles.doneBadge}>
                            <Feather name="check-circle" size={13} color={colors.accentGreen} />
                            <Text style={styles.doneBadgeText}>Done today</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          testID={`delete-task-${task.id}`}
                          accessibilityLabel={`Delete task ${task.label}`}
                          onPress={() => removeTask(task.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={15} color={colors.accentRed} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Add task form */}
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Feather name="plus-circle" size={16} color={GOLD} />
                  <Text style={styles.formTitle}>Add New Task</Text>
                </View>

                {/* Label */}
                <TextInput
                  style={styles.input}
                  placeholder={`New task for ${selectedChild.name} (e.g. Read for 20 mins)`}
                  placeholderTextColor={colors.textMuted}
                  value={label}
                  onChangeText={t => { setLabel(t); setError(''); }}
                />

                {/* Icon picker */}
                <Text style={styles.fieldLabel}>Icon</Text>
                <View style={styles.iconGrid}>
                  {ICONS.map(ic => (
                    <TouchableOpacity
                      key={ic}
                      style={[styles.iconChip, icon === ic && styles.iconChipActive]}
                      onPress={() => setIcon(ic)}
                      activeOpacity={0.7}
                    >
                      <Feather name={ic as any} size={16} color={icon === ic ? GOLD : colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Suggestions for selected icon */}
                {TASK_SUGGESTIONS[icon] && (
                  <View style={styles.suggestionsRow}>
                    {TASK_SUGGESTIONS[icon].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestionChip}
                        onPress={() => { setLabel(s); setError(''); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Coins picker */}
                <Text style={styles.fieldLabel}>Coins Reward</Text>
                <View style={styles.coinsRow}>
                  {COIN_OPTIONS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.coinChip, coins === c && styles.coinChipActive]}
                      onPress={() => setCoins(c)}
                      activeOpacity={0.7}
                    >
                      <Feather name="circle" size={10} color={coins === c ? GOLD : colors.textMuted} />
                      <Text style={[styles.coinText, coins === c && { color: GOLD }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? (
                  <View style={styles.errorRow}>
                    <Feather name="alert-circle" size={13} color={colors.accentRed} />
                    <Text style={[styles.errorText, { color: colors.accentRed }]}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  testID="add-task-btn"
                  style={[styles.addBtn, (!label.trim() || saving) && { opacity: 0.5 }]}
                  onPress={handleAddTask}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving
                    ? <ActivityIndicator color="#0B0B0B" size="small" />
                    : <>
                        <Feather name="plus" size={16} color="#0B0B0B" />
                        <Text style={styles.addBtnText}>Add Task</Text>
                      </>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.lg },

  pageHeader: {
    backgroundColor: GOLD_BG,
    borderWidth: 1, borderColor: GOLD_BORDER,
    borderRadius: radius.xl, padding: spacing.xl,
  },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pageTitleIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GOLD_BG, borderWidth: 1, borderColor: GOLD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontFamily: fonts.serif, fontSize: 20, fontWeight: '700', color: c.textMain },
  pageSubtitle: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, marginTop: 2 },

  section: { gap: spacing.md },
  sectionLabel: {
    fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  childPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  childPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, paddingVertical: 10, paddingHorizontal: 14,
  },
  childPillActive: { borderColor: GOLD, backgroundColor: GOLD_BG },
  pillAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillAvatarText: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700' },
  pillName: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMain },
  pillGrade: { fontFamily: fonts.serif, fontSize: 11, color: c.textMuted },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, textAlign: 'center' },

  taskList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.xl,
    width: '100%',
  },
  // Fixed half width, so a lone task stays one column wide.
  taskRowHalf: { width: '48.5%' },
  taskIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: GOLD_BG, alignItems: 'center', justifyContent: 'center',
  },
  taskLabel: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMain },
  taskCoins: { fontFamily: fonts.serif, fontSize: 11, color: GOLD, marginTop: 2 },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.accentGreen + '20', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, marginRight: 8,
  },
  doneBadgeText: { color: c.accentGreen, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700' },

  formCard: {
    backgroundColor: c.cardDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md,
    maxWidth: 600, alignSelf: 'center', width: '100%',
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formTitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: c.textMain },
  fieldLabel: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', color: c.textMuted },

  input: {
    borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 9,
    fontFamily: fonts.serif, fontSize: 13, color: c.textMain, backgroundColor: c.bgDark,
  },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconChip: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  iconChipActive: { borderColor: GOLD, backgroundColor: GOLD_BG },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  suggestionChip: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
    backgroundColor: GOLD_BG, borderWidth: 1, borderColor: GOLD_BORDER,
  },
  suggestionText: { fontFamily: fonts.serif, fontSize: 11, color: GOLD, fontWeight: '600' },

  coinsRow: { flexDirection: 'row', gap: 6 },
  coinChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  coinChipActive: { borderColor: GOLD, backgroundColor: GOLD_BG },
  coinText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: c.textMuted },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontFamily: fonts.serif, fontSize: 12, flex: 1 },

  addBtn: {
    backgroundColor: GOLD, borderRadius: 999,
    paddingVertical: 11, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  addBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#0B0B0B' },
});
