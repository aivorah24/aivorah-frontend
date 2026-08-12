import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';

export default function DonutChart({ progress = 0, size = 88, color = '#6366f1', trackColor = 'rgba(255,255,255,0.12)' }: {
  progress?: number; size?: number; color?: string; trackColor?: string;
}) {
  const strokeWidth = 9;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(progress, 1));
  const cx = size / 2;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <G transform={`rotate(-90 ${cx} ${cx})`}>
        <Circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={offset} />
      </G>
    </Svg>
  );
}
