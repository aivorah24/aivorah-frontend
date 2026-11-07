/**
 * My Library - every assignment this teacher has created, private to them
 * (aivorah-assignments-service /assignments/library). Assign sends it again
 * with a new due date to the whole class or one student (e.g. a new joiner);
 * Remove takes it out of the library (the assignments already given stay).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import DatePicker from '../../../../components/common/DatePicker';
import { SUBJECT_COLORS } from '../constants';
import type { StudentItem } from '../types';
import { fetchMyLibrary, removeLibraryItem, assignFromLibrary, LibraryItem } from '../services/libraryService';
import { sameGrade, normalizeSubject, TeacherScope } from '../utils/teacherScope';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso?: string) => {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function MyLibrary({ active, teacherEmail, students, scope, subject, grade, colors, gold, styles, onAssigned }: {
  active: boolean;
  teacherEmail: string;
  students: StudentItem[];
  scope: TeacherScope;
  subject: string;           // '' = all of the teacher's subjects
  grade: string;             // '' = all of the teacher's grades
  colors: AppColors;
  gold: string;
  styles: any;
  onAssigned: (row: any) => void;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState<LibraryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await fetchMyLibrary()); }
    catch (e: any) { setError(e?.message || 'Could not load your library'); }
    finally { setLoading(false); setLoaded(true); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- (re)load whenever the tab is shown
  useEffect(() => { if (active) load(); }, [active, load]);

  const shown = useMemo(() => items.filter((it) =>
    (!grade || sameGrade(it.grade, grade))
    && (!subject || normalizeSubject(it.subject || '') === normalizeSubject(subject))
  ), [items, grade, subject]);

  const confirmRemove = (it: LibraryItem) => {
    const go = async () => {
      try { await removeLibraryItem(it.id); setItems((prev) => prev.filter((x) => x.id !== it.id)); }
      catch (e: any) { setError(e?.message || 'Could not remove this library item'); }
    };
    const msg = `Remove "${it.title}" from your library? Assignments you already gave stay as they are.`;
    if (Platform.OS === 'web') { if (typeof window !== 'undefined' && window.confirm(msg)) go(); }
    else Alert.alert('Remove from library', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  if (loading && !loaded) return <ActivityIndicator color={gold} style={{ marginTop: 32 }} />;
  if (error && !items.length) {
    return (
      <View style={styles.empty}>
        <Feather name="alert-circle" size={30} color={colors.textDim} />
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity onPress={load} style={[styles.createBtn, { marginTop: 12, paddingHorizontal: 20 }]} activeOpacity={0.85}>
          <Text style={styles.createBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (loaded && !shown.length) {
    return (
      <View style={styles.empty}>
        <Feather name="archive" size={36} color={colors.textDim} />
        <Text style={styles.emptyTitle}>{items.length ? 'Nothing for these filters' : 'Your library is empty'}</Text>
        <Text style={styles.emptyText}>Every assignment you create is saved here, only for you, so you can assign it again later.</Text>
      </View>
    );
  }

  return (
    <>
      {!!error && <Text style={[styles.errorText, { marginBottom: 8 }]}>{error}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {shown.map((it) => {
          const c = SUBJECT_COLORS[it.subject || ''] || gold;
          return (
            <View key={it.id} testID="my-library-card" style={[styles.card, { width: '47.5%', minWidth: 280 }]}>
              <View style={[styles.cardAccent, { backgroundColor: c }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardMeta}>
                      <View style={[styles.typePill, { backgroundColor: c + '20', borderColor: c + '50' }]}>
                        <Text style={[styles.typeText, { color: c }]}>{it.type || 'assignment'}</Text>
                      </View>
                      {it.subject ? <Text style={styles.subjectLabel}>{it.subject}</Text> : null}
                      {it.grade ? <Text style={styles.subjectLabel}>{it.grade}</Text> : null}
                    </View>
                    <Text style={styles.cardTitle}>{it.title}</Text>
                    <Text style={[styles.cardChapter, { marginTop: 2 }]}>
                      {`Assigned ${it.times_assigned}× · last on ${shortDate(it.last_assigned_at)}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <TouchableOpacity
                      testID="my-library-assign"
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: c }}
                      onPress={() => setAssigning(it)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Assign</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="my-library-remove" onPress={() => confirmRemove(it)} accessibilityRole="button" accessibilityLabel={`Remove ${it.title} from your library`} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Feather name="trash-2" size={15} color={colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <AssignFromLibraryModal
        item={assigning}
        students={students}
        scope={scope}
        teacherEmail={teacherEmail}
        colors={colors}
        gold={gold}
        onClose={() => setAssigning(null)}
        onAssigned={(row) => { setAssigning(null); onAssigned(row); load(); }}
      />
    </>
  );
}

function AssignFromLibraryModal({ item, students, scope, teacherEmail, colors, gold, onClose, onAssigned }: {
  item: LibraryItem | null;
  students: StudentItem[];
  scope: TeacherScope;
  teacherEmail: string;
  colors: AppColors;
  gold: string;
  onClose: () => void;
  onAssigned: (row: any) => void;
}) {
  const [dueDate, setDueDate] = useState('');
  const [to, setTo] = useState<'all' | 'specific'>('all');
  const [student, setStudent] = useState<StudentItem | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fresh form for each item opened
  useEffect(() => { setDueDate(''); setTo('all'); setStudent(null); setSearch(''); setError(''); setSaving(false); }, [item?.id]);

  // Students of the item's grade (any of the teacher's grades if it has none).
  const pool = useMemo(() => students.filter((s) => (item?.grade ? sameGrade(s.grade, item.grade) : scope.allows(s.grade, null))), [students, item, scope]);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (q ? pool.filter((s) => s.name.toLowerCase().includes(q)) : pool).slice(0, 8);
  }, [pool, search]);

  const canAssign = !!item && !!dueDate && (to === 'all' || !!student) && !saving;
  const assign = async () => {
    if (!item || !canAssign) return;
    setSaving(true); setError('');
    const res = await assignFromLibrary(item, { dueDate, studentId: to === 'specific' ? student!.id : null, teacherEmail });
    setSaving(false);
    if (res.ok) onAssigned(res.data);
    else setError(res.error);
  };

  const chip = (on: boolean) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, borderColor: on ? gold : colors.borderColor, backgroundColor: on ? gold + '20' : 'transparent' });

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ width: '100%', maxWidth: 440, backgroundColor: colors.cardDark, borderRadius: 18, borderWidth: 1, borderColor: colors.borderColor, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain, flex: 1 }} numberOfLines={2}>Assign “{item?.title}”</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"><Feather name="x" size={18} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12.5, color: colors.textMuted }}>{[item?.subject, item?.grade].filter(Boolean).join(' · ')}</Text>

          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Due date</Text>
          <View style={{ zIndex: 10 }}>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select a due date" minDate={todayKey()} />
          </View>

          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assign to</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={chip(to === 'all')} onPress={() => { setTo('all'); setStudent(null); }} accessibilityRole="button">
              <Text style={{ fontSize: 13, fontWeight: '700', color: to === 'all' ? gold : colors.textMuted }}>{item?.grade ? `Whole class (${item.grade})` : 'Whole class'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={chip(to === 'specific')} onPress={() => setTo('specific')} accessibilityRole="button">
              <Text style={{ fontSize: 13, fontWeight: '700', color: to === 'specific' ? gold : colors.textMuted }}>One student</Text>
            </TouchableOpacity>
          </View>

          {to === 'specific' && (student ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: gold, borderRadius: 10, padding: 10 }}>
              <Feather name="user" size={14} color={gold} />
              <Text style={{ flex: 1, color: colors.textMain, fontWeight: '700' }}>{student.name}</Text>
              <TouchableOpacity onPress={() => setStudent(null)} accessibilityRole="button" accessibilityLabel="Change student"><Feather name="x" size={14} color={colors.textMuted} /></TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search student by name…"
                placeholderTextColor={colors.textDim}
                style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: colors.textMain }}
              />
              <ScrollView style={{ maxHeight: 180 }}>
                {matches.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => setStudent(s)} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderColor }} accessibilityRole="button">
                    <Text style={{ color: colors.textMain }}>{s.name} <Text style={{ color: colors.textDim }}>· {s.grade}</Text></Text>
                  </TouchableOpacity>
                ))}
                {!matches.length && <Text style={{ color: colors.textMuted, paddingVertical: 8 }}>No students found{item?.grade ? ` in ${item.grade}` : ''}.</Text>}
              </ScrollView>
            </>
          ))}

          {!!error && <Text style={{ color: colors.accentRed, fontSize: 12.5 }}>{error}</Text>}

          <TouchableOpacity
            testID="my-library-assign-confirm"
            onPress={assign}
            disabled={!canAssign}
            style={{ backgroundColor: canAssign ? gold : gold + '55', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}
            accessibilityRole="button"
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>Assign</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
