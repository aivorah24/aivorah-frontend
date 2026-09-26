import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import SERVER_URL from '../../../../../config/serverUrl';
import type { AppColors } from '../../../../../theme';
import { speakWithBoundary } from '../utils/audio';
import { parseSubtraction } from '../utils/math';
import ColumnSubtraction from './ColumnSubtraction';
import { makeStyles } from '../styles';
import type { Mode } from '../types';
import type { ReasoningListen } from '../utils/listenFromBlocks';
import ListenVisualBoard from './ListenVisualBoard';

const PLAYBACK_RATES = [0.6, 0.78, 1.0, 1.25];

export default function ListenTab({
  topic,
  isMath,
  listenSteps,
  reasoning,
  grade,
  subject,
  colors,
  styles,
  narration,
  fontLarge,
  setFontLarge,
  vocab,
  vocabIndex,
  setVocabIndex,
  pauseAnswer,
  setPauseAnswer,
  whyOpen, setWhyOpen,
  explainOpen, setExplainOpen,
  hintOpen, setHintOpen,
  exampleOpen, setExampleOpen,
  setMode,
  setZoomImage,
}: {
  topic: any;
  isMath: boolean;
  listenSteps: import('../types').ListenStep[];
  reasoning?: ReasoningListen | null;
  grade: string;
  subject: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  narration: ReturnType<typeof import('../hooks/useNarration').useNarration>;
  fontLarge: boolean;
  setFontLarge: (fn: (v: boolean) => boolean) => void;
  vocab: any[];
  vocabIndex: number;
  setVocabIndex: (fn: (i: number) => number) => void;
  pauseAnswer: number | null;
  setPauseAnswer: (i: number | null) => void;
  whyOpen: boolean; setWhyOpen: (fn: (v: boolean) => boolean) => void;
  explainOpen: boolean; setExplainOpen: (fn: (v: boolean) => boolean) => void;
  hintOpen: boolean; setHintOpen: (fn: (v: boolean) => boolean) => void;
  exampleOpen: boolean; setExampleOpen: (fn: (v: boolean) => boolean) => void;
  setMode: (m: Mode) => void;
  setZoomImage: (img: { uri: string; caption?: string } | null) => void;
}) {
  const {
    listenStep, listenPlaying, sentenceIdx, visitedSteps, clockTick,
    playbackRate, speedMenuOpen, setSpeedMenuOpen,
    currentListenStep, listenSentences,
    sentenceYRef, leftScrollRef,
    toggleListenPlay, repeatStep, goToListenStep, skipBy, changePlaybackRate,
  } = narration;

  const step = currentListenStep;
  const sentences = listenSentences;
  const curSentenceIdx = sentenceIdx;
  // Progress is line-based now (reliable), not a wall-clock guess: the
  // current line out of the step's lines. A completed line counts as
  // done; the active line counts as half so the bar always moves.
  const lineCount = Math.max(1, sentences.length);
  const lineProgress = Math.min(100, ((sentenceIdx + (listenPlaying ? 0.5 : 1)) / lineCount) * 100);
  void clockTick;
  const word = vocab[vocabIndex];
  const stepsCount = listenSteps.length;

  function closeAllPanels() {
    setWhyOpen(() => false);
    setExplainOpen(() => false);
    setHintOpen(() => false);
    setExampleOpen(() => false);
  }

  return (
    <View style={styles.listenModeWrap}>
      <View style={styles.dualPane}>
        <ScrollView ref={leftScrollRef} style={styles.leftPane} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.listenTopRow}>
            <View style={[styles.listeningToChip, { backgroundColor: colors.accentGreen + '1c' }]}>
              <Text style={[styles.listeningToText, { color: colors.accentGreen }]}>
                {isMath ? `Step ${listenStep + 1} of ${stepsCount}: ${step?.label}` : `Listening to: ${step?.label} of ${stepsCount}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.aaBtn, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}
                onPress={() => setFontLarge(v => !v)}
                activeOpacity={0.8}
              >
                <Text style={[styles.aaBtnText, { color: colors.textMain }]}>Aa</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isMath && (
            <View style={[styles.aiTutorBadge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
              <Feather name="cpu" size={12} color={colors.primary} />
              <Text style={[styles.aiTutorBadgeText, { color: colors.primary }]}>AI Tutor — let&apos;s understand this step by step</Text>
            </View>
          )}

          <Text style={[styles.listenHeading, { color: colors.textMain }]}>{step?.heading}</Text>

          {/* Visual column subtraction — solve it on the board like a teacher
              would for a young child, not as a wall of text. */}
          {isMath && (() => {
            const worked = (topic.readText as any).workedExamples as any[] | undefined;
            const ex = worked?.[Math.max(0, Math.min((worked?.length || 1) - 1, listenStep - 1))];
            const parsed = ex ? parseSubtraction(ex.problem) : null;
            if (!parsed || listenStep === 0) return null;
            return (
              <View style={{ marginVertical: 14 }}>
                <ColumnSubtraction top={parsed.top} bottom={parsed.bottom} colors={colors} />
              </View>
            );
          })()}

          <View style={styles.listenBodyRow}>
            {sentences.map((s, i) => {
              const active = i === curSentenceIdx;
              return (
                <View key={i} onLayout={(e) => { sentenceYRef.current[i] = e.nativeEvent.layout.y; }}>
                  <Text
                    style={[
                      styles.listenBodyText,
                      fontLarge && styles.listenBodyTextLarge,
                      {
                        color: active ? colors.textMain : colors.textMuted,
                        backgroundColor: active ? colors.accentGreen + '20' : 'transparent',
                      },
                    ]}
                  >
                    {s.sentence}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── Maths AI Tutor: compact "Listen" so the tutor can read the
              current step aloud (age 7 benefits from hearing it). ── */}
          {isMath && (
            <TouchableOpacity
              onPress={toggleListenPlay}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, marginTop: 14,
                paddingVertical: 8, paddingHorizontal: 14, borderRadius: 22,
                backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '40',
              }}
            >
              <Feather name={listenPlaying ? 'pause' : 'volume-2'} size={15} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {listenPlaying ? 'Pause' : 'Listen to this step'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Step navigation — placed right under the content so the student
              moves through steps without scrolling to a far footer. */}
          {isMath && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.mathFooterBtn, { borderColor: colors.borderColor }, listenStep === 0 && { opacity: 0.4 }]}
                onPress={() => goToListenStep(listenStep - 1, closeAllPanels)}
                disabled={listenStep === 0}
                activeOpacity={0.85}
              >
                <Feather name="arrow-left" size={14} color={colors.textMain} />
                <Text style={[styles.mathFooterBtnText, { color: colors.textMain }]}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mathFooterBtnPrimary, { backgroundColor: colors.accentGreen }, listenStep === (stepsCount ?? 1) - 1 && { opacity: 0.5 }]}
                onPress={() => goToListenStep(listenStep + 1, closeAllPanels)}
                disabled={listenStep === (stepsCount ?? 1) - 1}
                activeOpacity={0.85}
              >
                <Text style={styles.nextPartText}>{listenStep === (stepsCount ?? 1) - 1 ? 'Finished' : 'Next'}</Text>
                {listenStep !== (stepsCount ?? 1) - 1 && <Feather name="arrow-right" size={13} color="#fff" />}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Player (Science/English/etc — full audiobook transport) ── */}
          {!isMath && (
          <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.cardDark, marginTop: 16 }]}>
            <View style={styles.playerTimeRow}>
              <Text style={[styles.playerTimeText, { color: colors.textMuted }]}>Line {Math.min(sentenceIdx + 1, lineCount)} of {lineCount}</Text>
              <Text style={[styles.playerTimeText, { color: colors.textMuted }]}>{listenPlaying ? 'Reading…' : 'Paused'}</Text>
            </View>
            <View style={[styles.listenProgressTrack, { backgroundColor: colors.textDim + '35' }]}>
              <View style={[styles.listenProgressFill, { backgroundColor: colors.accentGreen, width: `${lineProgress}%` }]} />
              <View style={[styles.progressThumb, { left: `${lineProgress}%`, backgroundColor: colors.accentGreen }]} />
            </View>

            <View style={[styles.playerRow, { marginTop: 14 }]}>
              <TouchableOpacity style={styles.skipBtn} onPress={() => skipBy(-10)} activeOpacity={0.7} disabled={sentenceIdx === 0}>
                <Feather name="skip-back" size={20} color={sentenceIdx === 0 ? colors.borderColor : colors.textMuted} />
                <Text style={[styles.skipBtnLabel, { color: colors.textMuted }]}>Line</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.playBtn, { backgroundColor: colors.accentGreen }]} onPress={toggleListenPlay} activeOpacity={0.85}>
                <Feather name={listenPlaying ? 'pause' : 'play'} size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={() => skipBy(10)} activeOpacity={0.7} disabled={sentenceIdx >= lineCount - 1}>
                <Feather name="skip-forward" size={20} color={sentenceIdx >= lineCount - 1 ? colors.borderColor : colors.textMuted} />
                <Text style={[styles.skipBtnLabel, { color: colors.textMuted }]}>Line</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={repeatStep} activeOpacity={0.7}>
                <Feather name="rotate-ccw" size={18} color={colors.textMuted} />
                <Text style={[styles.skipBtnLabel, { color: colors.textMuted }]}>Repeat</Text>
              </TouchableOpacity>
              <View style={styles.speedBtn}>
                <TouchableOpacity onPress={() => setSpeedMenuOpen(v => !v)} activeOpacity={0.7}>
                  <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 13 }}>{playbackRate}x</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>Speed</Text>
                </TouchableOpacity>
                {speedMenuOpen && (
                  <View style={[styles.speedMenu, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
                    {PLAYBACK_RATES.map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.speedMenuRow, r === playbackRate && { backgroundColor: colors.accentGreen + '18' }]}
                        onPress={() => { changePlaybackRate(r); setSpeedMenuOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: r === playbackRate ? colors.accentGreen : colors.textMain, fontWeight: r === playbackRate ? '700' : '500', fontSize: 12.5 }}>
                          {r}x
                        </Text>
                        {r === playbackRate && <Feather name="check" size={12} color={colors.accentGreen} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
          )}

          {/* Step navigation for Listen — SAME inline pattern as the Math AI
              Tutor (Grade 2 Subtraction with Borrowing): compact Previous +
              primary Next sitting directly under the content, so a young
              reader never hunts for a far-away footer. */}
          {!isMath && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.mathFooterBtn, { borderColor: colors.borderColor }, listenStep === 0 && { opacity: 0.4 }]}
                onPress={() => goToListenStep(listenStep - 1, closeAllPanels)}
                disabled={listenStep === 0}
                activeOpacity={0.85}
              >
                <Feather name="arrow-left" size={14} color={colors.textMain} />
                <Text style={[styles.mathFooterBtnText, { color: colors.textMain }]}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mathFooterBtnPrimary, { backgroundColor: colors.accentGreen }, listenStep === (stepsCount ?? 1) - 1 && { opacity: 0.5 }]}
                onPress={() => goToListenStep(listenStep + 1, closeAllPanels)}
                disabled={listenStep === (stepsCount ?? 1) - 1}
                activeOpacity={0.85}
              >
                <Text style={styles.nextPartText}>{listenStep === (stepsCount ?? 1) - 1 ? 'Finished' : 'Next'}</Text>
                {listenStep !== (stepsCount ?? 1) - 1 && <Feather name="arrow-right" size={13} color="#fff" />}
              </TouchableOpacity>
            </View>
          )}

          {/* ── "Explain This Step" — written, not spoken. No audio anywhere
              in Math: the AI Tutor teaches by showing text/steps, never by
              reading them aloud. ── */}
          {isMath && explainOpen && (
            <View style={[styles.whyBox, { borderColor: colors.accentGreen + '40', backgroundColor: colors.accentGreen + '0d' }]}>
              <Text style={[styles.whyLabel, { color: colors.accentGreen }]}>Explanation</Text>
              <Text style={[styles.whyText, { color: colors.textMain }]}>
                {step?.text || step?.heading}
              </Text>
            </View>
          )}

          {/* ── "Why?" — expands this step's key idea inline, no tab switch. ── */}
          {isMath && whyOpen && (
            <View style={[styles.whyBox, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '0d' }]}>
              <Text style={[styles.whyLabel, { color: colors.primary }]}>Why?</Text>
              <Text style={[styles.whyText, { color: colors.textMain }]}>
                {step?.keyIdea || 'This step follows directly from the one before it — look at the reasoning in the step above.'}
              </Text>
            </View>
          )}

          {/* ── "Give Me a Hint" — a real hint drawn from the first step of
              the current example / the first key learning. ── */}
          {isMath && hintOpen && (() => {
            const worked = (topic.readText as any).workedExamples as any[] | undefined;
            const curEx = worked?.[Math.max(0, Math.min((worked?.length || 1) - 1, listenStep - 1))];
            const hint = (topic.readText as any).hint
              || curEx?.steps?.[1] // the "borrow" step is the real hint
              || (topic.readText as any).keyLearnings?.[1]
              || 'When the top ones digit is smaller than the bottom, borrow 1 ten first.';
            return (
              <View style={[styles.whyBox, { borderColor: colors.accentYellow + '50', backgroundColor: colors.accentYellow + '0d' }]}>
                <Text style={[styles.whyLabel, { color: colors.accentYellow }]}>Hint</Text>
                <Text style={[styles.whyText, { color: colors.textMain }]}>{hint}</Text>
              </View>
            );
          })()}

          {/* ── "Show Another Example" — shows a DIFFERENT worked example than
              the current step, structured as problem + steps. ── */}
          {isMath && exampleOpen && (() => {
            const worked = ((topic.readText as any).workedExamples as any[]) || [];
            const curIdx = Math.max(0, listenStep - 1);
            const other = worked.filter((_, i) => i !== curIdx);
            const ex = other[0] || worked[0];
            return (
              <View style={[styles.whyBox, { borderColor: colors.accentGreen + '50', backgroundColor: colors.accentGreen + '0d' }]}>
                <Text style={[styles.whyLabel, { color: colors.accentGreen }]}>Another Example</Text>
                {ex ? (() => {
                  const parsed = parseSubtraction(ex.problem);
                  return (
                    <>
                      <Text style={[styles.whyText, { color: colors.textMain, fontWeight: '700', marginBottom: 10 }]}>{ex.problem}</Text>
                      {parsed
                        ? <ColumnSubtraction top={parsed.top} bottom={parsed.bottom} colors={colors} />
                        : <>
                            {(ex.steps || []).map((s: string, i: number) => (
                              <Text key={i} style={[styles.whyText, { color: colors.textMain, marginTop: 4 }]}>{i + 1}. {s}</Text>
                            ))}
                            {ex.answer != null && <Text style={[styles.whyText, { color: colors.accentGreen, fontWeight: '800', marginTop: 6 }]}>= {ex.answer}</Text>}
                          </>}
                    </>
                  );
                })() : (
                  <Text style={[styles.whyText, { color: colors.textMain }]}>No further example is ready for this topic yet.</Text>
                )}
              </View>
            );
          })()}

          {/* ── Pause & Think ── */}
          {!!step?.pauseThink && (
            <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.cardDark, marginTop: 14 }]}>
              <View style={styles.pauseThinkHeader}>
                <View style={styles.pauseThinkTitleRow}>
                  <Feather name="zap" size={14} color="#6C5CE7" />
                  <Text style={[styles.pauseThinkTitle, { color: '#6C5CE7' }]}>Pause & Think</Text>
                </View>
                <View style={[styles.aivorahDot, { backgroundColor: colors.accentGreen + '20' }]}>
                  <Feather name="cpu" size={13} color={colors.accentGreen} />
                </View>
              </View>
              <Text style={[styles.pauseThinkQuestion, { color: colors.textMain }]}>{step.pauseThink.question}</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {step.pauseThink.options.map((opt, i) => {
                  const isCorrect = i === step.pauseThink!.correctIndex;
                  const chosen = pauseAnswer === i;
                  const reveal = chosen && isCorrect;
                  const wrongChosen = chosen && !isCorrect;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.pauseOption,
                        { borderColor: colors.borderColor },
                        reveal && { borderColor: colors.accentGreen, backgroundColor: colors.accentGreen + '16' },
                        wrongChosen && { borderColor: colors.accentRed, backgroundColor: colors.accentRed + '14' },
                      ]}
                      onPress={() => setPauseAnswer(i)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.pauseCheckbox,
                        { borderColor: colors.borderColor },
                        reveal && { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
                      ]}>
                        {reveal && <Feather name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[styles.pauseOptionText, { color: colors.textMain }]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {pauseAnswer === step.pauseThink.correctIndex && (
                <TouchableOpacity
                  style={[styles.continueBtn, { backgroundColor: colors.accentGreen }]}
                  onPress={() => goToListenStep(listenStep + 1, closeAllPanels)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueBtnText}>Nice thinking! Continue</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Right pane: illustration + New Word ── */}
        <ScrollView style={styles.rightPane} contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
          {reasoning && (
            <ListenVisualBoard
              cards={reasoning.cards}
              activeCard={reasoning.stepToCard[listenStep] ?? null}
              bookQuote={reasoning.bookQuote}
              topic={topic}
              grade={grade}
              subject={subject}
              colors={colors}
            />
          )}
          {(() => {
            // Per-stanza illustration for the current Listen step — map the
            // active stanza to its book image so the panel shows the real
            // picture, not "coming soon".
            const prompts = (topic.readText as any).illustrationPrompts as any[] | undefined;
            const withImg = (prompts || []).filter(p => p?.image || p?.image_ref || p?.url);
            if (withImg.length === 0) return null;
            const pick = withImg[Math.min(listenStep, withImg.length - 1)];
            const raw = pick.image || pick.image_ref || pick.url;
            const uri = /^https?:/.test(raw) ? raw : `${SERVER_URL}${raw}`;
            return (
              <View>
                <TouchableOpacity
                  style={[styles.illustrationBox, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}
                  activeOpacity={0.85}
                  onPress={() => setZoomImage({ uri, caption: pick.altText })}
                >
                  <Image source={{ uri }} style={styles.figureImg} resizeMode="contain" />
                  <View style={styles.zoomHint}><Feather name="maximize-2" size={11} color="#fff" /></View>
                </TouchableOpacity>
                {!!pick.altText && (
                  <View style={[styles.captionBox, { borderColor: colors.accentYellow + '30', backgroundColor: colors.accentYellow + '10' }]}>
                    <Text style={[styles.captionText, { color: colors.textMain }]}>{pick.altText}</Text>
                  </View>
                )}
              </View>
            );
          })() || (topic.readText.figureUrl ? (
            <View>
              <TouchableOpacity
                style={[styles.illustrationBox, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}
                activeOpacity={0.85}
                onPress={() => setZoomImage({ uri: topic.readText.figureUrl!, caption: topic.readText.figureCaption })}
              >
                <Image source={{ uri: topic.readText.figureUrl }} style={styles.figureImg} resizeMode="contain" />
                <View style={styles.zoomHint}>
                  <Feather name="maximize-2" size={11} color="#fff" />
                </View>
              </TouchableOpacity>
              {!!topic.readText.figureCaption && (
                <View style={[styles.captionBox, { borderColor: colors.accentYellow + '30', backgroundColor: colors.accentYellow + '10' }]}>
                  <Text style={[styles.captionText, { color: colors.textMain }]}>{topic.readText.figureCaption}</Text>
                </View>
              )}
            </View>
          ) : (() => {
            // Maths AI Tutor: no illustration — show the worked example being
            // taught, solved step-by-step on a "whiteboard" card that follows
            // the current tutor step. This is the AI explaining, not an image.
            const worked = (topic.readText as any).workedExamples as any[] | undefined;
            if (worked && worked.length > 0) {
              const ex = worked[Math.max(0, Math.min(worked.length - 1, listenStep - 1))];
              return (
                <View style={[styles.card, { borderColor: colors.accentGreen + '40', backgroundColor: colors.accentGreen + '0a' }]}>
                  <View style={styles.newWordHeader}>
                    <Feather name="edit-3" size={13} color={colors.accentGreen} />
                    <Text style={[styles.newWordLabel, { color: colors.accentGreen }]}>Let&apos;s solve it together</Text>
                  </View>
                  <Text style={[styles.whyText, { color: colors.textMain, fontWeight: '800', fontSize: 18, marginTop: 8 }]}>
                    {ex.problem}
                  </Text>
                  {(ex.steps || []).map((s: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Text style={{ color: colors.accentGreen, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
                      <Text style={[styles.whyText, { color: colors.textMuted, flex: 1 }]}>{s}</Text>
                    </View>
                  ))}
                  {ex.answer != null && (
                    <Text style={{ color: colors.accentGreen, fontWeight: '800', fontSize: 16, marginTop: 10 }}>= {ex.answer}</Text>
                  )}
                </View>
              );
            }
            // No picture exists for this lesson (senior-grade NCERT chapters
            // are often text-only). Render NOTHING rather than an empty grey
            // frame promising art that isn't coming — the placeholder read as
            // a broken page. The right pane still shows New Word etc.
            return null;
          })())}

          {!!word && (
            <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
              <View style={styles.newWordHeader}>
                <Feather name="book" size={13} color={colors.accentYellow} />
                <Text style={[styles.newWordLabel, { color: colors.accentYellow }]}>New Word</Text>
              </View>
              <View style={styles.newWordRow}>
                <Text style={[styles.newWordText, { color: colors.textMain }]}>{word.word}</Text>
                <TouchableOpacity
                  style={[styles.wordSpeakBtn, { backgroundColor: colors.accentGreen + '18' }]}
                  onPress={() => speakWithBoundary(word.word, () => {}, () => {})}
                  activeOpacity={0.7}
                >
                  <Feather name="volume-2" size={13} color={colors.accentGreen} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.newWordDef, { color: colors.textMuted }]}>{word.definition}</Text>
              <View style={styles.newWordFooter}>
                <TouchableOpacity style={styles.useInSentenceLink} activeOpacity={0.7}>
                  <Feather name="edit-3" size={12} color={colors.accentGreen} />
                  <Text style={[styles.useInSentenceText, { color: colors.accentGreen }]}>Use in a sentence</Text>
                </TouchableOpacity>
                <View style={styles.vocabNavRow}>
                  <Text style={[styles.vocabPageText, { color: colors.textMuted }]}>{vocabIndex + 1}/{vocab.length}</Text>
                  <TouchableOpacity onPress={() => setVocabIndex(i => Math.max(0, i - 1))} disabled={vocabIndex === 0}>
                    <Feather name="chevron-left" size={16} color={vocabIndex === 0 ? colors.borderColor : colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.vocabNavActive, { backgroundColor: colors.accentGreen + '18' }]}
                    onPress={() => setVocabIndex(i => Math.min(vocab.length - 1, i + 1))}
                    disabled={vocabIndex === vocab.length - 1}
                  >
                    <Feather name="chevron-right" size={16} color={colors.accentGreen} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Bottom bar: audiobook progress for Science/English, a
          step-notebook footer (Previous/Hint/Try Yourself/Next) for Math ── */}
      {!isMath && (
      <View style={[styles.listenBottomBar, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
        <View style={styles.listenBottomProgress}>
          <Feather name="headphones" size={13} color={colors.textMuted} />
          <Text style={[styles.listenBottomLabel, { color: colors.textMuted }]}>Listening Progress</Text>
          <View style={[styles.listenBottomTrack, { backgroundColor: colors.borderColor }]}>
            <View style={[styles.listenBottomFill, { backgroundColor: colors.accentGreen, width: `${(visitedSteps.size / Math.max(1, stepsCount ?? 1)) * 100}%` }]} />
          </View>
          <Text style={[styles.listenBottomCount, { color: colors.textMuted }]}>{listenStep + 1} of {stepsCount}</Text>
        </View>
        <View style={[styles.listenToast, { backgroundColor: colors.accentYellow + '16' }]}>
          <Feather name="star" size={12} color={colors.accentYellow} />
          <Text style={[styles.listenToastText, { color: colors.textMain }]}>Great! You are building strong listening skills.</Text>
        </View>
        {/* Step navigation now lives inline under the content (Math pattern).
            The footer keeps only the replay control so there is exactly ONE
            Previous/Next control on screen. */}
        <View style={styles.listenBottomActions}>
          <TouchableOpacity
            style={[styles.listenAgainBtn, { borderColor: colors.borderColor }]}
            onPress={repeatStep}
            activeOpacity={0.8}
          >
            <Feather name="rotate-ccw" size={13} color={colors.textMain} />
            <Text style={[styles.listenAgainText, { color: colors.textMain }]}>Listen Again</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {isMath && (
      <View style={[styles.mathFooter, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
        <View style={styles.mathActionGrid}>
          <TouchableOpacity
            style={[styles.mathActionChip, { borderColor: colors.borderColor }]}
            onPress={() => { setWhyOpen(() => false); setHintOpen(() => false); setExampleOpen(() => false); setExplainOpen(v => !v); }}
            activeOpacity={0.8}
          >
            <Feather name="zap" size={13} color={colors.primary} />
            <Text style={[styles.mathActionChipText, { color: colors.textMain }]}>Explain This Step</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mathActionChip, { borderColor: colors.borderColor }]}
            onPress={() => { setExplainOpen(() => false); setHintOpen(() => false); setExampleOpen(() => false); setWhyOpen(v => !v); }}
            activeOpacity={0.8}
          >
            <Feather name="help-circle" size={13} color={colors.accentYellow} />
            <Text style={[styles.mathActionChipText, { color: colors.textMain }]}>Why?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mathActionChip, { borderColor: colors.borderColor }]}
            onPress={() => { setExplainOpen(() => false); setWhyOpen(() => false); setExampleOpen(() => false); setHintOpen(v => !v); }}
            activeOpacity={0.8}
          >
            <Feather name="compass" size={13} color={colors.accentYellow} />
            <Text style={[styles.mathActionChipText, { color: colors.textMain }]}>Give Me a Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mathActionChip, { borderColor: colors.borderColor }]}
            onPress={() => { setExplainOpen(() => false); setWhyOpen(() => false); setHintOpen(() => false); setExampleOpen(v => !v); }}
            activeOpacity={0.8}
          >
            <Feather name="repeat" size={13} color={colors.accentGreen} />
            <Text style={[styles.mathActionChipText, { color: colors.textMain }]}>Show Another Example</Text>
          </TouchableOpacity>
        </View>
        {/* Try Yourself / Ask Aivorah — de-emphasized into one small link for now,
            not prominent buttons; the practice/chat experience needs real
            per-problem content before it deserves equal billing above. */}
        <TouchableOpacity onPress={() => setMode('practice')} activeOpacity={0.7}>
          <Text style={[styles.learnDeeperLink, { color: colors.textMuted }]}>Want to go deeper? Try a problem yourself, or ask Aivorah →</Text>
        </TouchableOpacity>
      </View>
      )}
    </View>
  );
}
