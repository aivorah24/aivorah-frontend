import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { CurriculumStatus, CurriculumProgress, UploadPhase } from '../types';

export const CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];

// Each curriculum only spans a specific grade range — mirrors the reference
// TeacherSyllabusImportScreen.tsx mapping.
export const GRADES_BY_CURRICULUM: Record<string, string[]> = {
  'IB PYP':    ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'],
  'IB MYP':    ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'IB DP':     ['Grade 11', 'Grade 12'],
  CBSE:        ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
  ICSE:        ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  Cambridge:   ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
};

export const ACADEMIC_YEARS = ['2024-25', '2025-26', '2026-27', '2027-28'];

// Local fallback subject list — deliberately NOT imported from
// @legacy/school-admin/TeachingEntriesEditor (School Admin is off-limits for
// this feature). Same subject set across curricula/grades; good enough for
// a pre-upload label since the real subject actually taught still comes
// from the document's own content during extraction.
const DEFAULT_SUBJECTS = ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science'];
export function getSubjectsForEntry(_curriculum: string, _grade: string): string[] {
  return DEFAULT_SUBJECTS;
}

export const ANALYSIS_STEPS = ['File uploaded', 'Extracting content', 'Analysing curriculum', 'Generating learning path', 'Saving results'];

const STAGE_STEP: Record<string, number> = { queued: 2, extracting: 1, analysing: 2, generating: 3, saving: 4, done: 5 };
const STATUS_STEP: Record<string, number> = { uploaded: 1, processing: 1, processed: 2, generating: 3, generated: 5 };

// Real backend stage (or status when there is no progress row) -> active step; 5 = all done.
function stepIndex(phase: UploadPhase, status: CurriculumStatus | null, progress: CurriculumProgress | null): number {
  if (phase === 'uploading') return 0;
  if (progress && STAGE_STEP[progress.stage] !== undefined) return STAGE_STEP[progress.stage];
  return status ? (STATUS_STEP[status] ?? -1) : -1;
}

interface DetectedStructure {
  unitCount: number;
  topicCount: number;
}

interface Props {
  curriculum: string; setCurriculum: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
  subject: string; setSubject: (v: string) => void;
  academicYear: string; setAcademicYear: (v: string) => void;
  fileName: string | null;
  status: CurriculumStatus | null;
  statusError: string | null;
  phase?: UploadPhase;
  progress?: CurriculumProgress | null;
  connectionIssue?: boolean;
  onRetry?: () => void;
  busy: boolean;
  onPickFile: () => void;
  detected: DetectedStructure | null;
  // Present once the learning path is ready: opens it on the Learning Paths screen to review, edit and publish.
  onOpenReview?: () => void;
}

