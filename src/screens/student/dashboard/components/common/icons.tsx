import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';

/** Decorative dots pattern for hero */
export function HeroDots() {
  const dots: React.ReactElement[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 12; c++)
      dots.push(<Circle key={`${r}-${c}`} cx={c * 36 + 10} cy={r * 36 + 10} r={1.6} fill="rgba(255,255,255,0.14)" />);
  return <Svg style={StyleSheet.absoluteFill as any} pointerEvents="none">{dots}</Svg>;
}

/** Ring progress chart */
export function RingChart({ progress, color, size = 72, stroke = 8, track = 'rgba(0,0,0,0.1)' }: {
  progress: number; color: string; size?: number; stroke?: number; track?: string;
}) {
  const cx = size / 2, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(progress, 0), 1));
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <G transform={`rotate(-90 ${cx} ${cx})`}>
        <Circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={offset} />
      </G>
    </Svg>
  );
}

/** SVG Bar Chart for performance */
export function PerformanceBarChart({ topics, color, isDark }: { topics: { label: string; pct: number }[]; color: string; isDark: boolean }) {
  const barW = 28, gap = 14, h = 90, labelH = 32;
  const totalW = topics.length * (barW + gap);
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  return (
    <Svg width={totalW} height={h + labelH} style={{ marginTop: 4 }}>
      {topics.map((t, i) => {
        const barH = Math.max((t.pct / 100) * h, 4);
        const x = i * (barW + gap);
        const y = h - barH;
        return (
          <G key={i}>
            <Rect x={x} y={0} width={barW} height={h} rx={8} fill={trackColor} />
            <Rect x={x} y={y} width={barW} height={barH} rx={8} fill={color} opacity={0.85 + (i % 2) * 0.15} />
            <Svg x={x} y={h + 6} width={barW} height={26}>
              <G>
                <Rect width={barW} height={26} fill="none" />
              </G>
            </Svg>
          </G>
        );
      })}
    </Svg>
  );
}

/** Flame for streak */
export function FlameIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 20 25">
      <Path d="M10 0C8 3.5 5 7.5 5 12.5C5 17 7.2 20 10 20C12.8 20 15 17 15 12.5C15 7.5 12 3.5 10 0Z" fill="#BAA467" />
      <Path d="M10 6.5C9 9 7.5 11 7.5 13.5C7.5 15.5 8.5 17 10 17C11.5 17 12.5 15.5 12.5 13.5C12.5 11 11 9 10 6.5Z" fill="#D4BE7E" />
    </Svg>
  );
}
