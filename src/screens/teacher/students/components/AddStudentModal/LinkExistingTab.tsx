import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { normalizeGrade } from '../../../student-progress/utils/rosterFilters';

interface Props {
  colors: AppColors;
  gold: string;
  isDark: boolean;
  styles: any;
  allowedGrades: string[];
  linkSearch: string; setLinkSearch: (v: string) => void;
  linkGradeFilter: string; setLinkGradeFilter: (v: string) => void;
  linkableStudents: any[];
  linkableLoading: boolean;
  selectedStudents: any[];
  toggleSelectedStudent: (s: any) => void;
  linkEmail: string;
  linking: boolean;
  linkError: string;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function LinkExistingTab({
  colors, gold, isDark, styles, allowedGrades,
  linkSearch, setLinkSearch, linkGradeFilter, setLinkGradeFilter,
  linkableStudents, linkableLoading, selectedStudents, toggleSelectedStudent,
  linkEmail, linking, linkError, onCancel, onSubmit,
}: Props) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.modalNote}>
        Select a student from your grade &amp; curriculum to add to your class.
      </Text>

      {/* Search bar */}
      <View style={styles.modalInput}>
        <Feather name="search" size={14} color={colors.textDim} />
        <TextInput
          testID="teacher-students-link-search-input"
          style={styles.modalTextInput}
          value={linkSearch} onChangeText={setLinkSearch}
          placeholder="Search by name or email…" placeholderTextColor={colors.textDim}
          autoCapitalize="none"
        />
        {linkSearch ? (
          <TouchableOpacity onPress={() => setLinkSearch('')}>
            <Feather name="x" size={14} color={colors.textDim} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Grade filter pills — show EVERY grade the teacher teaches (so a
          Grade 3 + Grade 5 teacher gets both chips), unioned with any grades
          actually present in the returned students. */}
      {!linkableLoading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {['All', ...Array.from(new Set([...allowedGrades, ...linkableStudents.map(s => s.grade)].filter(Boolean))).sort()].map(g => (
            <TouchableOpacity
              key={g}
              onPress={() => setLinkGradeFilter(g)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12, paddingVertical: 5,
                borderRadius: 999, borderWidth: 1,
                borderColor: linkGradeFilter === g ? gold : colors.borderColor,
                backgroundColor: linkGradeFilter === g ? gold + '18' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: linkGradeFilter === g ? gold : colors.textMuted }}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Student list */}
      {linkableLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator size="small" color={colors.accentYellow} />
          <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 6 }}>Loading students…</Text>
        </View>
      ) : linkableStudents.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Feather name="users" size={24} color={colors.textDim} />
          <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            No unlinked students found for your grade &amp; curriculum.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {linkableStudents
            .filter(s => {
              const q = linkSearch.toLowerCase();
              const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
              const matchGrade = linkGradeFilter === 'All' || normalizeGrade(s.grade) === normalizeGrade(linkGradeFilter);
              return matchSearch && matchGrade;
            })
            .map(s => {
              const isSelected = selectedStudents.some(x => x.id === s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  testID={`teacher-students-linkable-${s.id}`}
                  onPress={() => toggleSelectedStudent(s)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingVertical: 9, paddingHorizontal: 10,
                    borderRadius: 8, marginBottom: 4,
                    backgroundColor: isSelected ? gold + '18' : (isDark ? colors.cardDark : '#F5F5F5'),
                    borderWidth: 1,
                    borderColor: isSelected ? gold : 'transparent',
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: gold + '18',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: gold }}>
                      {(s.name || '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMain }}>{s.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textDim }}>{s.email}</Text>
                  </View>
                  {isSelected && <Feather name="check-circle" size={16} color={gold} />}
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      )}

      {selectedStudents.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: gold + '18', flexWrap: 'wrap' }}>
          <Feather name="user-check" size={13} color={gold} />
          <Text style={{ fontSize: 12, color: gold, fontWeight: '600' }}>
            {selectedStudents.length === 1
              ? `Selected: ${selectedStudents[0].name}`
              : `${selectedStudents.length} students selected: ${selectedStudents.map(s => s.name).join(', ')}`}
          </Text>
        </View>
      )}

      {linkError ? <Text testID="teacher-students-link-error" style={{ color: colors.accentRed, fontSize: 13 }}>{linkError}</Text> : null}

      <View style={styles.modalBtns}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="teacher-students-link-submit-button"
          style={[styles.modalSaveBtn, selectedStudents.length === 0 && !linkEmail.trim() && { opacity: 0.5 }]}
          onPress={onSubmit}
          disabled={linking || (selectedStudents.length === 0 && !linkEmail.trim())}
        >
          {linking
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={styles.modalSaveText}>{selectedStudents.length > 1 ? `Link ${selectedStudents.length} Students` : 'Link Student'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
