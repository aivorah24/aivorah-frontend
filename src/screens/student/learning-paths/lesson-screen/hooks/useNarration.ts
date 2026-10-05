import { useEffect, useMemo, useRef, useState } from 'react';
import { speakWithBoundary, playClip, stopSpeaking, sentencesWithOffsets } from '../utils/audio';
import { profileFor } from '../utils/playVoices';
import { splitWords, buildBoundaries } from '../../../../../utils/wordTiming';
import type { ListenStep, PlayLine } from '../types';

export type NarrationLine = ReturnType<typeof sentencesWithOffsets>[number] & { line?: PlayLine };

// ── Sentence-by-sentence narration engine ────────────────────────────────
// Each SENTENCE is spoken as its own short utterance, then the engine
// advances to the next. This is the reliable, premium approach (Khan Kids /
// Read-Along style): pause/resume never desync, the highlighted line is
// exact (we drive it), seeking maps to whole lines, and pauses fall only at
// punctuation — no robotic word-by-word gaps. `sentenceIdx` is the single
// source of truth for which line is active.
export function useNarration(listenSteps: ListenStep[], isPoem: boolean, lang?: string) {
  const [listenStep, setListenStep] = useState(0);
  const [listenPlaying, setListenPlaying] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [clockTick, setClockTick] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  const playSeqRef = useRef(0); // token invalidates stale onEnd callbacks
  const listenSentencesRef = useRef<NarrationLine[]>([]);
  const playbackRateRef = useRef(playbackRate);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const isPoemRef = useRef(isPoem);
  useEffect(() => { isPoemRef.current = isPoem; }, [isPoem]);
  const sentenceYRef = useRef<Record<number, number>>({});
  const leftScrollRef = useRef<any>(null);

  const currentListenStep = listenSteps[listenStep];
  // A play step is spoken one character line at a time; anything else one sentence at a time.
  const listenSentences: NarrationLine[] = useMemo(() => {
    if (!currentListenStep) return [];
    if (currentListenStep.lines?.length) {
      return currentListenStep.lines.map((line) => ({ sentence: line.text, start: 0, end: line.text.length, line }));
    }
    return sentencesWithOffsets(currentListenStep.text);
  }, [currentListenStep]);
  useEffect(() => { listenSentencesRef.current = listenSentences; }, [listenSentences]);
  const listenStepRef = useRef(0);
  useEffect(() => { listenStepRef.current = listenStep; }, [listenStep]);

  // Speak sentence `idx` of the current step, then chain to the next.
  function speakFromSentence(idx: number) {
    const sents = listenSentencesRef.current;
    if (!sents.length) return;
    const clamped = Math.max(0, Math.min(sents.length - 1, idx));
    const seq = ++playSeqRef.current; // start a fresh sequence
    setSentenceIdx(clamped);
    setListenPlaying(true);
    const speakIdx = (i: number) => {
      if (seq !== playSeqRef.current) return; // superseded — stop
      if (i >= sents.length) { // reached the end
        const stepNow = listenStepRef.current;
        setVisitedSteps(prev => new Set(prev).add(stepNow));
        setCompletedSteps(prev => new Set(prev).add(stepNow));
        // A play carries on into its next scene by itself; the maths tutor stops so the student can try the problem.
        if (sents[0]?.line && sents[0].line.speaker !== 'Tutor' && stepNow + 1 < listenSteps.length) {
          setTimeout(() => { if (seq === playSeqRef.current) playListenStep(stepNow + 1); }, 900);
          return;
        }
        setListenPlaying(false);
        return;
      }
      setSentenceIdx(i);
      const line = sents[i].line;
      const text = sents[i].sentence.trim();
      const follow = followWords(text, seq);
      const next = () => {
        if (seq !== playSeqRef.current) return;
        clearWordTimer();
        // Poem cadence: a short breath between lines; a play pauses for the change of speaker.
        const gap = line ? (line.stage ? 500 : 350) : isPoemRef.current ? 450 : 0;
        if (gap) setTimeout(() => { if (seq === playSeqRef.current) speakIdx(i + 1); }, gap);
        else speakIdx(i + 1);
      };
      const browserVoice = () => speakWithBoundary(
        text,
        follow,
        next,
        playbackRateRef.current,
        { ...(line ? profileFor(line.speaker, line.stage ? undefined : line.direction) : {}), ...(langRef.current && langRef.current !== 'en' ? { lang: langRef.current } : {}) },
      );
      // A recorded, acted line plays as-is; if it cannot play, the browser voice reads it instead.
      if (!(line?.audio && playClip(line.audio, playbackRateRef.current, next, () => { if (seq === playSeqRef.current) browserVoice(); }))) browserVoice();
    };
    speakIdx(clamped);
  }

  function clearWordTimer() {
    if (wordTimerRef.current) { clearInterval(wordTimerRef.current); wordTimerRef.current = null; }
  }

  // Word-by-word highlight (same weighting as the bedtime-story reader). The voice's word
  // boundaries drive it; voices that send none fall back to an estimate of where the speech is.
  function followWords(text: string, seq: number) {
    clearWordTimer();
    const tokens = splitWords(text);
    const starts: number[] = [];
    let at = 0;
    for (const t of tokens) { starts.push(at); at += t.length; }
    const bounds = buildBoundaries(tokens);
    const estMs = tokens.length * 400 / (playbackRateRef.current || 1);
    const t0 = Date.now();
    let fromVoice = false;
    setWordIdx(0);
    wordTimerRef.current = setInterval(() => {
      if (seq !== playSeqRef.current || fromVoice) { clearWordTimer(); return; }
      const ratio = (Date.now() - t0) / estMs;
      const found = bounds.findIndex((b) => ratio < b);
      setWordIdx(found === -1 ? tokens.length - 1 : found);
    }, 100);
    return (charIndex: number) => {
      if (seq !== playSeqRef.current) return;
      fromVoice = true;
      let idx = 0;
      while (idx + 1 < starts.length && starts[idx + 1] <= charIndex) idx += 1;
      setWordIdx(idx);
    };
  }

  function stopNarration() {
    clearWordTimer();
    playSeqRef.current++; // invalidate any pending onEnd
    stopSpeaking();
    setListenPlaying(false);
  }

  function playListenStep(i: number) {
    if (!listenSteps[i]) return;
    stopNarration();
    setListenStep(i);
    setSentenceIdx(0);
    setVisitedSteps(prev => new Set(prev).add(i));
    // let the new step's sentences settle into the ref before speaking
    setTimeout(() => speakFromSentence(0), 0);
  }

  function toggleListenPlay() {
    if (listenPlaying) {
      stopNarration(); // clean pause — no desync
    } else {
      speakFromSentence(sentenceIdx); // resume from current line
    }
  }

  function repeatStep() {
    stopNarration();
    setSentenceIdx(0);
    setTimeout(() => speakFromSentence(0), 0);
  }

  function goToListenStep(i: number, onNavigate?: () => void) {
    if (i < 0 || i >= listenSteps.length) return;
    stopNarration();
    setListenStep(i);
    setSentenceIdx(0);
    setVisitedSteps(prev => new Set(prev).add(i));
    onNavigate?.();
  }

  // Previous / Next line (wired to the ⟲10 / ⟳10 transport buttons). Jumping
  // by whole sentences is accurate and meaningful for a Grade-1 reader, unlike
  // the old proportional char-offset guess the Web Speech API forced.
  function skipBy(deltaSec: number) {
    const sents = listenSentencesRef.current;
    if (!sents.length) return;
    const target = Math.max(0, Math.min(sents.length - 1, sentenceIdx + (deltaSec < 0 ? -1 : 1)));
    if (listenPlaying) speakFromSentence(target);
    else setSentenceIdx(target);
  }

  function changePlaybackRate(nextRate: number) {
    setPlaybackRate(nextRate);
    playbackRateRef.current = nextRate;
    if (listenPlaying) speakFromSentence(sentenceIdx); // restart current line at new rate
  }

  function resetNarration() {
    playSeqRef.current++;
    stopSpeaking();
    setListenPlaying(false);
    setListenStep(0);
    setSentenceIdx(0);
    setVisitedSteps(new Set([0]));
    setCompletedSteps(new Set());
  }

  // Ticks every 200ms while a part is actually playing, so the elapsed-time
  // readout moves in real time instead of only updating on word boundaries.
  useEffect(() => {
    if (!listenPlaying) return;
    const id = setInterval(() => setClockTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, [listenPlaying]);

  // Auto-scrolls the passage so the sentence being read stays in view, the
  // same "keep the current line ~1/3 down" behaviour as the bedtime-story
  // Read Along screen.
  useEffect(() => { sentenceYRef.current = {}; }, [listenStep]);
  useEffect(() => {
    if (!listenPlaying) return;
    const y = sentenceYRef.current[sentenceIdx];
    if (y == null) return;
    const target = Math.max(0, y - 130);
    leftScrollRef.current?.scrollTo?.({ y: target, animated: true });
  }, [sentenceIdx, listenPlaying]);

  useEffect(() => () => { playSeqRef.current++; clearWordTimer(); stopSpeaking(); }, []);

  return {
    listenStep, listenPlaying, sentenceIdx, wordIdx, visitedSteps, completedSteps, clockTick,
    playbackRate, speedMenuOpen, setSpeedMenuOpen,
    currentListenStep, listenSentences,
    sentenceYRef, leftScrollRef,
    speakFromSentence, stopNarration, playListenStep, toggleListenPlay,
    repeatStep, goToListenStep, skipBy, changePlaybackRate, resetNarration,
  };
}
