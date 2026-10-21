import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line, Rect, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

// Categorical slots from the validated dataviz reference palette (fixed order, never cycled).
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
export const OTHER_GRAY = '#9a9893';
export const seriesColor = (i: number, dark?: boolean) => (dark ? SERIES_DARK : SERIES_LIGHT)[i] ?? OTHER_GRAY;

export interface ChartInk { text: string; muted: string; grid: string; surface: string }

function useWidth(initial = 0) {
  const [w, setW] = useState(initial);
  return { w, onLayout: (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width)) };
}

// "Nice" upper bound for an axis so gridlines land on round numbers.
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function Sparkline({ values, color, width = 120, height = 32 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - (v / max) * (height - 4)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = `spark${color.replace('#', '')}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

// Full-width area sparkline (KPI card footer): flat tinted area + 2px line, scaled min→max.
export function AreaSpark({ values, color, height = 46 }: { values: number[]; color: string; height?: number }) {
  const { w, onLayout } = useWidth();
  const pad = 4;
  let shape: { line: string; area: string } | null = null;
  if (w > 0 && values.length > 1) {
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - pad - ((v - mn) / (mx - mn || 1)) * (height - pad * 2)]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    shape = { line, area: `${line} L${w},${height} L0,${height} Z` };
  }
  return (
    <View style={{ height }} onLayout={onLayout}>
      {shape && (
        <Svg width={w} height={height}>
          <Path d={shape.area} fill={color} opacity={0.14} />
          <Path d={shape.line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

interface Point { label: string; value: number }

const PAD = { top: 10, right: 8, bottom: 22, left: 44 };

const TICKS = [0, 0.25, 0.5, 0.75, 1];

function GridLines({ w, h, ink }: { w: number; h: number; ink: ChartInk }) {
  const plotH = h - PAD.top - PAD.bottom;
  return (
    <>
      {TICKS.map((t) => {
        const y = PAD.top + plotH * (1 - t);
        return <Line key={t} x1={PAD.left} x2={w - PAD.right} y1={y} y2={y} stroke={ink.grid} strokeWidth={1} />;
      })}
    </>
  );
}

function AxisLabels({ w, h, max, ink, format, labels }: { w: number; h: number; max: number; ink: ChartInk; format: (v: number) => string; labels: string[] }) {
  const plotH = h - PAD.top - PAD.bottom;
  const plotW = w - PAD.left - PAD.right;
  const step = Math.max(1, Math.ceil(labels.length / 6));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {TICKS.map((t) => (
        <Text key={t} style={[s.yLabel, { color: ink.muted, top: PAD.top + plotH * (1 - t) - 7 }]}>{format(max * t)}</Text>
      ))}
      {labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? (
        <Text key={l + i} style={[s.xLabel, { color: ink.muted, left: PAD.left + plotW * (labels.length === 1 ? 0.5 : i / (labels.length - 1)) - 24 }]}>{l}</Text>
      ) : null))}
    </View>
  );
}

function Tooltip({ x, w, title, value, ink }: { x: number; w: number; title: string; value: string; ink: ChartInk }) {
  const left = Math.min(Math.max(x - 60, 0), w - 120);
  return (
    <View pointerEvents="none" style={[s.tooltip, { left, backgroundColor: ink.surface, borderColor: ink.grid }]}>
      <Text style={[s.tipTitle, { color: ink.muted }]}>{title}</Text>
      <Text style={[s.tipValue, { color: ink.text }]}>{value}</Text>
    </View>
  );
}

// Invisible per-point hit columns: hover on web, press on touch.
function HitColumns({ n, w, onActive, testID }: { n: number; w: number; onActive: (i: number | null) => void; testID: string }) {
  const plotW = w - PAD.left - PAD.right;
  const colW = plotW / Math.max(n, 1);
  return (
    <View style={[StyleSheet.absoluteFill, { left: PAD.left, right: PAD.right, flexDirection: 'row' }]}>
      {Array.from({ length: n }, (_, i) => (
        <Pressable
          key={i}
          testID={`${testID}-hit-${i}`}
          style={{ width: colW, height: '100%' }}
          onHoverIn={() => onActive(i)}
          onHoverOut={() => onActive(null)}
          onPressIn={() => onActive(i)}
        />
      ))}
    </View>
  );
}

export function AreaChart({ points, color, ink, format, height = 220, testID = 'area' }: {
  points: Point[]; color: string; ink: ChartInk; format: (v: number) => string; height?: number; testID?: string;
}) {
  const { w, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const plotW = w - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const xy = points.map((p, i) => [
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW),
    PAD.top + plotH * (1 - p.value / max),
  ]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const base = PAD.top + plotH;
  return (
    <View style={{ height }} onLayout={onLayout} testID={testID}>
      {w > 0 && points.length > 0 && (
        <>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={`${testID}-fill`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.18} />
                <Stop offset="1" stopColor={color} stopOpacity={0.08} />
              </LinearGradient>
            </Defs>
            <GridLines w={w} h={height} ink={ink} />
            <Path d={`${line} L${xy[xy.length - 1][0]},${base} L${xy[0][0]},${base} Z`} fill={`url(#${testID}-fill)`} />
            <Path d={line} stroke={color} strokeWidth={2.3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {active != null && (
              <G>
                <Line x1={xy[active][0]} x2={xy[active][0]} y1={PAD.top} y2={base} stroke={ink.muted} strokeWidth={1} strokeDasharray="3 3" />
                <Circle cx={xy[active][0]} cy={xy[active][1]} r={5} fill={ink.surface} stroke={color} strokeWidth={2.5} />
              </G>
            )}
          </Svg>
          <AxisLabels w={w} h={height} max={max} ink={ink} format={format} labels={points.map((p) => p.label)} />
          <HitColumns n={points.length} w={w} onActive={setActive} testID={testID} />
          {active != null && <Tooltip x={xy[active][0]} w={w} title={points[active].label} value={format(points[active].value)} ink={ink} />}
        </>
      )}
    </View>
  );
}

