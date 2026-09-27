import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { ListenStep } from '../types';
import { boardColors } from '../utils/tutorTheme';

// The left side of the Maths AI Tutor: one numbered card per step, matching the board's line numbers. The step being
// read glows, finished steps get a tick, and a step's working stays hidden ("?") until the tutor reaches it.
export default function TutorSteps({ step, current, started, finished, playing, fontLarge, onLayoutStep, colors }: {
  step: ListenStep; current: number; started: boolean; finished: boolean; playing: boolean; fontLarge: boolean;
  onLayoutStep: (i: number, y: number) => void; colors: AppColors;
}) {
  const board = boardColors(colors);
  const lines = step.lines || [];
  const math = step.math;

  if (!math) {
    return (
      <View testID="tutor-intro" style={{ marginHorizontal: 24, gap: 12 }}>
        {!!step.keyIdea && (
          <View style={{ backgroundColor: board.bg, borderWidth: 1.5, borderColor: board.border, borderRadius: 14, padding: 14 }}>
            <Text style={{ color: board.label, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8 }}>TODAY&apos;S BIG IDEA</Text>
            <Text style={{ color: board.text, fontSize: fontLarge ? 20 : 17.5, lineHeight: fontLarge ? 28 : 25, fontWeight: '700', marginTop: 4 }}>{step.keyIdea}</Text>
          </View>
        )}
        {lines.map((l, i) => (
          <View key={i} onLayout={(e) => onLayoutStep(i, e.nativeEvent.layout.y)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Feather name="message-circle" size={18} color={colors.accentYellow} style={{ marginTop: 3 }} />
            <Text style={{ flex: 1, fontSize: fontLarge ? 18 : 16, lineHeight: fontLarge ? 28 : 25, color: colors.textMain }}>{l.text}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View testID="tutor-steps" style={{ marginHorizontal: 24, gap: 10 }}>
      <View style={{ backgroundColor: colors.cardDark, borderRadius: 14, borderWidth: 1, borderColor: colors.borderColor, padding: 12, gap: 4 }}>
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6 }}>THE PROBLEM</Text>
        <Text style={{ fontSize: fontLarge ? 18 : 16, lineHeight: fontLarge ? 27 : 24, fontWeight: '700', color: colors.textMain }}>{math.problem}</Text>
      </View>

      {lines.map((l, i) => {
        const done = finished || (started && i < current);
        const now = !finished && started && i === current;
        const reached = done || now;
        const work = math.shows[i];
        return (
          <View
            key={i}
            testID={`tutor-step-${i}`}
            accessibilityState={{ selected: now }}
            onLayout={(e) => onLayoutStep(i, e.nativeEvent.layout.y)}
            style={{
              flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: now ? 2 : 1,
              borderColor: now ? colors.accentYellow : colors.borderColor,
              backgroundColor: now ? colors.accentYellow + '14' : colors.cardDark,
              opacity: reached || !started ? 1 : 0.6,
            }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done || now ? colors.accentYellow : colors.borderColor }}>
              {done
                ? <Feather name="check" size={16} color={colors.bgDark} />
                : <Text style={{ color: now ? colors.bgDark : colors.textMain, fontWeight: '800', fontSize: 14 }}>{i + 1}</Text>}
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Text style={{ flex: 1, fontSize: fontLarge ? 18 : 15.5, lineHeight: fontLarge ? 27 : 23, color: colors.textMain, fontWeight: now ? '600' : '400' }}>{l.text}</Text>
                {now && playing && <Feather name="volume-2" size={16} color={colors.accentYellow} style={{ marginTop: 3 }} />}
              </View>
              {!!work && (reached
                ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accentYellow + '1f', borderWidth: 1, borderColor: colors.accentYellow + '55', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 }}>
                    <Text style={{ color: colors.accentYellow, fontWeight: '700', fontFamily: 'monospace', fontSize: fontLarge ? 17 : 15 }}>{work}</Text>
                  </View>
                ) : started ? (
                  <View style={{ alignSelf: 'flex-start', borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.textMuted, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 }}>
                    <Text style={{ color: colors.textMuted, fontWeight: '700' }}>? think first</Text>
                  </View>
                ) : null)}
            </View>
          </View>
        );
      })}

      {finished && (
        <View testID="tutor-answer" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.accentYellow }}>
          <Feather name="award" size={18} color={colors.bgDark} />
          <Text style={{ color: colors.bgDark, fontSize: 16, fontWeight: '800' }}>Answer: {math.answer}</Text>
        </View>
      )}
    </View>
  );
}
