import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, AccessibilityInfo, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { ChainCard } from '../utils/listenFromBlocks';
import { bookSrc } from '../utils/book';
import type { SceneVisual as Visual } from '../types';
import SceneVisual from './SceneVisual';

const PALETTE = ['#4C8FD6', '#D65C5C', '#B07A10', '#7A5CC8', '#2E8B5A', '#C2578F', '#3B8EA5'];

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.resolve(AccessibilityInfo?.isReduceMotionEnabled?.()).then((v) => { if (live) setReduce(!!v); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return reduce;
}

function ChainCardView({ card, index, active, done, reduceMotion, colors }: {
  card: ChainCard; index: number; active: boolean; done: boolean; reduceMotion: boolean; colors: AppColors;
}) {
  const accent = PALETTE[index % PALETTE.length];
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!active) { Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start(); return undefined; }
    if (reduceMotion) { scale.setValue(1.02); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.035, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, scale]);

  return (
    <Animated.View
      testID={`chain-card-${index}`}
      accessible
      accessibilityLabel={`Step ${index + 1}, ${card.label}: ${card.text}${active ? '. Now playing' : ''}`}
      accessibilityState={{ selected: active }}
      style={{
        transform: [{ scale }],
        opacity: active ? 1 : done ? 0.85 : 0.6,
        borderRadius: 16,
        borderWidth: active ? 3 : 1.5,
        borderColor: accent,
        backgroundColor: active ? accent + '22' : colors.cardDark,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
        {done && !active
          ? <Feather name="check" size={18} color="#fff" />
          : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{index + 1}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: accent, fontWeight: '800', fontSize: 15, marginBottom: 2 }}>{card.label}</Text>
        <Text style={{ color: colors.textMain, fontSize: 14.5, lineHeight: 21 }}>{card.text}</Text>
      </View>
    </Animated.View>
  );
}

type BoardView = 'visual' | 'chain' | 'book';

function BoardTab({ id, label, icon, view, setView, colors }: {
  id: BoardView; label: string; icon: any; view: BoardView; setView: (v: BoardView) => void; colors: AppColors;
}) {
  const on = view === id;
  return (
    <TouchableOpacity
      testID={`board-tab-${id}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={() => setView(id)}
      activeOpacity={0.85}
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 9, borderRadius: 12, borderWidth: 1.5,
        borderColor: on ? colors.primary : colors.borderColor,
        backgroundColor: on ? colors.primary + '1f' : colors.cardDark,
      }}
    >
      <Feather name={icon} size={14} color={on ? colors.primary : colors.textMuted} />
      <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.primary : colors.textMuted }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Right-hand board for the Listen tab: follows the audio. `activeCard` is derived from the current listen step
// (see buildReasoningListen); null means the narration is on an intro / book excerpt / key words step.
export default function ListenVisualBoard({ cards, activeCard, bookQuote, bookPage, followsBook, sceneVisual, hasVisuals, topic, grade, subject, colors }: {
  cards: ChainCard[]; activeCard: number | null; bookQuote?: string; bookPage?: number; followsBook?: boolean;
  sceneVisual?: Visual; hasVisuals?: boolean; topic: any; grade: string; subject: string; colors: AppColors;
}) {
  const initial: BoardView = hasVisuals ? 'visual' : followsBook ? 'book' : 'chain';
  const [view, setView] = useState<BoardView>(initial);
  const reduceMotion = useReduceMotion();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the tab when the lesson's content changes
  useEffect(() => { setView(initial); }, [initial]);
  const reached = activeCard ?? -1;

  return (
    <View testID="listen-visual-board" style={{ gap: 12 }}>
      {(cards.length > 0 || hasVisuals) && (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
          {hasVisuals && <BoardTab view={view} setView={setView} colors={colors} id="visual" label="See It" icon="image" />}
          {cards.length > 0 && <BoardTab view={view} setView={setView} colors={colors} id="chain" label="Visual Logic Chain" icon="git-commit" />}
          <BoardTab view={view} setView={setView} colors={colors} id="book" label="Book Follow-Along" icon="book-open" />
        </View>
      )}

      {view === 'visual' && hasVisuals ? (
        sceneVisual
          ? <SceneVisual visual={sceneVisual} colors={colors} />
          : <Text style={{ fontSize: 13, color: colors.textMuted }}>This part has no picture. Open Book Follow-Along to read along.</Text>
      ) : view === 'chain' && cards.length > 0 ? (
        <View style={{ gap: 6 }}>
          {cards.map((c, i) => (
            <React.Fragment key={i}>
              <ChainCardView card={c} index={i} active={i === activeCard} done={i < reached} reduceMotion={reduceMotion} colors={colors} />
              {i < cards.length - 1 && (
                <View style={{ alignItems: 'center' }}>
                  <Feather name="arrow-down" size={16} color={colors.textMuted} />
                </View>
              )}
            </React.Fragment>
          ))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {followsBook && cards.length > 0 && (
            <View testID="clue-strip" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {cards.map((c, i) => {
                const accent = PALETTE[i % PALETTE.length];
                const on = i === activeCard;
                return (
                  <View key={i} accessibilityState={{ selected: on }} style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: accent, backgroundColor: on ? accent + '30' : 'transparent', opacity: on || i < reached ? 1 : 0.55 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: accent }}>{i + 1}. {c.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {!!bookQuote && (
            <View
              testID="book-follow-quote"
              style={{ borderLeftWidth: 5, borderLeftColor: '#E0A030', backgroundColor: '#E0A03026', borderRadius: 12, padding: 12 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#8A5A00', marginBottom: 4 }}>
                {activeCard !== null ? 'Now reading in the book' : 'From the book'}
                {(bookPage || topic?.pdfPage) ? ` · page ${bookPage || topic.pdfPage}` : ''}
              </Text>
              <Text style={{ fontSize: 14.5, lineHeight: 22, color: colors.textMain }}>{bookQuote}</Text>
            </View>
          )}
          {Platform.OS === 'web' && topic?.pdfFile ? (
            <View style={{ height: 640, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderColor }}>
              {React.createElement('iframe', {
                key: bookPage || topic.pdfPage || 1,
                src: `${bookSrc(topic, grade, subject)}#page=${bookPage || topic.pdfPage || 1}&view=FitH&navpanes=0&pagemode=none`,
                style: { border: 'none', width: '100%', height: '100%', backgroundColor: colors.cardDark },
                title: `${topic.name} — textbook page`,
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Open the Learn tab to read this page of the textbook.</Text>
          )}
        </View>
      )}
    </View>
  );
}
