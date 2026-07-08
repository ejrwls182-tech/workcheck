import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store';
import { EVENT_COLORS, Palette } from '../theme';
import { CalendarEvent, TaskStatus } from '../types';
import { fromKey, toKey, todayKey, WEEKDAY_LABELS } from '../utils/date';

export type CalendarMarkers = Record<string, TaskStatus[]>;

interface Props {
  /** 선택된 날짜 키. null이면 전체 보기 */
  selected: string | null;
  onSelect: (key: string | null) => void;
  /** 날짜별 마감 업무 상태 목록 (점 표시용) */
  markers?: CalendarMarkers;
  /** 기간 일정 — 범위에 걸친 날짜에 색상 띠 표시 */
  events?: CalendarEvent[];
  /** 범위 선택 모드용 시작/종료 강조 (일정 추가 모달에서 사용) */
  rangeStart?: string | null;
  rangeEnd?: string | null;
}

interface Cell {
  key: string;
  day: number;
  inMonth: boolean;
}

function buildMonth(year: number, month: number): Cell[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay()); // 일요일 시작
  const weeks: Cell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        key: toKey(cursor),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // 다음 주가 완전히 다음 달이면 종료
    if (cursor.getMonth() !== month && cursor.getDay() === 0 && w >= 3) break;
  }
  return weeks;
}

const MAX_BANDS = 2;

export default function Calendar({
  selected,
  onSelect,
  markers = {},
  events = [],
  rangeStart = null,
  rangeEnd = null,
}: Props) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const statusDot: Record<TaskStatus, string> = { todo: c.todo, doing: c.doing, done: c.done };

  const initial = selected ? fromKey(selected) : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const weeks = useMemo(() => buildMonth(year, month), [year, month]);
  const today = todayKey();
  const hasBands = events.length > 0;

  const move = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const inRange = (key: string) =>
    rangeStart && rangeEnd && key >= rangeStart && key <= rangeEnd;
  const isRangeEdge = (key: string) => key === rangeStart || key === rangeEnd;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => move(-1)} hitSlop={8} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {year}년 {month + 1}월
        </Text>
        <Pressable onPress={() => move(1)} hitSlop={8} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.weekdayLabel,
              i === 0 && { color: c.danger },
              i === 6 && { color: c.primary },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell) => {
            const isSelected = selected === cell.key;
            const isToday = cell.key === today;
            const dots = (markers[cell.key] ?? []).slice(0, 3);
            // 이 날짜에 걸친 기간 일정 (시작일 순 정렬 유지)
            const cellEvents = events
              .filter((e) => e.start <= cell.key && cell.key <= e.end)
              .slice(0, MAX_BANDS);
            return (
              <Pressable
                key={cell.key}
                style={styles.cell}
                onPress={() => onSelect(isSelected ? null : cell.key)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isToday && !isSelected && styles.todayCircle,
                    inRange(cell.key) && !isRangeEdge(cell.key) && styles.rangeCircle,
                    (isSelected || isRangeEdge(cell.key)) && styles.selectedCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.inMonth && styles.outMonthText,
                      isToday && !isSelected && { color: c.primary, fontWeight: '700' },
                      (isSelected || isRangeEdge(cell.key)) && styles.selectedText,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                <View style={styles.dotRow}>
                  {dots.map((status, di) => (
                    <View
                      key={di}
                      style={[styles.dot, { backgroundColor: statusDot[status] }]}
                    />
                  ))}
                </View>
                {hasBands && (
                  <View style={styles.bandArea}>
                    {cellEvents.map((e) => (
                      <View
                        key={e.id}
                        style={[
                          styles.band,
                          { backgroundColor: EVENT_COLORS[e.colorIndex] },
                          e.start === cell.key && styles.bandStart,
                          e.end === cell.key && styles.bandEnd,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      marginBottom: 6,
    },
    navBtn: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navText: { fontSize: 24, color: c.primary, lineHeight: 26 },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    weekRow: { flexDirection: 'row' },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayCircle: { backgroundColor: c.todayBg },
    rangeCircle: { backgroundColor: c.todayBg, borderRadius: 8 },
    selectedCircle: { backgroundColor: c.primary },
    dayText: { fontSize: 14, color: c.text },
    outMonthText: { color: c.faint },
    selectedText: { color: c.onPrimary, fontWeight: '700' },
    dotRow: { flexDirection: 'row', gap: 2, height: 5, marginTop: 1 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    bandArea: { alignSelf: 'stretch', height: MAX_BANDS * 5, marginTop: 1 },
    band: { height: 4, marginBottom: 1, alignSelf: 'stretch' },
    bandStart: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2, marginLeft: 3 },
    bandEnd: { borderTopRightRadius: 2, borderBottomRightRadius: 2, marginRight: 3 },
  });
