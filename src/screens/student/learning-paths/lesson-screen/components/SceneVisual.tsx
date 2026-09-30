import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import type { SceneVisual as Visual } from '../types';
import ZoomableImage from './ZoomableImage';

export const TINTS = ['#4C8FD6', '#D65C5C', '#B07A10', '#7A5CC8', '#2E8B5A', '#C2578F', '#3B8EA5'];

function Box({ text, tint, colors, bold }: { text: string; tint: string; colors: AppColors; bold?: boolean }) {
  return (
    <View style={{ borderWidth: 1.5, borderColor: tint, backgroundColor: tint + '14', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textMain, fontWeight: bold ? '700' : '500', textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const Arrow = ({ colors, dir = 'down' }: { colors: AppColors; dir?: 'down' | 'right' }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: dir === 'down' ? 2 : 0, paddingHorizontal: dir === 'right' ? 4 : 0 }}>
    <Feather name={dir === 'down' ? 'arrow-down' : 'arrow-right'} size={16} color={colors.textMuted} />
  </View>
);

function Flow({ v, colors }: { v: Extract<Visual, { kind: 'flow' }>; colors: AppColors }) {
  return (
    <View style={{ gap: 2 }}>
      {v.steps.map((s, i) => (
        <React.Fragment key={i}>
          <Box text={`${i + 1}. ${s}`} tint={TINTS[i % TINTS.length]} colors={colors} />
          {i < v.steps.length - 1 && <Arrow colors={colors} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function Venn({ v, colors }: { v: Extract<Visual, { kind: 'venn' }>; colors: AppColors }) {
  const [a, b] = [TINTS[0], TINTS[1]];
  // Container is 1.72:1 and each circle is 58% wide and full height, so the circles stay round at any width.
  const circle = (tint: string, side: 'left' | 'right') => ({
    position: 'absolute' as const, top: 0, bottom: 0, [side]: 0, width: '58%' as const, borderRadius: 9999,
    borderWidth: 2, borderColor: tint, backgroundColor: tint + '1a',
  });
  const list = (items: string[], align: 'flex-start' | 'center' | 'flex-end') => items.slice(0, 4).map((t, i) => (
    <Text key={i} numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 17, color: colors.textMain, textAlign: align === 'center' ? 'center' : align === 'flex-start' ? 'left' : 'right' }}>• {t}</Text>
  ));
  return (
    <View testID="venn">
      <View style={{ aspectRatio: 1.72, width: '100%', position: 'relative' }}>
        <View style={circle(a, 'left')} />
        <View style={circle(b, 'right')} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 24 }}>
          <View style={{ flex: 1, justifyContent: 'center', gap: 3, paddingRight: 4 }}>{list(v.left.items, 'flex-start')}</View>
          <View style={{ flex: 0.9, justifyContent: 'center', gap: 3 }}>{list(v.both, 'center')}</View>
          <View style={{ flex: 1, justifyContent: 'center', gap: 3, paddingLeft: 4 }}>{list(v.right.items, 'flex-end')}</View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: a }}>{v.left.label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Both</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: b }}>{v.right.label}</Text>
      </View>
    </View>
  );
}

function Table({ v, colors }: { v: Extract<Visual, { kind: 'table' }>; colors: AppColors }) {
  const cell = { flex: 1, padding: 8, borderRightWidth: 1, borderColor: colors.borderColor };
  return (
    <View style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: TINTS[0] + '22' }}>
        {v.headers.map((h, i) => <Text key={i} style={[cell, { fontSize: 13, fontWeight: '800', color: colors.textMain }]}>{h}</Text>)}
      </View>
      {v.rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.borderColor, backgroundColor: ri % 2 ? colors.cardDark : 'transparent' }}>
          {v.headers.map((_, ci) => <Text key={ci} style={[cell, { fontSize: 13, lineHeight: 18, color: colors.textMain }]}>{r[ci] ?? ''}</Text>)}
        </View>
      ))}
    </View>
  );
}