export default function PreUploadConfigPanel({
  curriculum, setCurriculum, grade, setGrade, subject, setSubject, academicYear, setAcademicYear,
  fileName, status, statusError, phase = 'idle', progress = null, connectionIssue = false, onRetry, busy, onPickFile, detected,
  onOpenReview,
}: Props) {
  const { colors } = useTheme();
  const s = React.useMemo(() => makeStyles(colors), [colors]);

  const grades = GRADES_BY_CURRICULUM[curriculum] || GRADES_BY_CURRICULUM.CBSE;
  const subjects = getSubjectsForEntry(curriculum, grade);

  function changeCurriculum(next: string) {
    setCurriculum(next);
    const validGrades = GRADES_BY_CURRICULUM[next] || [];
    if (!validGrades.includes(grade)) setGrade(validGrades[0]);
  }

  const failed = status === 'failed' || phase === 'upload_failed';
  const stepIdx = failed ? -1 : stepIndex(phase, status, progress);
  const uploading = phase === 'uploading';

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Filter bar */}
      <View style={[s.filterCard, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
        <View style={s.filterRow}>
          {[
            { label: 'Curriculum', value: curriculum, opts: CURRICULA, set: changeCurriculum },
            { label: 'Grade', value: grade, opts: grades, set: setGrade },
            { label: 'Subject', value: subject, opts: subjects, set: setSubject },
            { label: 'Academic Year', value: academicYear, opts: ACADEMIC_YEARS, set: setAcademicYear },
          ].map((f) => (
            <View key={f.label} style={{ flex: 1, minWidth: 150 }}>
              <Text style={[s.filterLabel, { color: colors.textMuted }]}>{f.label}</Text>
              <View style={s.pillRow}>
                {f.opts.map((o) => (
                  <TouchableOpacity
                    key={o}
                    testID={`filter-${f.label.toLowerCase()}-${o}`}
                    onPress={() => f.set(o)}
                    style={[s.pill, {
                      borderColor: f.value === o ? colors.accentYellow : colors.borderColor,
                      backgroundColor: f.value === o ? colors.accentYellow : 'transparent',
                    }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: f.value === o ? '#fff' : colors.textMuted }}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 4-panel grid */}
      <View style={s.grid}>
        {/* Panel 1: Upload */}
        <View style={[s.panel, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
          <PanelHeader n={1} title="Upload Curriculum" colors={colors} />
          <Text style={{ color: colors.textMuted, fontSize: 11.5, marginBottom: 12 }}>Supported formats: PDF or DOCX  ·  Max file size: 20 MB</Text>
          <TouchableOpacity
            testID="pre-upload-dropzone"
            style={[s.dropZone, { borderColor: colors.primary }]}
            onPress={onPickFile}
            disabled={busy}
          >
            <Feather name="upload-cloud" size={26} color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 8 }}>
              {Platform.OS === 'web' ? 'Drag & drop your file here' : 'Tap to choose a file'}
            </Text>
            {Platform.OS === 'web' && <Text style={{ color: colors.textMuted, fontSize: 11, marginVertical: 4 }}>or</Text>}
            <View style={[s.chooseBtn, { backgroundColor: colors.accentYellow }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>Choose File</Text>
            </View>
          </TouchableOpacity>
          {!!fileName && (
            <View testID="pre-upload-file-chip" style={[s.fileChip, { borderColor: colors.borderColor }]}>
              <Feather name="file-text" size={16} color={colors.accentOrange} />
              <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>{fileName}</Text>
              {uploading && <Text testID="upload-state" style={{ color: colors.textMuted, fontSize: 11 }}>Uploading…</Text>}
              {status === 'generated' && <Feather name="check-circle" size={16} color={colors.primary} />}
            </View>
          )}
          {!!statusError && <Text style={{ color: colors.accentRed, fontSize: 12, marginTop: 8 }}>{statusError}</Text>}
        </View>

        {/* Panel 2: Analysis progress — driven by real status transitions */}
        <View style={[s.panel, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
          <PanelHeader n={2} title={stepIdx < 0 && !failed ? 'Aivorah will analyse your curriculum' : 'Processing your curriculum'} colors={colors} />
          {stepIdx < 0 && !failed ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
              <Feather name="cpu" size={22} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>Upload a file to begin</Text>
            </View>
          ) : failed ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
              <Feather name="alert-triangle" size={22} color={colors.accentRed} />
              <Text style={{ color: colors.accentRed, fontSize: 12, marginTop: 8, textAlign: 'center' }}>{phase === 'upload_failed' ? 'Upload failed' : 'Processing failed'}</Text>
              {!!statusError && <Text testID="panel-error" style={{ color: colors.accentRed, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{statusError}</Text>}
              {!!onRetry && (
                <TouchableOpacity testID="retry-button" onPress={onRetry} style={[s.chooseBtn, { backgroundColor: colors.accentYellow, marginTop: 10 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            ANALYSIS_STEPS.map((baseStep, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              const step = i === 0 && uploading ? 'Uploading file…'
                : i === 3 && active && progress?.topicsDone != null && progress?.topicsTotal != null
                  ? `${baseStep} — topic ${progress.topicsDone} of ${progress.topicsTotal}` : baseStep;
              return (
                <View key={step} testID={`analysis-step-${i}`} style={s.stepRow}>
                  {done ? <Feather name="check-circle" size={14} color={colors.primary} />
                    : active ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Feather name="circle" size={14} color={colors.borderColor} />}
                  <Text style={{ flex: 1, fontSize: 12.5, color: done ? colors.textMain : colors.textMuted }}>{step}</Text>
                </View>
              );
            })
          )}
          {connectionIssue && !failed && (
            <Text testID="connection-issue" style={{ color: colors.accentOrange, fontSize: 11.5, marginTop: 6 }}>Connection issue, retrying…</Text>
          )}
        </View>

        {/* Panel 3: Detected Structure Summary — real counts from the draft, never a fabricated diff */}
        <View style={[s.panel, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
          <PanelHeader n={3} title="Detected Structure" colors={colors} />
          {!detected ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20 }}>Nothing detected yet.</Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatChip label="Units" value={String(detected.unitCount)} colors={colors} />
              <StatChip label="Topics" value={String(detected.topicCount)} colors={colors} />
            </View>
          )}
        </View>

        {/* Panel 4: Review & Publish actions */}
        <View style={[s.panel, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
          <PanelHeader n={4} title="Review & Publish" colors={colors} />
          <Text style={{ color: colors.textMuted, fontSize: 11.5, marginBottom: 12 }}>When processing finishes, review, edit and publish the learning path in Learning Paths.</Text>
          <View style={[s.safeBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 11.5, flex: 1 }}>Nothing is published until you review and approve.</Text>
          </View>
          <ActionRow testID="pre-upload-open-review" icon="map" label="Review & publish in Learning Paths" sub={onOpenReview ? 'Your learning path is ready' : 'Available when processing finishes'} colors={colors} primary disabled={!onOpenReview} onPress={() => onOpenReview?.()} />
        </View>
      </View>
    </View>
  );
}

function PanelHeader({ n, title, colors }: { n: number; title: string; colors: AppColors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={[{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: colors.primary + '18' }]}>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>{n}</Text>
      </View>
      <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 14, flex: 1 }}>{title}</Text>
    </View>
  );
}

function StatChip({ label, value, colors }: { label: string; value: string; colors: AppColors }) {
  return (
    <View style={{ flex: 1, borderRadius: radius.md, padding: 10, backgroundColor: colors.borderColor + '30', alignItems: 'flex-start' }}>
      <Text style={{ color: colors.textMain, fontWeight: '800', fontSize: 16 }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ testID, icon, label, sub, colors, primary, disabled, onPress }: {
  testID: string; icon: keyof typeof Feather.glyphMap; label: string; sub: string; colors: AppColors; primary?: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6 },
        { borderColor: colors.borderColor, backgroundColor: primary ? colors.accentYellow : 'transparent', opacity: disabled ? 0.5 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Feather name={icon} size={13} color={primary ? '#fff' : colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: primary ? '#fff' : colors.textMain, fontWeight: '700', fontSize: 11.5 }}>{label}</Text>
        <Text style={{ color: primary ? '#ffffffcc' : colors.textMuted, fontSize: 9.5 }}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  filterCard: { borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  filterRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  filterLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: { borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  grid: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  panel: { flex: 1, minWidth: 260, borderWidth: 1, borderRadius: radius.lg, padding: 18 },
  dropZone: { borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  chooseBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.md },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, padding: 10, marginTop: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  safeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: radius.md, padding: 10, marginBottom: 12 },
});
