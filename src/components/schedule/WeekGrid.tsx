import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import type { AppColors } from '../../theme';

// Shared week calendar table (teacher, student, parent): pinned day headers +
// all-day lane, 24 h hour grid, current-time line. Each persona supplies its
// own event filtering and event rendering.

export const GRID_HOUR_HEIGHT = 56;
export const GRID_TIME_LABEL_WIDTH = 64;
export const GRID_TIMES = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export function fmtHour12(hhmm: string): string {
  const h = Number(hhmm.split(':')[0]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h >= 12 ? 'pm' : 'am'}`;
}

export function nowLineTop(now: Date): number {
  return now.getHours() * GRID_HOUR_HEIGHT + (now.getMinutes() / 60) * GRID_HOUR_HEIGHT;
}

export interface GridDay { iso: string; day: string; date: number }
export interface GridDragPreview { dayIso: string; top: number; height: number; startT: string; endT: string }

interface Props<T> {
  colors: AppColors;
  testIdPrefix: string;
  week: GridDay[];
  todayISO: string;
  allDayHeight: number;
  colWidth: number;
  gridHeight: number;
  hScrollRef: React.RefObject<ScrollView | null>;
  onGridContentSizeChange?: () => void;
  /** Screens that already tick a clock pass it; otherwise the grid keeps its own. */
  nowTime?: Date;
  allDayEvents: (dayIso: string) => T[];
  timedEvents: (dayIso: string) => T[];
  renderAllDayChip: (event: T, dayIso: string) => React.ReactNode;
  renderTimedEvent: (event: T, dayIso: string) => React.ReactNode;
  onAllDayPress: (dayIso: string) => void;
  onSlotPress?: (dayIso: string, time: string) => void;
  onColMouseDown?: (e: any, dayIso: string) => void;
  onDayHeaderPress?: (dayIso: string) => void;
  dragPreview?: GridDragPreview | null;
  accent: string;
}

// Web keeps the header row in view with CSS sticky; the page's vertical ScrollView is its scroll container.
const PINNED: any = Platform.OS === 'web' ? { position: 'sticky', top: 0 } : null;

function useMinuteClock(external?: Date) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (external) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [external]);
  return external ?? now;
}

export default function WeekGrid<T extends { id: string }>({
  colors, testIdPrefix: p, week, todayISO, allDayHeight, colWidth, gridHeight, hScrollRef,
  onGridContentSizeChange, nowTime, allDayEvents, timedEvents, renderAllDayChip, renderTimedEvent,
  onAllDayPress, onSlotPress, onColMouseDown, onDayHeaderPress, dragPreview, accent,
}: Props<T>) {
  const s = useMemo(() => makeGridStyles(colors), [colors]);
  const headerScrollRef = useRef<ScrollView>(null);
  const now = useMinuteClock(nowTime);

  return (
    <View style={s.container}>
      {/* Pinned: dates and the all-day row stay at the top while the hours scroll under them (like Teams). */}
      <View style={[{ flexDirection: 'row', zIndex: 5, backgroundColor: colors.bgDark }, PINNED]}>
        <View style={[s.gutter, { borderRightWidth: 1, borderRightColor: colors.borderColor }]}>
          <View style={[s.timeColHeader, { justifyContent: 'flex-end', paddingBottom: 6, paddingLeft: 6, alignItems: 'flex-start' }]}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textDim }} numberOfLines={1}>GMT+05:30</Text>
          </View>
          <View style={[s.allDayGutter, { height: allDayHeight }]}>
            <Text style={s.allDayGutterText}>All day</Text>
          </View>
        </View>
        <ScrollView ref={headerScrollRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ width: colWidth * 7 }}>
            <View style={s.dayHeaderRow}>
              {week.map((d) => {
                const isToday = d.iso === todayISO;
                return (
                  <TouchableOpacity
                    key={d.iso}
                    testID={`${p}-day-header-${d.iso}`}
                    style={[s.dayHeader, { width: colWidth }, isToday && s.dayHeaderToday]}
                    onPress={() => onDayHeaderPress?.(d.iso)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dayHeaderLabel, isToday && s.dayHeaderLabelToday]}>{String(d.date).padStart(2, '0')} {d.day.charAt(0) + d.day.slice(1).toLowerCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.allDayRow, { height: allDayHeight }]}>
              {week.map((d) => (
                <TouchableOpacity
                  key={d.iso}
                  testID={`${p}-allday-col-${d.iso}`}
                  style={[s.allDayCol, { width: colWidth, height: allDayHeight }]}
                  onPress={() => onAllDayPress(d.iso)}
                  activeOpacity={0.8}
                >
                  {allDayEvents(d.iso).map((e) => <React.Fragment key={e.id}>{renderAllDayChip(e, d.iso)}</React.Fragment>)}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', height: gridHeight }}>
        <View style={[s.gutter, { borderRightWidth: 1, borderRightColor: colors.borderColor }]}>
          {GRID_TIMES.map((t) => (
            <View key={t} style={{ height: GRID_HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 4 }}>
              <Text style={s.timeLabel}>{fmtHour12(t)}</Text>
            </View>
          ))}
        </View>

        {/* The day columns scroll sideways; the pinned dates follow them. */}
        <ScrollView
          ref={hScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          onContentSizeChange={onGridContentSizeChange}
          onScroll={(e) => headerScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false })}
          scrollEventThrottle={16}
        >
          <View style={{ width: colWidth * 7 }}>
            <View style={{ flexDirection: 'row' }}>
              {week.map((d) => (
                <View
                  key={d.iso}
                  testID={`${p}-day-col-${d.iso}`}
                  style={[s.dayCol, { width: colWidth, height: gridHeight }]}
                  // @ts-ignore — onMouseDown is valid in React Native Web
                  onMouseDown={onColMouseDown ? (e: any) => onColMouseDown(e, d.iso) : undefined}
                >
                  {GRID_TIMES.map((t, idx) => (onSlotPress ? (
                    <TouchableOpacity
                      key={t}
                      testID={`${p}-slot-${d.iso}-${t}`}
                      style={[s.hourCell, { top: idx * GRID_HOUR_HEIGHT }]}
                      onPress={() => onSlotPress(d.iso, t)}
                      activeOpacity={0.3}
                    />
                  ) : (
                    <View key={t} testID={`${p}-slot-${d.iso}-${t}`} style={[s.hourCell, { top: idx * GRID_HOUR_HEIGHT }]} />
                  )))}

                  {d.iso === todayISO && (
                    <View pointerEvents="none" testID={`${p}-now-line`} style={{ position: 'absolute', left: 0, right: 0, top: nowLineTop(now), zIndex: 10 }}>
                      <View style={{ position: 'absolute', left: -6, top: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' }} />
                      <View style={{ height: 2, backgroundColor: '#E53935', opacity: 0.85 }} />
                    </View>
                  )}

                  {dragPreview?.dayIso === d.iso && dragPreview.height > 8 && (
                    <View style={{
                      position: 'absolute', left: 2, right: 2,
                      top: dragPreview.top, height: Math.max(dragPreview.height, 20),
                      backgroundColor: accent + '28',
                      borderLeftWidth: 3, borderLeftColor: accent,
                      borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3,
                      zIndex: 10, // @ts-ignore
                      pointerEvents: 'none',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>
                        {dragPreview.startT} – {dragPreview.endT}
                      </Text>
                    </View>
                  )}

                  {timedEvents(d.iso).map((e) => <React.Fragment key={e.id}>{renderTimedEvent(e, d.iso)}</React.Fragment>)}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Chip/event styles personas use inside their render functions.
export function makeGridStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    gutter: { width: GRID_TIME_LABEL_WIDTH, backgroundColor: c.bgDark, zIndex: 2, overflow: 'hidden' },
    dayHeaderRow: { flexDirection: 'row', height: 62, borderBottomWidth: 1, borderBottomColor: c.borderColor, marginBottom: 0 },
    dayHeader: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: c.borderColor + '50' },
    dayHeaderToday: { backgroundColor: c.accentYellow + '12' },
    dayHeaderLabel: { fontSize: 13.5, fontWeight: '700', color: c.textMuted },
    dayHeaderLabelToday: { color: c.accentYellow },
    allDayRow: { flexDirection: 'row', minHeight: 32, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    allDayCol: { paddingHorizontal: 3, paddingVertical: 4, gap: 3, minHeight: 32, borderLeftWidth: 1, borderLeftColor: c.borderColor + '50' },
    allDayGutter: { minHeight: 32, borderBottomWidth: 1, borderBottomColor: c.borderColor, alignItems: 'flex-start', justifyContent: 'center', paddingVertical: 4, paddingLeft: 6 },
    allDayGutterText: { fontSize: 10.5, fontWeight: '600', color: c.textDim },
    allDayChip: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
    allDayChipText: { flex: 1, fontSize: 11, fontWeight: '700' },
    timeColHeader: { height: 62, borderBottomWidth: 1, borderBottomColor: c.borderColor },
    dayCol: { position: 'relative', borderLeftWidth: 1, borderLeftColor: c.borderColor + '50', overflow: 'visible' },
    hourCell: { position: 'absolute', left: 0, right: 0, height: GRID_HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: c.borderColor + '40', justifyContent: 'center' },
    timeLabel: { fontSize: 10, color: c.textDim, fontWeight: '600', textAlign: 'right', paddingRight: 6 },
    eventBlock: { position: 'absolute', left: 2, right: 2, borderLeftWidth: 3, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3, overflow: 'hidden' },
    eventTitle: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
    eventTime: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
    deleteBtn: { position: 'absolute', top: 3, right: 3 },
  });
}
