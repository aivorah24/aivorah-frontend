import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface DropdownProps {
  colors: AppColors;
  gold: string;
  testKey: string;
  label: string;
  allLabel: string;
  options: string[];
  selected: string | undefined;
  onSelect: (v: string | undefined) => void;
  /** Renders a raw stored value (e.g. "3", "A") as a teacher-readable label
   *  (e.g. "Grade 3", "Section A"). The stored value is what filtering uses. */
  format?: (v: string) => string;
}

// One labelled pill dropdown. Opens an inline menu anchored directly below
// and left-aligned to its own button — no centred Modal, no page overlay.
function FilterDropdown({ colors, gold, testKey, label, allLabel, options, selected, onSelect, format }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const display = selected ? (format ? format(selected) : selected) : allLabel;

  return (
    // zIndex must live on this wrapper (not just the menu) so the open menu
    // paints above the sibling cards further down the page — without it the
    // Subject Progress card below rendered on top of the open dropdown.
    <View style={{ zIndex: open ? 1000 : 1, minWidth: 128 }}>
      <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 5, marginLeft: 2 }}>
        {label}
      </Text>

      <TouchableOpacity
        testID={`filter-dropdown-${testKey}`}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10,
          borderWidth: 1, borderColor: open ? gold : colors.borderColor,
          backgroundColor: colors.cardDark,
        }}
      >
        <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: colors.textMain, flexShrink: 1 }}>{display}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={open ? gold : colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <>
          {/* Transparent outside-tap catcher — closes the menu, no dark overlay. */}
          <Pressable
            testID={`filter-dropdown-${testKey}-backdrop`}
            onPress={() => setOpen(false)}
            style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
          />
          <View
            style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 5, zIndex: 999, elevation: 24,
              minWidth: 200, maxHeight: 280,
              backgroundColor: colors.cardDark, borderRadius: 10,
              borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16,
            }}
          >
            <ScrollView style={{ maxHeight: 280 }}>
              <TouchableOpacity
                testID={`filter-dropdown-${testKey}-option-all`}
                onPress={() => { onSelect(undefined); setOpen(false); }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: !selected ? gold + '1A' : 'transparent' }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: !selected ? '700' : '500', color: !selected ? gold : colors.textMuted }}>{allLabel}</Text>
              </TouchableOpacity>
              {options.map((opt) => {
                const active = selected === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    testID={`filter-dropdown-${testKey}-option-${opt}`}
                    onPress={() => { onSelect(opt); setOpen(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: active ? gold + '1A' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: active ? '700' : '500', color: active ? gold : colors.textMain }}>
                      {format ? format(opt) : opt}
                    </Text>
                    {active && <Feather name="check" size={13} color={gold} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

interface Props {
  colors: AppColors;
  gold: string;
  curriculumOptions: string[];
  selectedCurriculum: string | undefined;
  onSelectCurriculum: (v: string | undefined) => void;
  gradeOptions: string[];
  selectedGrade: string | undefined;
  onSelectGrade: (v: string | undefined) => void;
  sectionOptions: string[];
  selectedSection: string | undefined;
  onSelectSection: (v: string | undefined) => void;
  subjectOptions: string[];
  selectedSubject: string | undefined;
  onSelectSubject: (v: string | undefined) => void;
  onExportPdf: () => void;
}

// Raw DB values are bare ("3", "A") — never show those to a teacher.
const gradeLabel = (g: string) => (/^\d+$/.test(g.trim()) ? `Grade ${g.trim()}` : g);
const sectionLabel = (s: string) => (s.trim().length <= 2 ? `Section ${s.trim()}` : s);

// Teacher-facing filter flow: Curriculum -> Grade -> Section -> Subject.
// Each dropdown offers only values that really exist within the ones
// selected before it (cascading), so a teacher can never land on a
// combination with no students behind it.
export default function TopFilters({
  colors, gold,
  curriculumOptions, selectedCurriculum, onSelectCurriculum,
  gradeOptions, selectedGrade, onSelectGrade,
  sectionOptions, selectedSection, onSelectSection,
  subjectOptions, selectedSubject, onSelectSubject,
  onExportPdf,
}: Props) {
  return (
    <View
      style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10,
        backgroundColor: colors.cardDark, borderRadius: 12,
        borderWidth: 1, borderColor: colors.borderColor, padding: 14,
        // Establishes a stacking context above every card further down the
        // page, so an open dropdown is never painted over by them.
        zIndex: 100,
      }}
    >
      <FilterDropdown
        colors={colors} gold={gold} testKey="curriculum"
        label="Curriculum" allLabel="All curricula"
        options={curriculumOptions} selected={selectedCurriculum} onSelect={onSelectCurriculum}
      />
      <FilterDropdown
        colors={colors} gold={gold} testKey="grade"
        label="Grade" allLabel="All grades" format={gradeLabel}
        options={gradeOptions} selected={selectedGrade} onSelect={onSelectGrade}
      />
      <FilterDropdown
        colors={colors} gold={gold} testKey="section"
        label="Section" allLabel="All sections" format={sectionLabel}
        options={sectionOptions} selected={selectedSection} onSelect={onSelectSection}
      />
      <FilterDropdown
        colors={colors} gold={gold} testKey="subject"
        label="Subject" allLabel="All subjects"
        options={subjectOptions} selected={selectedSubject} onSelect={onSelectSubject}
      />

      <TouchableOpacity
        testID="student-progress-export-pdf"
        onPress={onExportPdf}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 7,
          paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
          backgroundColor: gold, marginLeft: 'auto' as any,
        }}
      >
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0B0B0B' }}>Export report</Text>
        <Feather name="download" size={13} color="#0B0B0B" />
      </TouchableOpacity>
    </View>
  );
}
