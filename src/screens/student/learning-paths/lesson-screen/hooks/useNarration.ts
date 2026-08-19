import { useEffect, useMemo, useRef, useState } from 'react';
import { speakWithBoundary, stopSpeaking, sentencesWithOffsets } from '../utils/audio';
import type { ListenStep } from '../types';

// ── Sentence-by-sentence narration engine ────────────────────────────────
// Each SENTENCE is spoken as its own short utterance, then the engine
// advances to the next. This is the reliable, premium approach (Khan Kids /
// Read-Along style): pause/resume never desync, the highlighted line is
// exact (we drive it), seeking maps to whole lines, and pauses fall only at
// punctuation — no robotic word-by-word gaps. `sentenceIdx` is the single
// source of truth for which line is active.
export function useNarration(listenSteps: ListenStep[], isPoem: boolean) {
  const [listenStep, setListenStep] = useState(0);
  const [listenPlaying, setListenPlaying] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [clockTick, setClockTick] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  const playSeqRef = useRef(0); // token invalidates stale onEnd callbacks
  const listenSentencesRef = useRef<ReturnType<typeof sentencesWithOffsets>>([]);
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const isPoemRef = useRef(isPoem);
  isPoemRef.current = isPoem;
  const sentenceYRef = useRef<Record<number, number>>({});
  const leftScrollRef = useRef<any>(null);

  const currentListenStep = listenSteps[listenStep];
  const listenSentences = useMemo(
    () => (currentListenStep ? sentencesWithOffsets(currentListenStep.text) : []),
    [currentListenStep],
  );
  listenSentencesRef.current = listenSentences;

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
        setListenPlaying(false);
        setVisitedSteps(prev => new Set(prev).add(listenStep));
        return;
      }
      setSentenceIdx(i);
      speakWithBoundary(
        sents[i].sentence.trim(),
        () => {}, // highlight is line-level, not word-level
        () => {
          if (seq !== playSeqRef.current) return;
          // Poem cadence: a short breath between lines; prose flows straight on.
          if (isPoemRef.current) setTimeout(() => { if (seq === playSeqRef.current) speakIdx(i + 1); }, 450);
          else speakIdx(i + 1);
        },
        playbackRateRef.current,
      );
    };
    speakIdx(clamped);
  }

  function stopNarration() {
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

  useEffect(() => () => { playSeqRef.current++; stopSpeaking(); }, []);

  return {
    listenStep, listenPlaying, sentenceIdx, visitedSteps, clockTick,
    playbackRate, speedMenuOpen, setSpeedMenuOpen,
    currentListenStep, listenSentences,
    sentenceYRef, leftScrollRef,
    speakFromSentence, stopNarration, playListenStep, toggleListenPlay,
    repeatStep, goToListenStep, skipBy, changePlaybackRate, resetNarration,
  };
}
