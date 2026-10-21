import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { BulkItem, StudentItem } from '../types';
import { languagesForCurriculum, subjectsFor, subjectLabel } from '../constants';
import DatePicker from '../../../../components/common/DatePicker';

// The Bulk Upload 3-phase flow (BulkUploadStep -> ClassificationStep ->
// ReviewStep, i.e. pick -> classify -> generate -> assign & publish) —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// as part of splitting the Create Assignment Modal wizard into per-flow
// components (2026-08-25), following the design the user specified. Already
// fully self-contained before this split (see useBulkUpload).
export function BulkUploadFlow({
  bulkPhase, setBulkPhase, bulkItems, updateBulkItem, pickBulkDocs,
  generateAllBulkQuizzes, generateOneBulkQuiz, publishAllBulkItems,
  gradeOptions, curriculum, setFullscreenImage, setEditingBulkItemId, setInteractiveQuiz, setShowInteractivePreview,
  bulkDueDate, setBulkDueDate, students, studentsLoaded,
  setShowModal, resetForm, colors, gold, styles,
  pendingImages, imageSelection, imageGroups,
  toggleImageSelection, confirmImageGroup, dissolveImageGroup, groupedImageIds, finishImageGrouping,
}: {
  bulkPhase: 'pick' | 'group' | 'classify' | 'generate' | 'assign';
  setBulkPhase: (p: 'pick' | 'group' | 'classify' | 'generate' | 'assign') => void;
  bulkItems: BulkItem[];
  updateBulkItem: (id: string, patch: Partial<BulkItem>) => void;
  pickBulkDocs: () => void;
  generateAllBulkQuizzes: () => void;
  generateOneBulkQuiz: (item: BulkItem) => void;
  publishAllBulkItems: () => void;
  gradeOptions: string[];
  curriculum?: string;
  setFullscreenImage: (uri: string) => void;
  setEditingBulkItemId: (id: string | null) => void;
  setInteractiveQuiz: (v: any) => void;
  setShowInteractivePreview: (v: boolean) => void;
  bulkDueDate: string;
  setBulkDueDate: (v: string) => void;
  students: StudentItem[];
  studentsLoaded: boolean;
  setShowModal: (v: boolean) => void;
  resetForm: () => void;
  colors: AppColors;
  gold: string;
  styles: any;
  pendingImages: Array<{ id: string; name: string; base64: string; mime: string }>;
  imageSelection: string[];
  imageGroups: Array<{ id: string; imageIds: string[] }>;
  toggleImageSelection: (id: string) => void;
  confirmImageGroup: () => void;
  dissolveImageGroup: (groupId: string) => void;
  groupedImageIds: () => Set<string>;
  finishImageGrouping: () => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      {/* Phase progress pips */}
      {bulkPhase !== 'pick' && bulkPhase !== 'group' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {(['classify', 'generate', 'assign'] as const).map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <View style={{ flex: 1, height: 2, backgroundColor: colors.borderColor, borderRadius: 1 }} />}
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: bulkPhase === p ? gold : 'transparent', borderWidth: bulkPhase === p ? 0 : 1, borderColor: colors.borderColor }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: bulkPhase === p ? '#fff' : colors.textDim }}>
                  {p === 'classify' ? '1. Classify' : p === 'generate' ? '2. Generate' : '3. Assign & Publish'}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {bulkPhase === 'pick' && (
        <>
          <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 18 }}>
            Select several worksheet files (PDF, image, or DOCX). You&apos;ll see and edit ALL of them together at each step — classify, then generate quizzes, then assign & publish.
          </Text>
          <TouchableOpacity
            style={{ padding: 20, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: gold + '60', alignItems: 'center', gap: 8 }}
            onPress={pickBulkDocs}
            activeOpacity={0.8}
          >
            <Feather name="upload-cloud" size={26} color={gold} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: gold }}>Select Worksheets</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── GROUP: combine images that belong to the same worksheet ──
          Only reached when 2+ raw images were picked together. Select 2+
          thumbnails, tap "Group Selected" to combine them into one
          multi-page worksheet (like a scanner app); anything left ungrouped
          becomes its own single-page worksheet. */}
      {bulkPhase === 'group' && (() => {
        const grouped = groupedImageIds();
        const ungroupedImages = pendingImages.filter(img => !grouped.has(img.id));
        return (
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 18 }}>
              {pendingImages.length} images selected. If several photos are pages of the SAME worksheet, tap to select them, then group. Anything left ungrouped becomes its own worksheet.
            </Text>

            {imageGroups.length > 0 && (
              <View style={{ gap: 8 }}>
                {imageGroups.map((g, gi) => (
                  <View key={g.id} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: gold + '50', backgroundColor: colors.cardDark, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: gold }}>Worksheet {gi + 1} — {g.imageIds.length} pages</Text>
                      <TouchableOpacity onPress={() => dissolveImageGroup(g.id)} activeOpacity={0.75}>
                        <Feather name="x-circle" size={16} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {g.imageIds.map((id, pi) => {
                          const img = pendingImages.find(p => p.id === id);
                          if (!img) return null;
                          return (
                            <View key={id} style={{ width: 60, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: gold + '40' }}>
                              <Image source={{ uri: `data:${img.mime};base64,${img.base64}` }} style={{ width: 60, height: 80 }} resizeMode="cover" />
                              <View style={{ paddingVertical: 1, backgroundColor: gold + '20', alignItems: 'center' }}>
                                <Text style={{ fontSize: 8, fontWeight: '700', color: gold }}>Page {pi + 1}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                ))}
              </View>
            )}

            {ungroupedImages.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>
                  {imageGroups.length > 0 ? 'Remaining images' : 'Select images that belong together'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ungroupedImages.map(img => {
                    const isSelected = imageSelection.includes(img.id);
                    return (
                      <TouchableOpacity
                        key={img.id}
                        onPress={() => toggleImageSelection(img.id)}
                        activeOpacity={0.8}
                        style={{ width: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: isSelected ? gold : colors.borderColor }}
                      >
                        <Image source={{ uri: `data:${img.mime};base64,${img.base64}` }} style={{ width: 80, height: 100 }} resizeMode="cover" />
                        <View style={{ paddingVertical: 3, backgroundColor: isSelected ? gold : colors.cardDark, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                          <Feather name={isSelected ? 'check-square' : 'square'} size={11} color={isSelected ? '#fff' : colors.textDim} />
                          <Text style={{ fontSize: 9, fontWeight: '700', color: isSelected ? '#fff' : colors.textDim }} numberOfLines={1}>{img.name}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.chip, { opacity: imageSelection.length >= 2 ? 1 : 0.4, alignSelf: 'flex-start' }]}
                  onPress={() => imageSelection.length >= 2 && confirmImageGroup()}
                  activeOpacity={0.8}
                >
                  <Feather name="layers" size={12} color={gold} />
                  <Text style={[styles.chipText, { color: gold }]}>Group Selected ({imageSelection.length}) into 1 Worksheet</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={finishImageGrouping} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>
                Continue — {imageGroups.length + ungroupedImages.length} worksheet{imageGroups.length + ungroupedImages.length === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ── PHASE 1: Classify — preview + editable subject/grade/title, ALL files ── */}
      {bulkPhase === 'classify' && (
        <View style={{ gap: 14 }}>
          {bulkItems.map((item, idx) => (
            <View key={item.id} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: item.status === 'error' ? '#c9605f60' : colors.borderColor, backgroundColor: colors.cardDark, gap: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: gold }}>Worksheet {idx + 1} of {bulkItems.length}</Text>

              {item.status === 'extracting' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={gold} />
                  <Text style={{ fontSize: 12, color: colors.textDim }}>Reading {item.name}...</Text>
                </View>
              )}

              {item.status === 'error' && (
                <Text style={{ fontSize: 12, color: '#c9605f' }}>Failed: {item.error}</Text>
              )}

              {item.status === 'ready' && (
                <>
                  {item.pages.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {item.pages.map((p, pi) => (
                          <TouchableOpacity key={pi} activeOpacity={0.8} onPress={() => setFullscreenImage(`data:${p.mime};base64,${p.base64}`)}>
                            <View style={{ width: 90, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: gold + '50' }}>
                              <Image source={{ uri: `data:${p.mime};base64,${p.base64}` }} style={{ width: 90, height: 120 }} resizeMode="contain" />
                              <View style={{ paddingVertical: 2, backgroundColor: gold + '20', alignItems: 'center' }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: gold }}>Page {pi + 1}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>Title</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    value={item.title}
                    onChangeText={(v) => updateBulkItem(item.id, { title: v })}
                    placeholder="Worksheet title"
                    placeholderTextColor={colors.textDim}
                  />

                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>Subject</Text>
                  <View style={styles.chipRow}>
                    {(item.subject && !subjectsFor(curriculum, item.grade).includes(item.subject) ? [...subjectsFor(curriculum, item.grade), item.subject] : subjectsFor(curriculum, item.grade)).map(s => (
                      <TouchableOpacity key={s} style={[styles.chip, item.subject === s && { backgroundColor: gold + '18', borderColor: gold }]} onPress={() => updateBulkItem(item.id, { subject: s })} activeOpacity={0.75}>
                        <Text style={[styles.chipText, item.subject === s && { color: gold }]}>{subjectLabel(s, curriculum, item.grade)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>Grade</Text>
                  <View style={styles.chipRow}>
                    {/* The worksheet's own extracted grade must always be selectable,
                        even if it falls outside the teacher's normal teaching grades
                        (gradeOptions) — same fix as single-worksheet upload. Without
                        this, a worksheet correctly extracted as e.g. Grade 6 would have
                        no pill to select at all if the teacher only teaches Grade 3-5. */}
                    {(item.grade && !gradeOptions.includes(item.grade) ? [...gradeOptions, item.grade] : gradeOptions).map((g: string) => (
                      <TouchableOpacity key={g} style={[styles.chip, item.grade === g && { backgroundColor: gold + '18', borderColor: gold }]} onPress={() => updateBulkItem(item.id, { grade: g })} activeOpacity={0.75}>
                        <Text style={[styles.chipText, item.grade === g && { color: gold }]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Language picker — only for Language Acquisition worksheets,
                      same as single-worksheet upload. Was missing entirely here. */}
                  {item.subject === 'Language Acquisition' && (
                    <>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>Language</Text>
                      <View style={styles.chipRow}>
                        {(item.language && !languagesForCurriculum(curriculum).includes(item.language) ? [...languagesForCurriculum(curriculum), item.language] : languagesForCurriculum(curriculum)).map(lang => (
                          <TouchableOpacity key={lang} style={[styles.chip, item.language === lang && { backgroundColor: '#BAA46720', borderColor: '#BAA467' }]} onPress={() => updateBulkItem(item.id, { language: lang })} activeOpacity={0.75}>
                            <Text style={[styles.chipText, item.language === lang && { color: '#BAA467' }]}>{lang}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          ))}

          {bulkItems.length > 0 && bulkItems.every(it => it.status !== 'extracting') && (
            <TouchableOpacity
              style={[styles.submitBtn, { opacity: bulkItems.some(it => it.status === 'ready') ? 1 : 0.5 }]}
              onPress={() => bulkItems.some(it => it.status === 'ready') && generateAllBulkQuizzes()}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Continue to Generate Quizzes</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── PHASE 2: Generate — quiz status + preview, ALL files ── */}
      {bulkPhase === 'generate' && (
        <View style={{ gap: 10 }}>
          {bulkItems.filter(it => it.status === 'ready').map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: item.quizStatus === 'error' ? '#c9605f60' : item.quizStatus === 'done' ? '#4a9d6e60' : colors.borderColor }}>
              {item.quizStatus === 'idle' && <Feather name="clock" size={16} color={colors.textDim} />}
              {item.quizStatus === 'generating' && <ActivityIndicator size="small" color={gold} />}
              {item.quizStatus === 'done' && <Feather name="check-circle" size={16} color="#4a9d6e" />}
              {item.quizStatus === 'error' && <Feather name="x-circle" size={16} color="#c9605f" />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ fontSize: 10, color: colors.textDim }}>{item.subject} · {item.grade}</Text>
              </View>
              {item.quizStatus === 'done' && (
                <TouchableOpacity
                  onPress={() => {
                    // Opens the SAME Preview/Edit Answers screen single-worksheet
                    // upload uses — teacher can review, then switch to "Edit
                    // Answers" to fix answers/hints for THIS worksheet before
                    // moving to Assign & Publish. Was previously read-only.
                    setEditingBulkItemId(item.id);
                    setInteractiveQuiz({ ...item.quiz, _previewHTML: item.quizHtml, _editMode: false });
                    setShowInteractivePreview(true);
                  }}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: gold + '18' }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: gold }}>Preview / Edit</Text>
                </TouchableOpacity>
              )}
              {item.quizStatus === 'error' && (
                <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: 130 }}>
                  <Text style={{ fontSize: 10, color: '#c9605f' }} numberOfLines={2}>{item.quizError}</Text>
                  <TouchableOpacity onPress={() => generateOneBulkQuiz(item)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#c9605f18' }} activeOpacity={0.75}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#c9605f' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {bulkItems.some(it => it.status === 'ready') && bulkItems.filter(it => it.status === 'ready').every(it => it.quizStatus === 'done' || it.quizStatus === 'error') && (
            <TouchableOpacity
              style={[styles.submitBtn, { opacity: bulkItems.some(it => it.quizStatus === 'done') ? 1 : 0.5 }]}
              onPress={() => bulkItems.some(it => it.quizStatus === 'done') && setBulkPhase('assign')}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Continue to Assign & Publish</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── PHASE 3: Assign & Publish — ALL files, one Publish action ── */}
      {bulkPhase === 'assign' && (
        <View style={{ gap: 14 }}>
          <Text style={styles.fieldLabel}>Due Date (applies to all)</Text>
          <DatePicker value={bulkDueDate} onChange={setBulkDueDate} />

          {bulkItems.filter(it => it.quizStatus === 'done').map((item) => (
            <View key={item.id} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: item.publishStatus === 'error' ? '#c9605f60' : item.publishStatus === 'done' ? '#4a9d6e60' : colors.borderColor, backgroundColor: colors.cardDark, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {item.publishStatus === 'publishing' && <ActivityIndicator size="small" color={gold} />}
                {item.publishStatus === 'done' && <Feather name="check-circle" size={16} color="#4a9d6e" />}
                {item.publishStatus === 'error' && <Feather name="x-circle" size={16} color="#c9605f" />}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain, flex: 1 }} numberOfLines={1}>{item.title}</Text>
              </View>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, item.assignTo === 'all' && { backgroundColor: gold + '18', borderColor: gold }]} onPress={() => updateBulkItem(item.id, { assignTo: 'all' })} activeOpacity={0.75}>
                  <Feather name="users" size={12} color={item.assignTo === 'all' ? gold : colors.textMuted} />
                  <Text style={[styles.chipText, item.assignTo === 'all' && { color: gold }]}>All students</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, item.assignTo === 'specific' && { backgroundColor: gold + '18', borderColor: gold }]} onPress={() => updateBulkItem(item.id, { assignTo: 'specific' })} activeOpacity={0.75}>
                  <Feather name="user" size={12} color={item.assignTo === 'specific' ? gold : colors.textMuted} />
                  <Text style={[styles.chipText, item.assignTo === 'specific' && { color: gold }]}>Specific student</Text>
                </TouchableOpacity>
              </View>
              {item.assignTo === 'specific' && (
                <View style={{ gap: 4 }}>
                  {!studentsLoaded && students.length === 0 && (
                    <ActivityIndicator size="small" color={gold} style={{ marginVertical: 8 }} />
                  )}
                  {studentsLoaded && (() => {
                    const normG = (g?: string) => (g ?? '').toLowerCase().replace(/grade/g, '').replace(/\s+/g, '').trim();
                    const gradeMatched = students.filter(s => !item.grade || normG(s.grade) === normG(item.grade));
                    // If the extracted grade doesn't match any student's grade format,
                    // fall back to the full roster instead of silently showing nothing —
                    // a strict-only filter could block assigning entirely on a format mismatch.
                    const list = gradeMatched.length > 0 ? gradeMatched : students;
                    if (list.length === 0) {
                      return <Text style={{ fontSize: 11, color: colors.textMuted, paddingVertical: 8 }}>No students linked yet — add students in the Students tab.</Text>;
                    }
                    return list.slice(0, 6).map(s => (
                      <TouchableOpacity key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: item.selectedStudentId === s.id ? gold + '18' : 'transparent', borderWidth: 1, borderColor: item.selectedStudentId === s.id ? gold : colors.borderColor }} onPress={() => updateBulkItem(item.id, { selectedStudentId: s.id })} activeOpacity={0.75}>
                        <Feather name="user" size={12} color={item.selectedStudentId === s.id ? gold : colors.textMuted} />
                        <Text style={{ fontSize: 12, color: item.selectedStudentId === s.id ? gold : colors.textMain }}>{s.name}</Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>
              )}
              {item.publishStatus === 'error' && <Text style={{ fontSize: 11, color: '#c9605f' }}>{item.publishError}</Text>}
            </View>
          ))}

          {bulkItems.filter(it => it.quizStatus === 'done').every(it => it.publishStatus === 'idle') && (
            <TouchableOpacity style={styles.submitBtn} onPress={publishAllBulkItems} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>Publish All ({bulkItems.filter(it => it.quizStatus === 'done').length})</Text>
            </TouchableOpacity>
          )}

          {bulkItems.filter(it => it.quizStatus === 'done').length > 0 && bulkItems.filter(it => it.quizStatus === 'done').every(it => it.publishStatus === 'done' || it.publishStatus === 'error') && (
            <TouchableOpacity style={styles.submitBtn} onPress={() => { setShowModal(false); resetForm(); }} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>Done — {bulkItems.filter(it => it.publishStatus === 'done').length}/{bulkItems.filter(it => it.quizStatus === 'done').length} published</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
