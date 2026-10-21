import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import TransliterationInput, { langNameToCode } from '../../../../components/common/TransliterationInput';
import DatePicker from '../../../../components/common/DatePicker';
import { languagesForCurriculum, subjectsFor, subjectLabel } from '../constants';

// The shared Title/Subject/Language/Grade/Curriculum/Chapter/Due-Date fields
// used by BOTH the AI Assignment flow (always shown) and the Worksheet
// Upload flow (shown per-step, via showTitleDate/showDetails) — extracted
// verbatim (no behavior change) from TeacherAssignmentsScreen.tsx, as part
// of splitting the Create Assignment Modal wizard into per-flow components
// (2026-08-25).
export function AssignmentCommonFields({
  showTitleDate, showDetails,
  createMode, docFilesLength,
  title, setTitle, subject, setSubject, selectedLanguage, setSelectedLanguage,
  grade, setGrade, effectiveGrade, gradeOptions, isIBPYP,
  curriculum, setCurriculum, effectiveCurriculum, curriculumOptions, teacherCurriculum,
  chapter, setChapter, topicsLoading, availableTopics,
  dueDate, setDueDate,
  colors, gold, styles,
}: {
  showTitleDate: boolean;
  showDetails: boolean;
  createMode: 'choose' | 'ai' | 'upload' | 'bulk';
  docFilesLength: number;
  title: string;
  setTitle: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  effectiveGrade: string;
  gradeOptions: string[];
  isIBPYP: boolean;
  curriculum: string;
  setCurriculum: (v: string) => void;
  effectiveCurriculum: string;
  curriculumOptions: string[];
  teacherCurriculum: string;
  chapter: string;
  setChapter: (v: string) => void;
  topicsLoading: boolean;
  availableTopics: string[];
  dueDate: string;
  setDueDate: (v: string) => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  const boardCurriculum = effectiveCurriculum || teacherCurriculum || curriculum;
  const offeredSubjects = subjectsFor(boardCurriculum, effectiveGrade);
  // Uploads keep the subject read from the sheet even if the board list lacks it
  const subjectOptions = createMode === 'upload' && subject && !offeredSubjects.includes(subject)
    ? [...offeredSubjects, subject] : offeredSubjects;
  React.useEffect(() => {
    if (createMode !== 'upload' && subject && !offeredSubjects.includes(subject)) setSubject(offeredSubjects[0]);
  }, [createMode, offeredSubjects, subject, setSubject]);
  const offered = languagesForCurriculum(effectiveCurriculum || teacherCurriculum || curriculum);
  // Uploads keep the language detected from the sheet even if the board doesn't offer it
  const curriculumLanguages = createMode === 'upload' && selectedLanguage && !offered.includes(selectedLanguage)
    ? [...offered, selectedLanguage] : offered;
  React.useEffect(() => {
    if (createMode !== 'upload' && selectedLanguage && !offered.includes(selectedLanguage)) setSelectedLanguage('');
  }, [createMode, offered, selectedLanguage, setSelectedLanguage]);
  return (
    <>
      {showTitleDate && (<>
      <Text style={styles.fieldLabel}>Title *{createMode === 'upload' && docFilesLength > 0 && title.trim() ? <Text style={{ fontSize: 10, color: colors.accentGreen, fontWeight: '600' }}> · auto-filled</Text> : null}</Text>
      <TransliterationInput
        style={styles.input}
        placeholder="e.g. Chapter 5 Worksheet"
        placeholderTextColor={colors.textDim}
        colors={colors}
        value={title}
        onChangeText={setTitle}
        langCode={subject === 'Language Acquisition' ? langNameToCode(selectedLanguage) : null}
      />
      </>)}

      {showDetails && (<>
      <Text style={styles.fieldLabel}>Subject{createMode === 'upload' && docFilesLength > 0 ? <Text style={{ fontSize: 10, color: colors.accentGreen, fontWeight: '600' }}> · auto-filled</Text> : null}</Text>
      <View style={styles.chipRow}>
        {subjectOptions.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, subject === s && { backgroundColor: gold + '18', borderColor: gold }]}
            onPress={() => setSubject(s)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, subject === s && { color: gold }]}>{subjectLabel(s, boardCurriculum, effectiveGrade)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Language picker — Language Acquisition, and every uploaded worksheet
          (students type answers in this language; '' = auto-detect from the sheet) */}
      {(subject === 'Language Acquisition' || createMode === 'upload') && (
        <>
          <Text style={styles.fieldLabel}>{createMode === 'upload' ? 'Worksheet language' : 'Language'}</Text>
          <View style={styles.chipRow}>
            {(createMode === 'upload' ? ['', ...curriculumLanguages] : curriculumLanguages).map((lang) => (
              <TouchableOpacity
                key={lang || 'auto'}
                testID={`assignment-language-${lang || 'auto'}`}
                style={[styles.chip, selectedLanguage === lang && { backgroundColor: gold + '20', borderColor: gold }]}
                onPress={() => setSelectedLanguage(lang)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selectedLanguage === lang && { color: gold }]}>{lang || 'Auto-detect'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.fieldLabel}>Grade {isIBPYP && <Text style={{ color: '#BAA467', fontSize: 10, fontWeight: '600' }}> · IB PYP (3–5)</Text>}</Text>
      <View style={styles.chipRow}>
        {gradeOptions.map((g: string) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, effectiveGrade === g && { backgroundColor: gold + '18', borderColor: gold }]}
            onPress={() => setGrade(g)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, effectiveGrade === g && { color: gold }]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Curriculum</Text>
      <View style={styles.chipRow}>
        {(curriculumOptions.length > 0 ? curriculumOptions : [teacherCurriculum || curriculum]).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, effectiveCurriculum === c && { backgroundColor: gold + '18', borderColor: gold }]}
            onPress={() => setCurriculum(c)}
            activeOpacity={0.75}
            disabled={curriculumOptions.length <= 1}
          >
            <Text style={[styles.chipText, effectiveCurriculum === c && { color: gold }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Chapter / Topic{createMode === 'upload' && docFilesLength > 0 && chapter.trim() ? <Text style={{ fontSize: 10, color: colors.accentGreen, fontWeight: '600' }}> · auto-filled</Text> : null}</Text>
      <TransliterationInput
        style={styles.input}
        placeholder="e.g. Fractions and Decimals"
        placeholderTextColor={colors.textDim}
        colors={colors}
        value={chapter}
        onChangeText={setChapter}
        langCode={subject === 'Language Acquisition' ? langNameToCode(selectedLanguage) : null}
      />

      {/* Available syllabus topics for this grade + subject — tap to
          fill, or type your own above. Pulled from ingested content. */}
      {topicsLoading ? (
        <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 6 }}>Loading topics for {subject}…</Text>
      ) : availableTopics.length > 0 ? (
        <View style={{ marginTop: 6, gap: 6 }}>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            Topics in {effectiveGrade} · {subject} — tap to use, or type your own above
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {availableTopics.map(t => {
              const active = chapter.trim().toLowerCase() === t.toLowerCase();
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setChapter(t)}
                  activeOpacity={0.75}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: active ? gold : colors.borderColor, backgroundColor: active ? gold + '18' : 'transparent' }}
                >
                  <Text style={{ fontSize: 12, color: active ? gold : colors.textMuted, fontWeight: active ? '700' : '500' }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
      </>)}

      {showTitleDate && (<>
      <Text style={styles.fieldLabel}>Due Date *</Text>
      <DatePicker
        value={dueDate}
        onChange={setDueDate}
        placeholder="Select a due date"
        minDate={new Date().toISOString().slice(0, 10)}
      />
      </>)}
    </>
  );
}
