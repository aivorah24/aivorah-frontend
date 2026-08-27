import React from 'react';
import { View, Text } from 'react-native';
import { radius } from '../../../../../theme';
import type { AppColors } from '../../../../../theme';

function Cell({ children, style }: any) {
  return (
    <View style={{ width: 44, alignItems: 'center', justifyContent: 'center', ...style }}>{children}</View>
  );
}

function Digit({ v, color }: any) {
  return (
    <Text style={{ fontSize: 30, fontWeight: '800', color, fontVariant: ['tabular-nums'] as any }}>{v}</Text>
  );
}

export default function ColumnSubtraction({ top, bottom, colors }: { top: number; bottom: number; colors: AppColors }) {
  const tT = Math.floor(top / 10), tO = top % 10;
  const bT = Math.floor(bottom / 10), bO = bottom % 10;
  const borrow = tO < bO;
  const onesTop = borrow ? tO + 10 : tO;
  const tensReduced = borrow ? tT - 1 : tT;
  const ans = top - bottom;
  const aT = Math.floor(ans / 10), aO = ans % 10;
  const green = colors.accentGreen, rose = '#C1666B', dim = colors.textDim, main = colors.textMain;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.lg, padding: 16, gap: 2 }}>
      {/* column headers */}
      <View style={{ flexDirection: 'row', paddingLeft: 44 }}>
        <Cell><Text style={{ fontSize: 11, fontWeight: '700', color: dim }}>Tens</Text></Cell>
        <Cell><Text style={{ fontSize: 11, fontWeight: '700', color: dim }}>Ones</Text></Cell>
      </View>
      {/* borrow annotations row */}
      <View style={{ flexDirection: 'row', height: 22 }}>
        <Cell />
        <Cell>{borrow ? <Text style={{ fontSize: 15, fontWeight: '800', color: green }}>{tensReduced}</Text> : null}</Cell>
        <Cell>{borrow ? <Text style={{ fontSize: 13, fontWeight: '800', color: rose }}>¹</Text> : null}</Cell>
      </View>
      {/* top number (with the borrowed ten crossed out) */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Cell />
        <Cell>
          {borrow
            ? <Text style={{ fontSize: 30, fontWeight: '800', color: rose, textDecorationLine: 'line-through' }}>{tT}</Text>
            : <Digit v={tT} color={main} />}
        </Cell>
        <Cell><Digit v={tO} color={main} /></Cell>
      </View>
      {/* minus bottom number */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Cell><Text style={{ fontSize: 26, fontWeight: '800', color: main }}>−</Text></Cell>
        <Cell><Digit v={bT} color={main} /></Cell>
        <Cell><Digit v={bO} color={main} /></Cell>
      </View>
      {/* line */}
      <View style={{ height: 3, backgroundColor: main, marginLeft: 44, borderRadius: 2 }} />
      {/* answer */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Cell />
        <Cell><Digit v={aT} color={green} /></Cell>
        <Cell><Digit v={aO} color={green} /></Cell>
      </View>
      {borrow && (
        <Text style={{ fontSize: 11, color: dim, marginTop: 6, maxWidth: 200 }}>
          {tO} is smaller than {bO}, so we cross out the {tT} tens, make it {tensReduced}, and the {tO} becomes {onesTop}.
        </Text>
      )}
    </View>
  );
}
