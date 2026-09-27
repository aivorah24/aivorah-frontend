import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { MathStep } from '../types';
import { boardColors } from '../utils/tutorTheme';

// Chalkboard for the Maths AI Tutor: the book's problem on top, then one working line per spoken step,
// revealed as the tutor reaches it. The answer appears once the last step has been spoken.
export default function MathBoard({ math, revealed, finished, colors }: { math: MathStep; revealed: number; finished: boolean; colors: AppColors }) {
  const board = boardColors(colors);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const upto = finished ? math.shows.length - 1 : revealed;
  const shown = math.shows.slice(0, upto + 1).map((s, i) => ({ s, i })).filter(({ s }) => s);
  return (
    <View testID="math-board" style={{ gap: 12 }}>
      <View style={{ backgroundColor: board.bg, borderWidth: 1.5, borderColor: board.border, borderRadius: 18, padding: 18, gap: 10 }}>
        <Text style={{ color: board.label, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>
          {math.page ? `FROM YOUR BOOK · PAGE ${math.page}` : 'PROBLEM'}
        </Text>
        <Text style={{ color: board.text, fontSize: 17, lineHeight: 25, fontWeight: '700' }}>{math.problem}</Text>
        <View style={{ height: 1, backgroundColor: board.rule }} />
        {shown.map(({ s, i }) => (
          <View key={i} testID={`board-line-${i}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', opacity: i === revealed && !finished ? 1 : 0.85 }}>
            <Text style={{ color: board.label, fontSize: 14, fontWeight: '800', width: 20 }}>{i + 1}</Text>
            <Text style={{ flex: 1, color: board.text, fontWeight: i === revealed && !finished ? '800' : '500', fontSize: 18, lineHeight: 26, fontFamily: 'monospace' }}>{s}</Text>
          </View>
        ))}
        {finished && (
          <View testID="board-answer" style={{ marginTop: 4, alignSelf: 'flex-start', backgroundColor: colors.accentYellow, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 }}>
            <Text style={{ color: colors.bgDark, fontSize: 16, fontWeight: '800' }}>Answer: {math.answer}</Text>
          </View>
        )}
      </View>

      {!!math.yourTurn && finished && (
        <View testID="your-turn" style={{ borderWidth: 1.5, borderColor: colors.accentYellow, borderRadius: 14, padding: 14, gap: 8, backgroundColor: colors.accentYellow + '10' }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Feather name="edit-3" size={14} color={colors.accentYellow} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.accentYellow }}>YOUR TURN</Text>
          </View>
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textMain }}>{math.yourTurn.question}</Text>
          {!!math.hint && (showHint
            ? <Text testID="your-turn-hint" style={{ fontSize: 14, lineHeight: 20, color: colors.textMain, fontStyle: 'italic' }}>Hint: {math.hint}</Text>
            : (
              <TouchableOpacity testID="show-hint" onPress={() => setShowHint(true)} style={{ alignSelf: 'flex-start' }}>
                <Text style={{ color: colors.accentYellow, fontWeight: '700', textDecorationLine: 'underline' }}>Need a hint?</Text>
              </TouchableOpacity>
            ))}
          {showAnswer
            ? <Text style={{ fontSize: 15, fontWeight: '800', color: colors.accentYellow }}>Answer: {math.yourTurn.answer}</Text>
            : (
              <TouchableOpacity testID="reveal-answer" onPress={() => setShowAnswer(true)} style={{ alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accentYellow }}>
                <Text style={{ color: colors.accentYellow, fontWeight: '700' }}>I have solved it — show the answer</Text>
              </TouchableOpacity>
            )}
        </View>
      )}
    </View>
  );
}

// Right-hand board for the tutor's opening step: the key idea on the chalkboard and the examples we will solve.
export function IntroBoard({ examples, onOpen, colors }: {
  intro?: string; examples: { index: number; title: string; problem: string; page?: number }[]; onOpen: (index: number) => void; colors: AppColors;
}) {
  return (
    <View testID="intro-board" style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6 }}>WE WILL SOLVE THESE FROM YOUR BOOK</Text>
      {examples.map((ex, n) => (
        <TouchableOpacity
          key={ex.index}
          testID={`intro-example-${n}`}
          onPress={() => onOpen(ex.index)}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1.5, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 14, padding: 12 }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentYellow, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.bgDark, fontWeight: '800' }}>{n + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.textMain }}>{ex.title}</Text>
            <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: colors.textMuted }}>{ex.problem}</Text>
            {!!ex.page && <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Book page {ex.page}</Text>}
          </View>
          <Feather name="play-circle" size={20} color={colors.accentYellow} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