export function BarChart({ points, color, ink, format, height = 220, testID = 'bars' }: {
  points: Point[]; color: string; ink: ChartInk; format: (v: number) => string; height?: number; testID?: string;
}) {
  const { w, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const plotW = w - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(points.length, 1);
  const barW = Math.max(2, Math.min(18, slot - 2)); // 2px surface gap between bars
  return (
    <View style={{ height }} onLayout={onLayout} testID={testID}>
      {w > 0 && (
        <>
          <Svg width={w} height={height}>
            <GridLines w={w} h={height} ink={ink} />
            {points.map((p, i) => {
              const bh = (p.value / max) * plotH;
              const x = PAD.left + i * slot + (slot - barW) / 2;
              return bh > 0 ? (
                <Rect key={i} x={x} y={PAD.top + plotH - bh} width={barW} height={bh} rx={Math.min(4, barW / 2)}
                  fill={color} opacity={active == null || active === i ? 1 : 0.45} />
              ) : null;
            })}
          </Svg>
          <AxisLabels w={w} h={height} max={max} ink={ink} format={format} labels={points.map((p) => p.label)} />
          <HitColumns n={points.length} w={w} onActive={setActive} testID={testID} />
          {active != null && <Tooltip x={PAD.left + (active + 0.5) * slot} w={w} title={points[active].label} value={format(points[active].value)} ink={ink} />}
        </>
      )}
    </View>
  );
}

export function Donut({ slices, size = 168, thickness = 22, ink, centerTitle, centerValue }: {
  slices: { label: string; value: number; color: string }[]; size?: number; thickness?: number; ink: ChartInk; centerTitle: string; centerValue: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  let angle = -Math.PI / 2;
  const gap = slices.length > 1 ? 0.03 : 0; // 2px-ish surface gap between segments
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={ink.grid} strokeWidth={thickness} fill="none" />
        {total > 0 && slices.map((sl) => {
          const sweep = (sl.value / total) * Math.PI * 2;
          if (sweep <= 0) return null;
          const a0 = angle + gap / 2;
          const a1 = angle + Math.max(sweep - gap / 2, gap / 2);
          angle += sweep;
          if (sweep >= Math.PI * 2 - 0.001) {
            return <Circle key={sl.label} cx={c} cy={c} r={r} stroke={sl.color} strokeWidth={thickness} fill="none" />;
          }
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)}`;
          return <Path key={sl.label} d={d} stroke={sl.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" />;
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Text style={[s.donutValue, { color: ink.text }]}>{centerValue}</Text>
        <Text style={[s.donutTitle, { color: ink.muted }]}>{centerTitle}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  yLabel: { position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right', fontSize: 10.5 },
  xLabel: { position: 'absolute', bottom: 2, width: 48, textAlign: 'center', fontSize: 10.5 },
  tooltip: { position: 'absolute', top: 0, width: 120, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tipTitle: { fontSize: 10.5 },
  tipValue: { fontSize: 13, fontWeight: '800', marginTop: 1 },
  donutValue: { fontSize: 18, fontWeight: '800' },
  donutTitle: { fontSize: 11, marginTop: 2 },
});
