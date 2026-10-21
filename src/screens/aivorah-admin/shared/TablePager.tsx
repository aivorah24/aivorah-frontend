import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const DEFAULT_PAGE_SIZE = 10;

// Client-side paging over an already-fetched list; resets to page 1 when a
// search/filter shrinks the list below the current page.
export function usePaged<T>(rows: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp after the list shrinks
  useEffect(() => { if (page > pageCount - 1) setPage(0); }, [page, pageCount]);
  const pageRows = useMemo(() => rows.slice(page * pageSize, page * pageSize + pageSize), [rows, page, pageSize]);
  return { page, setPage, pageCount, pageRows, total: rows.length, pageSize };
}

export function TablePager({ testIDPrefix, page, setPage, pageCount, total, pageSize, colors }: {
  testIDPrefix: string;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  pageCount: number;
  total: number;
  pageSize: number;
  colors: any;
}) {
  const first = total ? page * pageSize + 1 : 0;
  const last = Math.min(total, (page + 1) * pageSize);
  const btn = [s.btn, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }];
  return (
    <View style={[s.footer, { borderTopColor: colors.borderColor }]}>
      <Text style={[s.range, { color: colors.textDim }]} testID={`${testIDPrefix}-range`}>{first}–{last} of {total}</Text>
      <TouchableOpacity testID={`${testIDPrefix}-prev`} style={[btn, page === 0 && s.off]} disabled={page === 0} onPress={() => setPage((p) => p - 1)} accessibilityLabel="Previous page">
        <Feather name="chevron-left" size={16} color={colors.textMain} />
      </TouchableOpacity>
      <TouchableOpacity testID={`${testIDPrefix}-next`} style={[btn, page >= pageCount - 1 && s.off]} disabled={page >= pageCount - 1} onPress={() => setPage((p) => p + 1)} accessibilityLabel="Next page">
        <Feather name="chevron-right" size={16} color={colors.textMain} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  range: { fontSize: 12, marginRight: 4 },
  btn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
});