function Timeline({ v, colors }: { v: Extract<Visual, { kind: 'timeline' }>; colors: AppColors }) {
  return (
    <View style={{ paddingLeft: 8 }}>
      {v.events.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center', width: 14 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: TINTS[i % TINTS.length], marginTop: 3 }} />
            {i < v.events.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.borderColor }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: TINTS[i % TINTS.length] }}>{e.when}</Text>
            <Text style={{ fontSize: 13.5, lineHeight: 19, color: colors.textMain }}>{e.what}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function CauseEffect({ v, colors }: { v: Extract<Visual, { kind: 'cause_effect' }>; colors: AppColors }) {
  return (
    <View style={{ gap: 10 }}>
      {v.pairs.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Box text={p.cause} tint={TINTS[3]} colors={colors} /></View>
          <Arrow colors={colors} dir="right" />
          <View style={{ flex: 1 }}><Box text={p.effect} tint={TINTS[4]} colors={colors} /></View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: TINTS[3] }}>CAUSE</Text>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: TINTS[4] }}>EFFECT</Text>
      </View>
    </View>
  );
}

function Compare({ v, colors }: { v: Extract<Visual, { kind: 'compare' }>; colors: AppColors }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {v.columns.map((c, i) => (
        <View key={i} style={{ flex: 1, borderWidth: 1.5, borderColor: TINTS[i % TINTS.length], borderRadius: 12, overflow: 'hidden' }}>
          <Text style={{ backgroundColor: TINTS[i % TINTS.length], color: '#fff', fontWeight: '800', fontSize: 13.5, padding: 8, textAlign: 'center' }}>{c.label}</Text>
          <View style={{ padding: 8, gap: 5 }}>
            {c.points.map((p, j) => <Text key={j} style={{ fontSize: 13, lineHeight: 18, color: colors.textMain }}>• {p}</Text>)}
          </View>
        </View>
      ))}
    </View>
  );
}

function Web({ v, colors }: { v: Extract<Visual, { kind: 'web' }>; colors: AppColors }) {
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ backgroundColor: TINTS[0], borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{v.center}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {v.nodes.map((n, i) => (
          <View key={i} style={{ width: '47%', borderWidth: 1.5, borderColor: TINTS[(i + 1) % TINTS.length], borderRadius: 12, padding: 8, backgroundColor: TINTS[(i + 1) % TINTS.length] + '12' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: TINTS[(i + 1) % TINTS.length] }}>{n.label}</Text>
            {!!n.note && <Text style={{ fontSize: 12.5, lineHeight: 17, color: colors.textMain, marginTop: 2 }}>{n.note}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

// One visual for the scene being narrated: a real book picture, or a diagram drawn from the lesson's own facts.
export default function SceneVisual({ visual, colors }: { visual: Visual; colors: AppColors }) {
  const body = (() => {
    switch (visual.kind) {
      case 'image': return <ZoomableImage url={visual.url} alt={visual.caption} colors={colors} />;
      case 'flow': return <Flow v={visual} colors={colors} />;
      case 'venn': return <Venn v={visual} colors={colors} />;
      case 'table': return <Table v={visual} colors={colors} />;
      case 'timeline': return <Timeline v={visual} colors={colors} />;
      case 'cause_effect': return <CauseEffect v={visual} colors={colors} />;
      case 'compare': return <Compare v={visual} colors={colors} />;
      case 'web': return <Web v={visual} colors={colors} />;
      default: return null;
    }
  })();
  if (!body) return null;
  return (
    <View testID={`scene-visual-${visual.kind}`} style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 16, padding: 14, gap: 10 }}>
      {!!visual.title && <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.textMain }}>{visual.title}</Text>}
      {body}
      {visual.kind === 'image' && !!visual.caption && <Text style={{ fontSize: 12.5, color: colors.textMuted }}>{visual.caption}</Text>}
    </View>
  );
}
