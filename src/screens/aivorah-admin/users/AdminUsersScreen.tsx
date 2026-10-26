import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { SelectField } from '../shared/SelectField';
import { TablePager } from '../shared/TablePager';
import { makeStyles } from './styles';
import { useAdminUsers } from './hooks/useAdminUsers';
import { UserSlideOver, ROLE_OPTIONS, roleLabel, type SlideOverMode } from './components/UserSlideOver';

function initials(name: string, email: string): string {
  const words = (name || email || '?').replace(/^(Ms|Mr|Mrs|Dr)\.?\s+/i, '').trim().split(/\s+/);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
}

// "2 min ago" / "3 h ago" / "Yesterday" / "5 days ago" / date.
export function lastActiveLabel(iso: string | null, now = Date.now()): string {
  if (!iso) return '—';
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Checkbox({ on, s, colors }: { on: boolean; s: any; colors: any }) {
  return (
    <View style={[s.check, on && { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow }]}>
      {on && <Feather name="check" size={12} color={colors.cardDark} />}
    </View>
  );
}

export default function AdminUsersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const u = useAdminUsers();
  const [panel, setPanel] = useState<SlideOverMode>(null);

  const sage = colors.primary || colors.accentGreen;
  const avatarTones = [sage, colors.accentYellow, colors.accentRed];
  const allOn = u.users.length > 0 && u.users.every((x) => u.selected.has(x.id));
  const pageIndex = u.filters.page - 1;
  const pageCount = Math.max(1, Math.ceil(u.total / u.pageSize));

  function done(message: string) {
    setPanel(null);
    u.setNotice(message);
    u.reload();
  }

  return (
    <ScreenLayout>
      <View style={s.screen}>
        <Header title="Users" subtitle="Edit details, change roles, or block access." onMenuPress={() => navigation?.openDrawer?.()} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.toolbar}>
            <View style={s.searchBox}>
              <Feather name="search" size={15} color={colors.textDim} />
              <TextInput
                testID="users-search"
                style={s.searchInput}
                placeholder="Search by name, email, school…"
                placeholderTextColor={colors.textDim}
                value={u.filters.q}
                onChangeText={(q) => u.setFilter({ q })}
              />
            </View>
            <SelectField testID="users-filter-role" label="Role" allLabel="All roles" value={u.filters.role || 'all'}
              options={ROLE_OPTIONS} onChange={(v) => u.setFilter({ role: v === 'all' ? '' : v })} minWidth={160} />
            <SelectField testID="users-filter-status" label="Status" allLabel="All statuses" value={u.filters.status || 'all'}
              options={[{ value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }]}
              onChange={(v) => u.setFilter({ status: v === 'all' ? '' : v })} minWidth={150} />
            <TouchableOpacity testID="users-go-import" style={s.outlineBtn} onPress={() => navigation?.navigate?.('BulkImport')}>
              <Feather name="upload-cloud" size={15} color={colors.textMain} />
              <Text style={s.outlineBtnText}>Bulk import</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="users-add" style={[s.goldBtn, { backgroundColor: colors.accentYellow }]} onPress={() => setPanel({ type: 'add' })}>
              <Feather name="plus" size={15} color={colors.cardDark} />
              <Text style={[s.goldBtnText, { color: colors.cardDark }]}>Add user</Text>
            </TouchableOpacity>
          </View>

          {!!u.notice && (
            <View style={s.notice} testID="users-notice">
              <Feather name="info" size={14} color={colors.textMain} />
              <Text style={s.noticeText}>{u.notice}</Text>
              <TouchableOpacity onPress={() => u.setNotice('')}><Feather name="x" size={14} color={colors.textDim} /></TouchableOpacity>
            </View>
          )}

          {u.selected.size > 0 && (
            <View style={[s.selBar, { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '1F' }]} testID="users-selection-bar">
              <Text style={s.selCount}>{u.selected.size} selected</Text>
              <TouchableOpacity testID="users-bulk-block" style={[s.selBtn, { borderColor: colors.accentRed }]} onPress={u.bulkBlock}>
                <Text style={[s.selBtnText, { color: colors.accentRed }]}>Block selected</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="users-bulk-unblock" style={s.selBtn} onPress={u.bulkUnblock}>
                <Text style={s.selBtnText}>Unblock selected</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={u.clearSelection}><Text style={s.clearText}>Clear</Text></TouchableOpacity>
            </View>
          )}

          <View style={s.card}>
            <Text style={s.cardTitle}>Users ({u.total.toLocaleString('en-US')})</Text>
            <Text style={s.cardSub}>Edit details, change roles, or block access. Blocked users are signed out and cannot log in.</Text>

            {u.error ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>{u.error}</Text>
                <TouchableOpacity onPress={u.reload} style={s.outlineBtn}><Text style={s.outlineBtnText}>Retry</Text></TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={s.table}>
                  <View style={s.headRow}>
                    <TouchableOpacity testID="users-select-all" style={s.checkCell} onPress={u.toggleAll} accessibilityLabel="Select all on this page">
                      <Checkbox on={allOn} s={s} colors={colors} />
                    </TouchableOpacity>
                    <Text style={[s.th, { flex: 2.6 }]}>User</Text>
                    <Text style={[s.th, { flex: 1 }]}>Role</Text>
                    <Text style={[s.th, { flex: 1.4 }]}>School</Text>
                    <Text style={[s.th, { flex: 1.3 }]}>Last active</Text>
                    <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
                    <Text style={[s.th, { flex: 1.5, textAlign: 'right', paddingRight: 16 }]}>Actions</Text>
                  </View>

                  {u.loading && !u.users.length ? (
                    <ActivityIndicator color={colors.accentYellow} style={{ marginVertical: 28 }} />
                  ) : u.users.length === 0 ? (
                    <Text style={s.emptyRow}>No users match.</Text>
                  ) : u.users.map((x, i) => {
                    const on = u.selected.has(x.id);
                    const blocked = x.status === 'blocked';
                    const tone = avatarTones[i % 3];
                    return (
                      <View key={x.id} testID={`users-row-${x.id}`}
                        style={[s.row, i % 2 === 1 && s.rowAlt, on && { backgroundColor: colors.accentYellow + '1F' }, blocked && { opacity: 0.65 }]}>
                        <TouchableOpacity style={s.checkCell} onPress={() => u.toggle(x.id)} accessibilityLabel={`Select ${x.name}`}>
                          <Checkbox on={on} s={s} colors={colors} />
                        </TouchableOpacity>
                        <View style={[s.userCell, { flex: 2.6 }]}>
                          <View style={[s.avatar, { backgroundColor: tone + '2E' }]}><Text style={[s.avatarText, { color: tone }]}>{initials(x.name, x.email)}</Text></View>
                          <View style={{ flexShrink: 1, minWidth: 0 }}>
                            <Text style={s.name} numberOfLines={1}>{x.name || '—'}{x.isPlatformAdmin ? '  ·  Admin' : ''}</Text>
                            <Text style={s.email} numberOfLines={1}>{x.email}</Text>
                          </View>
                        </View>
                        <Text style={[s.td, { flex: 1 }]}>{roleLabel(String(x.role))}</Text>
                        <Text style={[s.td, { flex: 1.4 }]} numberOfLines={1}>{x.school || 'Direct (B2C)'}</Text>
                        <Text style={[s.td, s.muted, { flex: 1.3 }]}>{blocked ? '—' : lastActiveLabel(x.last_active_at)}</Text>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={[s.pill, { alignSelf: 'center' }, blocked
                            ? { color: colors.accentRed, borderColor: colors.accentRed, backgroundColor: colors.accentRed + '1F' }
                            : { color: sage, borderColor: sage, backgroundColor: sage + '1F' }]}>{blocked ? 'Blocked' : 'Active'}</Text>
                        </View>
                        <View style={[s.actions, { flex: 1.5 }]}>
                          <TouchableOpacity testID={`users-edit-${x.id}`} style={s.actBtn} onPress={() => setPanel({ type: 'edit', user: x })}>
                            <Text style={s.actBtnText}>Edit</Text>
                          </TouchableOpacity>
                          {!x.isPlatformAdmin && (
                            <TouchableOpacity testID={`users-block-${x.id}`} style={[s.actBtn, { borderColor: blocked ? sage : colors.accentRed }]} onPress={() => setPanel({ type: 'block', user: x })}>
                              <Text style={[s.actBtnText, { color: blocked ? sage : colors.accentRed }]}>{blocked ? 'Unblock' : 'Block'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {u.total > u.pageSize && (
              <TablePager testIDPrefix="users-page" colors={colors} page={pageIndex} pageCount={pageCount} total={u.total} pageSize={u.pageSize}
                setPage={(fn) => u.setFilter({ page: fn(pageIndex) + 1 })} />
            )}
          </View>
        </ScrollView>
        <UserSlideOver mode={panel} onClose={() => setPanel(null)} onDone={done} />
      </View>
    </ScreenLayout>
  );
}
