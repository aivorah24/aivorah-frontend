import React from 'react';
import Svg, { Rect, Circle } from 'react-native-svg';

export function IndiaFlagIcon() {
  return (
    <Svg width={18} height={12} viewBox="0 0 18 12">
      <Rect x={0} y={0} width={18} height={4} fill="#FF9933" />
      <Rect x={0} y={4} width={18} height={4} fill="#FFFFFF" />
      <Rect x={0} y={8} width={18} height={4} fill="#138808" />
      <Circle cx={9} cy={6} r={1.6} fill="none" stroke="#000088" strokeWidth={0.3} />
      <Circle cx={9} cy={6} r={0.3} fill="#000088" />
    </Svg>
  );
}
