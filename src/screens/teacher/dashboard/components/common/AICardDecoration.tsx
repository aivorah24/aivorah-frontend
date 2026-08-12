import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

export default function AICardDecoration() {
  return (
    <Svg style={StyleSheet.absoluteFill as any} pointerEvents="none">
      <Ellipse cx="92%" cy="-10%" rx="120" ry="120" fill="rgba(255,255,255,0.06)" />
      <Ellipse cx="85%" cy="110%" rx="90" ry="90" fill="rgba(255,255,255,0.04)" />
      {Array.from({ length: 4 }).flatMap((_, r) =>
        Array.from({ length: 10 }).map((_, c) => (
          <Circle key={`${r}-${c}`} cx={c * 55 + 10} cy={r * 45 + 10} r={1.4} fill="rgba(255,255,255,0.07)" />
        ))
      )}
    </Svg>
  );
}
