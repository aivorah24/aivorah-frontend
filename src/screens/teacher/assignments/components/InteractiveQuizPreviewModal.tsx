import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Modal, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { answerToEditText } from '../utils/validation';
import { generateQuizHTMLPreview, stripInternalQuizFields } from '../utils/quizHtml';
import SERVER_URL from '../../../../config/serverUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

// The unified Interactive Quiz Preview/Edit-Answers modal — server-rendered
// HTML preview + a full editable form for every question type (plain,
// table, venn diagram) — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, fifteenth step of its hooks/components
// decomposition (2026-08-25).
//
// Reused for both the single-worksheet upload wizard AND bulk-upload items
// (see editingBulkItemId in the screen) — the SAME modal works for both
// flows, not a duplicate, which is why it only takes a generic quiz/setQuiz
// pair rather than anything upload- or bulk-specific.
export function InteractiveQuizPreviewModal({ quiz, setQuiz, onClose }: {
  quiz: any;
  setQuiz: (v: any) => void;
  onClose: () => void;
}) {
  const interactiveQuiz = quiz;
  const setInteractiveQuiz = setQuiz;
  const conversionReport = (interactiveQuiz as any).conversionReport;
  const needsReviewBanner = !!conversionReport && conversionReport.overallStatus !== 'COMPLETE';
  const nonPreservedCount = needsReviewBanner ? conversionReport.items.filter((i: any) => i.status !== 'PRESERVED').length : 0;
  const [reviewBannerHeight, setReviewBannerHeight] = React.useState(0);

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0f1117', position: 'relative' } as any}>
        {/* Top bar with tabs */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16, backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: '#30363d' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: !(interactiveQuiz as any)._editMode ? '#BAA467' : '#1c2129' }}
              onPress={async () => {
                // Fast path: we already hold the rendered HTML and nothing was edited
                // since (edits null out _previewHTML on every keystroke), so switch back
                // to Preview instantly instead of re-fetching from the server — this is
                // what removes the lag when toggling Edit Answers → Preview.
                if ((interactiveQuiz as any)._previewHTML) {
                  setInteractiveQuiz({ ...interactiveQuiz, _editMode: false });
                  return;
                }
                const updated = { ...interactiveQuiz, _editMode: false };
                // Fetch server-rendered HTML for preview (strip internal props)
                const cleanQ = stripInternalQuizFields(interactiveQuiz);
                try {
                  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz: cleanQ }),
                  });
                  (updated as any)._previewHTML = await res.text();
                } catch {}
                setInteractiveQuiz(updated);
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: !(interactiveQuiz as any)._editMode ? '#0f1117' : '#8b949e' }}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: (interactiveQuiz as any)._editMode ? '#BAA467' : '#1c2129' }}
              onPress={async () => {
                // Edit Answers must show the same shape Preview does (e.g. a riddle
                // task collapsed into a No./Riddle/Answer table) — that transform only
                // happens server-side, so fetch it once and cache it on the quiz object.
                if ((interactiveQuiz as any)._normalized) {
                  setInteractiveQuiz({ ...interactiveQuiz, _editMode: true });
                  return;
                }
                const _previewHTML = (interactiveQuiz as any)._previewHTML;
                const cleanQ = stripInternalQuizFields(interactiveQuiz);
                try {
                  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/normalize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz: cleanQ }),
                  });
                  const data = await res.json();
                  setInteractiveQuiz({ ...(data.quiz || cleanQ), _previewHTML, _editMode: true, _normalized: true });
                } catch {
                  setInteractiveQuiz({ ...interactiveQuiz, _editMode: true, _normalized: true });
                }
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: (interactiveQuiz as any)._editMode ? '#0f1117' : '#8b949e' }}>Edit Answers</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2e7d32', flexDirection: 'row', gap: 6, alignItems: 'center' }}
              onPress={() => {
                if (needsReviewBanner) {
                  const msg = `${nonPreservedCount} task${nonPreservedCount === 1 ? '' : 's'} could not be fully verified against the source document (see the banner above). Save anyway?`;
                  // Alert.alert with buttons is a no-op on react-native-web.
                  if (Platform.OS === 'web') {
                    if (window.confirm(msg)) onClose();
                    return;
                  }
                  Alert.alert('Review needed before saving', msg,
                    [{ text: 'Cancel', style: 'cancel' }, { text: 'Save anyway', onPress: () => { onClose(); Alert.alert('Saved', 'Interactive quiz is ready for publishing.'); } }]
                  );
                  return;
                }
                onClose();
                if (Platform.OS !== 'web') Alert.alert('Saved', 'Interactive quiz is ready for publishing.');
              }}
            >
              <Feather name="check-circle" size={14} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Approve & Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a237e', flexDirection: 'row', gap: 6, alignItems: 'center' }}
              onPress={async () => {
                // If we already have the server-rendered HTML, open it directly
                if ((interactiveQuiz as any)._previewHTML) {
                  const blob = new Blob([(interactiveQuiz as any)._previewHTML], { type: 'text/html' });
                  window.open(URL.createObjectURL(blob), '_blank');
                  return;
                }
                // Otherwise fetch from server (strip internal props)
                const cleanQuiz = stripInternalQuizFields(interactiveQuiz);
                try {
                  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: cleanQuiz }) });
                  const html = await res.text();
                  const blob = new Blob([html], { type: 'text/html' });
                  window.open(URL.createObjectURL(blob), '_blank');
                } catch {
                  const htmlContent = generateQuizHTMLPreview(cleanQuiz);
                  window.open(URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' })), '_blank');
                }
              }}
            >
              <Feather name="external-link" size={14} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Open in Tab</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Feather name="x" size={22} color="#8b949e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Conversion status banner — surfaces quiz.conversionReport so a teacher
            never has to trust "generation succeeded" at face value. Only shown
            when something needs eyes on it (REVIEW_REQUIRED/FAILED); a fully
            PRESERVED/COMPLETE report is silent by design (no noise on the happy path). */}
        {needsReviewBanner && (
          <View
            onLayout={(e) => setReviewBannerHeight(e.nativeEvent.layout.height)}
            style={{ backgroundColor: conversionReport.overallStatus === 'FAILED' ? '#3d1a1a' : '#3d2f0f', borderBottomWidth: 1, borderBottomColor: '#30363d', padding: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="alert-triangle" size={15} color={conversionReport.overallStatus === 'FAILED' ? '#f85149' : '#d29922'} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {conversionReport.overallStatus === 'FAILED' ? 'Conversion failed'
                  : nonPreservedCount > 0 ? `${nonPreservedCount} task${nonPreservedCount === 1 ? '' : 's'} need your review before publishing`
                  : 'This conversion needs your review before publishing'}
              </Text>
            </View>
            {(interactiveQuiz as any).visualUnderstandingAvailable === false && (
              <Text testID="quiz-preview-text-only-note" style={{ color: '#c9d1d9', fontSize: 12, marginTop: 6, marginLeft: 23 }}>
                Read from the worksheet’s text only (no vision AI available right now) — pictures are included, but answers to picture-based questions need you in Edit Answers.
              </Text>
            )}
            {conversionReport.taskCountWarning && (
              <Text style={{ color: '#f85149', fontSize: 12, marginTop: 6, marginLeft: 23, fontWeight: '700' }}>
                ⚠ {conversionReport.taskCountWarning}
              </Text>
            )}
            {conversionReport.missingContentWarning && (
              <Text style={{ color: '#f85149', fontSize: 12, marginTop: 6, marginLeft: 23, fontWeight: '700' }}>
                ⚠ {conversionReport.missingContentWarning}
              </Text>
            )}
            {conversionReport.items
              .filter((i: any) => i.status !== 'PRESERVED')
              .map((i: any, idx: number) => (
                <Text key={idx} style={{ color: '#c9d1d9', fontSize: 12, marginTop: 6, marginLeft: 23 }}>
                  <Text style={{ fontWeight: '700' }}>{i.status === 'FAILED' ? '✕ ' : '⚠ '}{i.title || `Task ${idx + 1}`}:</Text> {i.reason || 'No content could be extracted or generated for this task.'}
                </Text>
              ))}
          </View>
        )}

        {/* Preview Mode — server-rendered HTML embedded */}
        {!(interactiveQuiz as any)._editMode && (interactiveQuiz as any)._previewHTML && Platform.OS === 'web' && (
          <div
            ref={(el: any) => {
              if (el && !(el as any)._done) {
                (el as any)._done = true;
                const html = (interactiveQuiz as any)._previewHTML;
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const f = document.createElement('iframe');
                f.src = url;
                f.style.cssText = 'width:100%;border:none;background:#0f1117;display:block;height:100%;';
                f.title = 'Quiz Preview';
                f.onload = () => {
                  try {
                    const h = f.contentDocument?.documentElement?.scrollHeight;
                    if (h && h > 100) f.style.height = h + 'px';
                  } catch {}
                  URL.revokeObjectURL(url);
                };
                el.appendChild(f);
              }
            }}
            style={{ position: 'fixed', top: needsReviewBanner ? 56 + reviewBannerHeight : 56, left: 0, right: 0, bottom: 0, overflow: 'auto', background: '#0f1117', zIndex: 9999 } as any}
          />
        )}
        {!(interactiveQuiz as any)._editMode && !(interactiveQuiz as any)._previewHTML && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#BAA467" />
            <Text style={{ color: '#8b949e', marginTop: 12, fontSize: 14 }}>Loading preview...</Text>
            <TouchableOpacity
              style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#BAA467' }}
              onPress={async () => {
                try {
                  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: interactiveQuiz }) });
                  const html = await res.text();
                  setInteractiveQuiz({ ...interactiveQuiz, _previewHTML: html, _editMode: false });
                } catch {}
              }}
            >
              <Text style={{ color: '#0f1117', fontWeight: '700', fontSize: 13 }}>Load Preview</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Edit Mode — editable answer/hint/solution fields */}
        {(interactiveQuiz as any)._editMode && (
          <ScrollView style={{ flex: 1, backgroundColor: '#0B0B0B' }} contentContainerStyle={{ alignItems: 'center', padding: 16 }}>
            {/* Preview's HTML caps content at 960px and centers it (.container { max-width:
                960px; margin:0 auto }) — without this, inputs with flex:1 stretch edge to
                edge across the whole modal instead of staying a readable card width. */}
            <View style={{ width: '100%', maxWidth: 960 }}>
            {(() => {
              let globalQNum = 0;
              return interactiveQuiz.tasks?.map((task: any, ti: number) => {
                const tierPalette: Record<string, { border: string; bg: string; label: string; labelBg: string }> = {
                'MUST DO':   { border: '#BAA467', bg: 'rgba(186,164,103,0.08)', label: '#BAA467', labelBg: 'rgba(186,164,103,0.15)' },
                'COULD DO':  { border: '#C9A24E', bg: 'rgba(201,162,78,0.08)',  label: '#C9A24E', labelBg: 'rgba(201,162,78,0.15)' },
                'ENRICHMENT':{ border: '#C98A8A', bg: 'rgba(201,138,138,0.08)', label: '#C98A8A', labelBg: 'rgba(201,138,138,0.15)' },
              };
              const tp = tierPalette[task.tier] || tierPalette['MUST DO'];
              return (
                <View key={ti} style={{ marginBottom: 20, borderLeftWidth: 5, borderLeftColor: tp.border, borderRadius: 12, backgroundColor: tp.bg, padding: 18 }}>
                  <View style={{ backgroundColor: tp.labelBg, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 4, marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: tp.label, textTransform: 'uppercase', letterSpacing: 1.5 }}>{task.tier}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: tp.label, marginBottom: 4 }}>{(task.title || '').replace(/\*\*/g, '')}</Text>
                  {(() => {
                    // Only show a task-level image when the task genuinely needs one as a
                    // diagram (sharedImage / diagramFill / a question flagged hasImage with
                    // no extracted crop) — matching exactly what Preview shows. A reading
                    // passage task also carries task.pageImageUrl (the raw scanned page,
                    // kept around only as an internal fallback source), but Preview never
                    // displays that scan for a plain text task, so Edit Answers shouldn't either.
                    const anyQuestionNeedsImage = (task.questions || []).some((q: any) => q.hasImage && !q.imageUrl);
                    const taskDiagramUrl = task.diagramFillImageUrl
                      || (task.sharedImage && (task.questions?.[0]?.imageUrl || task.pageImageUrl))
                      || (anyQuestionNeedsImage && task.pageImageUrl);
                    if (taskDiagramUrl) {
                      return (
                        <View style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(195,220,216,0.2)', backgroundColor: '#fff', padding: 8 }}>
                          <Image source={{ uri: taskDiagramUrl.startsWith('http') || taskDiagramUrl.startsWith('data:') ? taskDiagramUrl : `${SERVER_URL}${taskDiagramUrl}` }} style={{ width: '100%', height: 200, resizeMode: 'contain' }} />
                        </View>
                      );
                    }
                    if (Array.isArray(task.pyramids) && task.pyramids.length) {
                      return (
                        <View style={{ marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(195,220,216,0.18)', borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 12, color: '#A8B5B3' }}>Diagram: number pyramid — see Preview tab to view the rendered diagram.</Text>
                        </View>
                      );
                    }
                    if (task.chart && Array.isArray(task.chart.bars) && task.chart.bars.length) {
                      return (
                        <View style={{ marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(195,220,216,0.18)', borderRadius: 8, padding: 10 }}>
                          <Text style={{ fontSize: 12, color: '#A8B5B3' }}>Diagram: bar chart — see Preview tab to view the rendered diagram.</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  {task.passage && (
                    <View style={{ marginBottom: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(195,220,216,0.2)', borderRadius: 8 }}>
                      <Text style={{ fontSize: 13, color: '#D8E8E6', lineHeight: 20 }}>{task.passage}</Text>
                    </View>
                  )}

                  {/* Table tasks: render every table (task.table AND task.tables[]) with its
                      real headers/columns, and make answer cells editable INSIDE the table
                      grid — the same structure the worksheet and Preview show. */}
                  {(() => {
                    const tables: { tbl: any; kind: 'table' | 'tables'; idx: number }[] = [];
                    if (task.table?.rows?.length) tables.push({ tbl: task.table, kind: 'table', idx: -1 });
                    (task.tables || []).forEach((t: any, k: number) => { if (t?.rows?.length) tables.push({ tbl: t, kind: 'tables', idx: k }); });
                    if (!tables.length) return null;
                    return tables.map((entry, tIdx) => {
                      const { tbl, kind, idx } = entry;
                      const headers: string[] = tbl.headers || [];
                      const ncols = Math.max(headers.length, ...tbl.rows.map((r: any[]) => r.length));
                      // Column widths: input columns and short/number columns stay narrow;
                      // long text columns get more room so riddle/question text stays readable.
                      const colFlex: number[] = [];
                      for (let c = 0; c < ncols; c++) {
                        const anyInput = tbl.rows.some((r: any[]) => r[c]?.input);
                        const avgLen = tbl.rows.reduce((s: number, r: any[]) => s + String(r[c]?.text ?? '').length, 0) / tbl.rows.length;
                        colFlex[c] = anyInput ? 1 : (avgLen > 14 ? 1.8 : 0.55);
                      }
                      return (
                        <View key={`tbl${tIdx}`} style={{ borderWidth: 1, borderColor: 'rgba(195,220,216,0.18)', borderRadius: 8, overflow: 'hidden', marginTop: 10 }}>
                          {headers.length > 0 && (
                            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(186,164,103,0.14)' }}>
                              {headers.map((h: string, hi: number) => (
                                <Text key={hi} style={{ flex: colFlex[hi] || 1, fontSize: 12, fontWeight: '700', color: '#D8E8E6', padding: 10, textAlign: 'center' }}>{String(h)}</Text>
                              ))}
                            </View>
                          )}
                          {tbl.rows.map((row: any[], ri: number) => (
                            <View key={ri} style={{ flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: 'rgba(195,220,216,0.12)' }}>
                              {Array.from({ length: ncols }).map((_, ci) => {
                                const cell = row[ci] || {};
                                return (
                                  <View key={ci} style={{ flex: colFlex[ci] || 1, padding: 6, justifyContent: 'center' }}>
                                    {cell.input ? (
                                      <TextInput
                                        style={{ borderWidth: 1.5, borderColor: 'rgba(186,164,103,0.45)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: '#F0EEEC', backgroundColor: '#252525', fontWeight: '600', textAlign: 'center' }}
                                        value={String(cell.answer ?? '')}
                                        onChangeText={(val) => {
                                          const u = { ...interactiveQuiz };
                                          if (kind === 'table') u.tasks[ti].table.rows[ri][ci].answer = val;
                                          else u.tasks[ti].tables[idx].rows[ri][ci].answer = val;
                                          u._previewHTML = null;
                                          setInteractiveQuiz(u);
                                        }}
                                        placeholder="?"
                                        placeholderTextColor="#6E736B"
                                      />
                                    ) : (
                                      <Text style={{ fontSize: 13, color: ci === 0 ? '#A8B5B3' : '#F0EEEC', padding: 4, textAlign: colFlex[ci] > 1 ? 'left' : 'center' }}>{String(cell.text ?? cell.answer ?? '')}</Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      );
                    });
                  })()}

                  {task.questions?.map((q: any, qi: number) => {
                    globalQNum++;
                    const questionLabel = q.id ? `${q.id})` : `Q${globalQNum}.`;
                    // Activity/open-ended questions can carry a STRUCTURED answer (e.g. a
                    // { table: [...] } object for "organise the data" tasks). String(obj)
                    // renders "[object Object]", which looked like an empty/broken answer
                    // (the "Task 3 has no answers" report). Flatten any structured answer
                    // to readable, editable text so every task shows its real answer.
                    const answerText = answerToEditText(q.answer);
                    const answerIsLong = answerText.length > 48 || answerText.includes('\n');

                    // ── VENN DIAGRAM: edit the answer INSIDE the diagram. Two overlapping
                    //    circles with three editable regions (left-only / both / right-only),
                    //    bound to q.answers.{left,center,right}. Mirrors the Preview layout. ──
                    if (q.type === 'venn') {
                      const leftLabel = q.leftLabel || 'Group A';
                      const rightLabel = q.rightLabel || 'Group B';
                      const ans = q.answers || { left: [], center: [], right: [] };
                      const asText = (arr: any) => Array.isArray(arr) ? arr.join(', ') : String(arr ?? '');
                      const setRegion = (region: 'left' | 'center' | 'right', val: string) => {
                        const u = { ...interactiveQuiz };
                        const qq = u.tasks[ti].questions[qi];
                        if (!qq.answers) qq.answers = { left: [], center: [], right: [] };
                        qq.answers[region] = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                        u._previewHTML = null;
                        setInteractiveQuiz(u);
                      };
                      const regionStyle: any = { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(195,220,216,0.55)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', color: '#F0EEEC', fontSize: 13, padding: 6, textAlign: 'center', textAlignVertical: 'top' };
                      return (
                        <View key={qi} style={{ backgroundColor: '#1C1C1C', padding: 16, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: 'rgba(195,220,216,0.12)' }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#F0EEEC', marginBottom: 4, lineHeight: 22 }}>{questionLabel} {(q.question || '').replace(/\*\*(.+?)\*\*/g, '$1')}</Text>
                          <Text style={{ fontSize: 12, color: '#A8B5B3', marginBottom: 8 }}>Type answer items separated by commas — shared items go in the middle overlap.</Text>
                          <View style={{ position: 'relative', width: '100%', maxWidth: 540, height: 300, alignSelf: 'center', marginBottom: 8 }}>
                            {/* two overlapping circles */}
                            <View style={{ position: 'absolute', left: 0, top: 26, width: '60%', height: 248, borderRadius: 9999, borderWidth: 2.5, borderColor: '#BAA467', backgroundColor: 'rgba(186,164,103,0.10)' }} />
                            <View style={{ position: 'absolute', right: 0, top: 26, width: '60%', height: 248, borderRadius: 9999, borderWidth: 2.5, borderColor: '#BAA467', backgroundColor: 'rgba(197,189,150,0.10)' }} />
                            {/* circle labels */}
                            <Text style={{ position: 'absolute', left: '10%', top: 0, fontSize: 15, fontWeight: '700', color: '#BAA467' }}>{leftLabel}</Text>
                            <Text style={{ position: 'absolute', right: '10%', top: 0, fontSize: 15, fontWeight: '700', color: '#BAA467' }}>{rightLabel}</Text>
                            {/* three editable regions */}
                            <TextInput multiline value={asText(ans.left)} onChangeText={(v) => setRegion('left', v)} placeholder={`${leftLabel} only`} placeholderTextColor="#6E736B" style={{ ...regionStyle, left: '2%', top: 92, width: '27%', height: 132 }} />
                            <TextInput multiline value={asText(ans.center)} onChangeText={(v) => setRegion('center', v)} placeholder="Both" placeholderTextColor="#6E736B" style={{ ...regionStyle, left: '37%', top: 100, width: '26%', height: 118 }} />
                            <TextInput multiline value={asText(ans.right)} onChangeText={(v) => setRegion('right', v)} placeholder={`${rightLabel} only`} placeholderTextColor="#6E736B" style={{ ...regionStyle, right: '2%', top: 92, width: '27%', height: 132 }} />
                          </View>
                          <View style={{ marginBottom: 10, backgroundColor: 'rgba(197,189,150,0.10)', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#BAA467' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 4 }}>Hint:</Text>
                            <TextInput style={{ borderWidth: 1, borderColor: 'rgba(197,189,150,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#D8E8E6', backgroundColor: '#252525' }} value={q.hint || ''} onChangeText={(val) => { const u = { ...interactiveQuiz }; u.tasks[ti].questions[qi].hint = val; u._previewHTML = null; setInteractiveQuiz(u); }} placeholder="Hint" placeholderTextColor="#6E736B" multiline />
                          </View>
                          <View style={{ backgroundColor: 'rgba(186,164,103,0.10)', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#BAA467' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 4 }}>Solution:</Text>
                            <TextInput style={{ borderWidth: 1, borderColor: 'rgba(186,164,103,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#D8E8E6', backgroundColor: '#252525' }} value={q.solution || ''} onChangeText={(val) => { const u = { ...interactiveQuiz }; u.tasks[ti].questions[qi].solution = val; u._previewHTML = null; setInteractiveQuiz(u); }} placeholder="Solution" placeholderTextColor="#6E736B" multiline numberOfLines={3} />
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={qi} style={{ backgroundColor: '#1C1C1C', padding: 16, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: 'rgba(195,220,216,0.12)' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#F0EEEC', marginBottom: 10, lineHeight: 22 }}>{questionLabel} {(q.question || '').replace(/\*\*(.+?)\*\*/g, '$1')}</Text>
                      {/* Skip the raw scanned-page crop when this task already has a
                          structured chart — Preview shows the chart ONCE at the top of
                          the task (see renderBarChart in quiz.js), not the unstyled raw
                          scan repeated under every question referring to it. Showing
                          both was the source of the "why doesn't Edit Answers look like
                          Preview" mismatch. */}
                      {q.imageUrl && !(task.chart && Array.isArray(task.chart.bars) && task.chart.bars.length) && (
                        <View style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(195,220,216,0.2)', backgroundColor: '#fff', padding: 8 }}>
                          <Image source={{ uri: q.imageUrl.startsWith('http') ? q.imageUrl : `${SERVER_URL}${q.imageUrl}` }} style={{ width: '100%', height: 160, resizeMode: 'contain' }} />
                        </View>
                      )}
                      <View style={{ flexDirection: answerIsLong ? 'column' : 'row', alignItems: answerIsLong ? 'stretch' : 'center', gap: 8, marginBottom: 10, backgroundColor: 'rgba(186,164,103,0.10)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(186,164,103,0.3)' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#BAA467' }}>{/^-?\d+(\.\d+)?$/.test(answerText.trim()) || q.type === 'numeric' ? 'Answer =' : 'Answer:'}</Text>
                        <TextInput style={{ flex: answerIsLong ? undefined : 1, borderWidth: 1.5, borderColor: 'rgba(195,220,216,0.25)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: '#F0EEEC', backgroundColor: '#252525', fontWeight: '600', minHeight: answerIsLong ? 72 : undefined, textAlignVertical: answerIsLong ? 'top' : 'center' }} value={answerText} onChangeText={(val) => { const u = { ...interactiveQuiz }; u.tasks[ti].questions[qi].answer = val; u._previewHTML = null; setInteractiveQuiz(u); }} placeholder="Answer" placeholderTextColor="#6E736B" multiline={answerIsLong} />
                        {q.unit && <Text style={{ fontSize: 13, color: '#A8B5B3', fontWeight: '500' }}>{q.unit}</Text>}
                      </View>
                      <View style={{ marginBottom: 10, backgroundColor: 'rgba(197,189,150,0.10)', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#BAA467' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 4 }}>Hint:</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: 'rgba(197,189,150,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#D8E8E6', backgroundColor: '#252525' }} value={q.hint || ''} onChangeText={(val) => { const u = { ...interactiveQuiz }; u.tasks[ti].questions[qi].hint = val; u._previewHTML = null; setInteractiveQuiz(u); }} placeholder="Hint" placeholderTextColor="#6E736B" multiline />
                      </View>
                      <View style={{ backgroundColor: 'rgba(186,164,103,0.10)', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#BAA467' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#BAA467', marginBottom: 4 }}>Solution:</Text>
                        <TextInput style={{ borderWidth: 1, borderColor: 'rgba(186,164,103,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#D8E8E6', backgroundColor: '#252525' }} value={q.solution || ''} onChangeText={(val) => { const u = { ...interactiveQuiz }; u.tasks[ti].questions[qi].solution = val; u._previewHTML = null; setInteractiveQuiz(u); }} placeholder="Solution" placeholderTextColor="#6E736B" multiline numberOfLines={3} />
                      </View>
                      </View>
                    );
                  })}
                </View>
              );
            });
            })()}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
