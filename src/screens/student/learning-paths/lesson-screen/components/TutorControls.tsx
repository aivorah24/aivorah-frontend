import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { ListenStep } from '../types';

// Example tabs for the Maths AI Tutor: Start, Example 1, 2, 3 ... with a tick once an example has been heard to the end.
export function ExampleTabs({ steps, current, completed, onOpen, colors }: {
  steps: ListenStep[]; current: number; completed: Set<number>; onOpen: (i: number) => void; colors: AppColors;
}) {
  const labels: string[] = [];
  let n = 0;
  for (const st of steps) labels.push(st.math ? `Example ${(n += 1)}` : 'Start');
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 24, marginTop: 4, marginBottom: 8 }}>
      {steps.map((_, i) => {
        const label = labels[i];
        const on = i === current;
        const done = completed.has(i);
        return (
          <TouchableOpacity
            key={i}
            testID={`tutor-tab-${i}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onOpen(i)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1.5,
              borderColor: on ? colors.accentYellow : colors.borderColor, backgroundColor: on ? colors.accentYellow + '1f' : colors.cardDark,
            }}
          >
            {done && <Feather name="check-circle" size={13} color={colors.accentYellow} />}
            <Text style={{ fontSize: 13, fontWeight: on ? '800' : '600', color: on ? colors.accentYellow : colors.textMain }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// One Play/Pause control, then - once the example has been heard - why the method works and a single next action.
export function TutorControls({ step, isLast, nextLabel, playing, finished, onPlay, onReplay, onNext, onPractice, colors }: {
  step?: ListenStep; isLast: boolean; nextLabel: string; playing: boolean; finished: boolean;
  onPlay: () => void; onReplay: () => void; onNext: () => void; onPractice: () => void; colors: AppColors;
}) {
  const playLabel = playing ? 'Pause' : finished ? 'Play again' : step?.math ? 'Play this example' : 'Play';
  return (
    <View style={{ marginHorizontal: 24, marginTop: 16, gap: 14 }}>
      <TouchableOpacity
        testID="tutor-play"
        onPress={finished && !playing ? onReplay : onPlay}
        activeOpacity={0.85}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.accentYellow }}
      >
        <Feather name={playing ? 'pause' : finished ? 'rotate-ccw' : 'play'} size={16} color={colors.bgDark} />
        <Text style={{ color: colors.bgDark, fontWeight: '800', fontSize: 14.5 }}>{playLabel}</Text>
      </TouchableOpacity>

      {finished && !!step?.math?.why && (
        <View testID="tutor-why" style={{ borderLeftWidth: 4, borderLeftColor: colors.accentYellow, backgroundColor: colors.accentYellow + '14', borderRadius: 10, padding: 12, gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accentYellow, letterSpacing: 0.5 }}>WHY THIS WORKS</Text>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.textMain }}>{step.math.why}</Text>
        </View>
      )}

      {(finished || !step?.math) && (
        <TouchableOpacity
          testID="tutor-next"
          onPress={isLast ? onPractice : onNext}
          activeOpacity={0.85}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 24, borderWidth: 2, borderColor: colors.accentYellow }}
        >
          <Text style={{ color: colors.accentYellow, fontWeight: '800', fontSize: 14.5 }}>{isLast ? 'Practise this topic' : nextLabel}</Text>
          <Feather name="arrow-right" size={15} color={colors.accentYellow} />
        </TouchableOpacity>
      )}

    </View>
  );
}
