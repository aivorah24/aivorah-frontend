import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { ChildEntry, curriculaForBase, getGradesForCurriculum } from '../utils/childEntry';

interface UnresolvedChild { index: number; reason: string }

function FormDropdown({ value, placeholder, options, onChange, colors, open, onToggle }: {
  value: string; placeholder: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; colors: AppColors; open: boolean; onToggle: () => void;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const current = options.find((o) => o.value === value)?.label || placeholder;
  return (
    <View style={{ position: 'relative' }}>
      <Pressable style={styles.formInput} onPress={onToggle} accessibilityRole="button">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.ddTriggerText, !value && { color: colors.textDim }]} numberOfLines={1}>{current}</Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textDim} />
        </View>
      </Pressable>
      {open && (
        <>
          <Pressable style={Platform.select({ web: styles.ddBackdropWeb, default: styles.ddBackdropNative }) as any} onPress={onToggle} />
          <View style={styles.ddMenu}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  style={({ hovered }: any) => [styles.ddItem, Platform.OS === 'web' && hovered && styles.ddItemHovered, o.value === value && styles.ddItemActive]}
                  onPress={() => { onChange(o.value); onToggle(); }}
                >
                  <Text style={[styles.ddItemText, o.value === value && styles.ddItemTextActive]}>{o.label}</Text>
                  {o.value === value && <Feather name="check" size={13} color={colors.accentYellow} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

interface Props {
  childEntries: ChildEntry[];
  onUpdate: (key: string, patch: Partial<ChildEntry>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  unresolved: UnresolvedChild[];
  sectionsByGrade: Record<string, string[]>;
  allSections: string[];
  schoolCurriculumBase: string | null;
  colors: AppColors;
  openDropdown: string | null;
  setOpenDropdown: (v: string | null) => void;
}

export default function ChildLinkEditor({
  childEntries, onUpdate, onAdd, onRemove, unresolved,
  sectionsByGrade, allSections, schoolCurriculumBase, colors, openDropdown, setOpenDropdown,
}: Props) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const curriculumOptions = useMemo(() => curriculaForBase(schoolCurriculumBase).map((c) => ({ value: c, label: c })), [schoolCurriculumBase]);

  function gradeOptionsFor(curriculum: string) {
    return (curriculum ? getGradesForCurriculum(curriculum) : getGradesForCurriculum('')).map((g) => ({ value: g, label: g }));
  }
  function sectionOptionsFor(grade: string) {
    const forGrade = grade && sectionsByGrade[grade] ? sectionsByGrade[grade] : [];
    const list = forGrade.length > 0 ? forGrade : allSections;
    return list.map((s) => ({ value: s, label: s }));
  }

  return (
    <View>
      {childEntries.map((c, idx) => {
        const rowIssue = unresolved.find((u) => u.index === idx);
        const curriculumOpen = openDropdown === `${c.key}:curriculum`;
        const gradeOpen = openDropdown === `${c.key}:grade`;
        const sectionOpen = openDropdown === `${c.key}:section`;
        const rowZIndex = curriculumOpen ? 32 : gradeOpen ? 31 : sectionOpen ? 30 : 1;
        return (
          <View key={c.key} style={[styles.childCard, { zIndex: rowZIndex }]}>
            <View style={styles.childCardHeader}>
              <Text style={styles.childCardTitle}>Child {idx + 1}</Text>
              {childEntries.length > 1 && (
                <TouchableOpacity onPress={() => onRemove(c.key)} accessibilityRole="button" accessibilityLabel="Remove this child">
                  <Feather name="x" size={16} color={colors.textDim} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.formLabel}>Admission No</Text>
            <TextInput
              value={c.admissionNumber} onChangeText={(v) => onUpdate(c.key, { admissionNumber: v })}
              style={styles.textInput} placeholder="e.g. TSRA-1005" placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
            />
            <Text style={styles.formLabelOr}>— or —</Text>
            <Text style={styles.formLabel}>Student name</Text>
            <TextInput value={c.name} onChangeText={(v) => onUpdate(c.key, { name: v })} style={styles.textInput} placeholder="e.g. Vihaan Kapoor" placeholderTextColor={colors.textDim} />

            {/* Lift the row whose menu is open — Grade sits in this row, and its
                menu overlaps the Section row below, which otherwise catches taps. */}
            <View testID={`child-${idx}-row-grade`} style={[styles.formRow, (curriculumOpen || gradeOpen) && { zIndex: 23 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Curriculum</Text>
                <FormDropdown
                  value={c.curriculum}
                  placeholder="Select curriculum"
                  options={curriculumOptions}
                  onChange={(v) => onUpdate(c.key, { curriculum: v, grade: '', section: '' })}
                  colors={colors}
                  open={curriculumOpen}
                  onToggle={() => setOpenDropdown(openDropdown === `${c.key}:curriculum` ? null : `${c.key}:curriculum`)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Grade</Text>
                <FormDropdown
                  value={c.grade}
                  placeholder={c.curriculum ? 'Select grade' : 'Select a curriculum first'}
                  options={gradeOptionsFor(c.curriculum)}
                  onChange={(v) => onUpdate(c.key, { grade: v, section: '' })}
                  colors={colors}
                  open={gradeOpen}
                  onToggle={() => { if (c.curriculum) setOpenDropdown(openDropdown === `${c.key}:grade` ? null : `${c.key}:grade`); }}
                />
              </View>
            </View>
            <View testID={`child-${idx}-row-section`} style={[styles.formRow, sectionOpen && { zIndex: 22 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Section</Text>
                <FormDropdown
                  value={c.section}
                  placeholder="Select section"
                  options={sectionOptionsFor(c.grade)}
                  onChange={(v) => onUpdate(c.key, { section: v })}
                  colors={colors}
                  open={sectionOpen}
                  onToggle={() => setOpenDropdown(openDropdown === `${c.key}:section` ? null : `${c.key}:section`)}
                />
              </View>
              <View style={{ flex: 1 }} />
            </View>
            {!!rowIssue && <Text style={styles.rowError}>{rowIssue.reason}</Text>}
          </View>
        );
      })}
      <TouchableOpacity style={styles.addChildBtn} onPress={onAdd} accessibilityRole="button">
        <Feather name="plus" size={13} color={colors.accentYellow} />
        <Text style={styles.addChildBtnText}>Add another child</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    formRow: { flexDirection: 'row', gap: 14 },
    formLabel: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 10 },
    formLabelOr: { fontFamily: fonts.serif, fontSize: 10.5, color: colors.textDim, textAlign: 'center', marginTop: 10, marginBottom: 2 },
    textInput: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgDark },
    childCard: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, padding: spacing.md, marginTop: 10 },
    childCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    childCardTitle: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
    addChildBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
    addChildBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
    rowError: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.accentRed, marginTop: 8 },
    formInput: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, height: 40, backgroundColor: colors.bgDark, justifyContent: 'center' },
    ddTriggerText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textHeading, flexShrink: 1 },
    ddBackdropWeb: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 29 },
    ddBackdropNative: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 29 },
    ddMenu: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 4, zIndex: 31, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8, maxHeight: 240, overflow: 'hidden' },
    ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9 },
    ddItemHovered: { backgroundColor: colors.cardHover },
    ddItemActive: { backgroundColor: `${colors.accentYellow}14` },
    ddItemText: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted },
    ddItemTextActive: { color: colors.textHeading, fontWeight: '700' },
  });
}
