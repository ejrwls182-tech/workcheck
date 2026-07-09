import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Calendar, { CalendarMarkers } from '../components/Calendar';
import EventModal from '../components/EventModal';
import { useStore, useTheme } from '../store';
import { EVENT_COLORS, getStatusMeta, Palette } from '../theme';
import { Task, TaskStatus } from '../types';
import { confirmAction } from '../utils/confirm';
import { daysUntil, ddayLabel, formatKorean, todayKey } from '../utils/date';
import { parseQuickInput } from '../utils/quickInput';

const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];

/** 완료 후 이 시간이 지나면 보관함으로 자동 이동 */
const ARCHIVE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function isArchived(t: Task): boolean {
  if (t.archived !== undefined) return t.archived; // 수동 지정이 우선
  return t.status === 'done' && !!t.completedAt && Date.now() - t.completedAt > ARCHIVE_AFTER_MS;
}

function DdayBadge({ dueDate }: { dueDate: string }) {
  const { c } = useTheme();
  const n = daysUntil(dueDate);
  const color = n < 0 ? c.danger : n === 0 ? c.danger : n <= 3 ? c.doing : c.textSecondary;
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color }}>
      {ddayLabel(n)}
    </Text>
  );
}

function TaskCard({ task, inArchive = false }: { task: Task; inArchive?: boolean }) {
  const { setTaskStatus, setTaskArchived, deleteTask } = useStore();
  const { c } = useTheme();
  const styles = useMemo(() => makeCardStyles(c), [c]);
  const statusMeta = getStatusMeta(c);
  const meta = statusMeta[task.status];
  const overdue = task.dueDate && task.status !== 'done' && task.dueDate < todayKey();

  const prev: TaskStatus | null =
    task.status === 'doing' ? 'todo' : task.status === 'done' ? 'doing' : null;
  const next: TaskStatus | null =
    task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : null;

  return (
    <View style={[styles.card, { borderLeftColor: meta.color }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.title, task.status === 'done' && styles.doneTitle]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.dueDate && (
          <View style={styles.dueRow}>
            {task.status !== 'done' && <DdayBadge dueDate={task.dueDate} />}
            <Text style={[styles.due, overdue && { color: c.danger }]}>
              {formatKorean(task.dueDate)}
              {overdue ? ' · 기한 지남' : ''}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        {prev && (
          <Pressable
            style={styles.moveBtn}
            hitSlop={4}
            onPress={() => setTaskStatus(task.id, prev)}
          >
            <Text style={styles.moveBtnText}>‹ {statusMeta[prev].label}</Text>
          </Pressable>
        )}
        {next && (
          <Pressable
            style={[styles.moveBtn, { backgroundColor: statusMeta[next].bg }]}
            hitSlop={4}
            onPress={() => setTaskStatus(task.id, next)}
          >
            <Text style={[styles.moveBtnText, { color: statusMeta[next].color }]}>
              {statusMeta[next].label} ›
            </Text>
          </Pressable>
        )}
        {task.status === 'done' && !inArchive && (
          <Pressable
            style={styles.moveBtn}
            hitSlop={4}
            onPress={() => setTaskArchived(task.id, true)}
          >
            <Text style={styles.moveBtnText}>보관 ⤵</Text>
          </Pressable>
        )}
        {inArchive && (
          <Pressable
            style={styles.moveBtn}
            hitSlop={4}
            onPress={() => setTaskArchived(task.id, false)}
          >
            <Text style={styles.moveBtnText}>꺼내기 ⤴</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.deleteBtn}
          hitSlop={6}
          onPress={() =>
            confirmAction('업무 삭제', `"${task.title}"을(를) 삭제할까요?`, () =>
              deleteTask(task.id)
            )
          }
        >
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ChecklistScreen() {
  const { state, addTask, deleteEvent } = useStore();
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const statusMeta = getStatusMeta(c);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const today = todayKey();

  // 자연어 입력 실시간 파싱 ("업무보고 7/9까지" → 마감일 자동 인식)
  const parsed = useMemo(() => parseQuickInput(input), [input]);

  // 완료 7일 경과 → 보관함
  const archivedTasks = useMemo(() => state.tasks.filter(isArchived), [state.tasks]);
  const activeTasks = useMemo(() => state.tasks.filter((t) => !isArchived(t)), [state.tasks]);

  const visibleTasks = useMemo(() => {
    let list = activeTasks;
    if (selectedDate) list = list.filter((t) => t.dueDate === selectedDate);
    const q = query.trim().toLowerCase();
    if (searchOpen && q) list = list.filter((t) => t.title.toLowerCase().includes(q));
    return list;
  }, [activeTasks, selectedDate, query, searchOpen]);

  const markers = useMemo(() => {
    const m: CalendarMarkers = {};
    for (const t of activeTasks) {
      if (!t.dueDate) continue;
      (m[t.dueDate] = m[t.dueDate] ?? []).push(t.status);
    }
    return m;
  }, [activeTasks]);

  // 오늘 요약
  const dueTodayCount = activeTasks.filter(
    (t) => t.status !== 'done' && t.dueDate === today
  ).length;
  const overdueCount = activeTasks.filter(
    (t) => t.status !== 'done' && t.dueDate && t.dueDate < today
  ).length;
  const dailyLeftCount = state.routines.filter(
    (r) => r.freq === 'daily' && !state.routineLog[r.id]?.[today]
  ).length;
  const todayEvents = state.events.filter((e) => e.start <= today && today <= e.end);

  // 선택한 날짜에 걸쳐 있는 기간 일정
  const selectedDateEvents = useMemo(
    () =>
      selectedDate
        ? state.events.filter((e) => e.start <= selectedDate && selectedDate <= e.end)
        : [],
    [state.events, selectedDate]
  );

  const eventDday = (e: { start: string; end: string }): { label: string; color: string } => {
    if (today < e.start) return { label: ddayLabel(daysUntil(e.start)), color: c.primary };
    if (today > e.end) return { label: '종료', color: c.faint };
    return { label: '진행중', color: c.done };
  };

  const submit = () => {
    const title = parsed.title.trim() || input.trim();
    if (!title) return;
    addTask(title, parsed.dueDate ?? selectedDate ?? undefined);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 오늘 요약 카드 */}
        <Pressable style={styles.summaryCard} onPress={() => setSelectedDate(today)}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>오늘 · {formatKorean(today)}</Text>
            {todayEvents.map((e) => (
              <View
                key={e.id}
                style={[styles.summaryEventChip, { backgroundColor: EVENT_COLORS[e.colorIndex] }]}
              >
                <Text style={styles.summaryEventText}>✈️ {e.title}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, dueTodayCount > 0 && { color: c.primary }]}>
                {dueTodayCount}
              </Text>
              <Text style={styles.summaryLabel}>오늘 마감</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, overdueCount > 0 && { color: c.danger }]}>
                {overdueCount}
              </Text>
              <Text style={styles.summaryLabel}>기한 지남</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, dailyLeftCount > 0 && { color: c.doing }]}>
                {dailyLeftCount}
              </Text>
              <Text style={styles.summaryLabel}>루틴 남음</Text>
            </View>
          </View>
        </Pressable>

        {/* 필터/검색 헤더 */}
        <View style={styles.filterRow}>
          {searchOpen ? (
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="업무 검색"
                placeholderTextColor={c.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              <Pressable
                onPress={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                hitSlop={6}
              >
                <Text style={styles.searchCancel}>취소</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.filterText}>
                {selectedDate ? `${formatKorean(selectedDate)} 업무` : '전체 업무'}
              </Text>
              <View style={styles.filterActions}>
                {selectedDate && (
                  <Pressable onPress={() => setSelectedDate(null)} hitSlop={6}>
                    <Text style={styles.clearFilter}>전체 보기</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setSearchOpen(true)} hitSlop={6}>
                  <Text style={styles.searchIcon}>🔍</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* 선택한 날짜에 걸친 기간 일정 표시 */}
        {selectedDateEvents.length > 0 && (
          <View style={styles.eventChipRow}>
            {selectedDateEvents.map((e) => (
              <View
                key={e.id}
                style={[styles.eventChip, { backgroundColor: EVENT_COLORS[e.colorIndex] }]}
              >
                <Text style={styles.eventChipText}>✈️ {e.title}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 상태별 보드 */}
        {STATUS_ORDER.map((status) => {
          const meta = statusMeta[status];
          const tasks = visibleTasks.filter((t) => t.status === status);
          return (
            <View key={status} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <Text style={styles.sectionTitle}>{meta.label}</Text>
                <Text style={styles.count}>{tasks.length}</Text>
              </View>
              {tasks.length === 0 ? (
                <Text style={styles.empty}>업무 없음</Text>
              ) : (
                tasks.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </View>
          );
        })}

        {/* 캘린더 (체크리스트 바로 아래, 날짜 선택과 연동) */}
        <Calendar
          selected={selectedDate}
          onSelect={setSelectedDate}
          markers={markers}
          events={state.events}
        />
        <Text style={styles.calendarHint}>
          날짜를 누르면 그 날짜가 마감인 업무만 표시됩니다. 점: 회색=시작전 · 주황=진행중 ·
          초록=완료
        </Text>

        {/* 기간 일정 (출장/여행) */}
        <View style={styles.eventSection}>
          <View style={styles.eventSectionHeader}>
            <Text style={styles.eventSectionTitle}>✈️ 기간 일정</Text>
            <Pressable onPress={() => setEventModalOpen(true)} hitSlop={6}>
              <Text style={styles.eventAddBtn}>＋ 일정 추가</Text>
            </Pressable>
          </View>
          {state.events.length === 0 ? (
            <Text style={styles.empty}>출장이나 여행 일정을 추가하면 캘린더에 띠로 표시됩니다</Text>
          ) : (
            state.events.map((e) => {
              const d = eventDday(e);
              return (
                <View key={e.id} style={styles.eventRow}>
                  <View
                    style={[styles.eventColorBar, { backgroundColor: EVENT_COLORS[e.colorIndex] }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <Text style={styles.eventRange}>
                      {formatKorean(e.start)}
                      {e.end !== e.start ? ` ~ ${formatKorean(e.end)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.eventDday, { color: d.color }]}>{d.label}</Text>
                  <Pressable
                    hitSlop={6}
                    onPress={() =>
                      confirmAction('일정 삭제', `"${e.title}" 일정을 삭제할까요?`, () =>
                        deleteEvent(e.id)
                      )
                    }
                  >
                    <Text style={styles.eventDelete}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* 보관함 — 완료 후 7일 지난 업무 */}
        {archivedTasks.length > 0 && (
          <View style={styles.archiveSection}>
            <Pressable
              style={styles.archiveHeader}
              onPress={() => setArchiveOpen(!archiveOpen)}
            >
              <Text style={styles.archiveTitle}>
                🗂 보관함 ({archivedTasks.length})
              </Text>
              <Text style={styles.archiveChevron}>{archiveOpen ? '▾' : '▸'}</Text>
            </Pressable>
            {archiveOpen && (
              <>
                <Text style={styles.archiveHint}>
                  완료 후 7일이 지난 업무는 자동으로 이곳으로 이동합니다
                </Text>
                {archivedTasks.map((t) => (
                  <TaskCard key={t.id} task={t} inArchive />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <EventModal
        visible={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        initialDate={selectedDate}
      />

      {/* 자연어 인식 힌트 */}
      {input.trim() !== '' && parsed.dueDate && (
        <View style={styles.parseHint}>
          <Text style={styles.parseHintText}>
            📅 {formatKorean(parsed.dueDate)} 마감 · "{parsed.title || '(제목 없음)'}"
          </Text>
        </View>
      )}

      {/* 추가 입력 바 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={
            selectedDate
              ? `${formatKorean(selectedDate)} 마감 업무 추가`
              : '예: 업무보고 7/9까지 · 보안점검 내일'
          }
          placeholderTextColor={c.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Pressable style={styles.addBtn} onPress={submit}>
          <Text style={styles.addBtnText}>추가</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeCardStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      borderLeftWidth: 4,
      paddingVertical: 10,
      paddingLeft: 12,
      paddingRight: 8,
      marginBottom: 8,
      gap: 8,
    },
    title: { fontSize: 15, color: c.text, fontWeight: '500' },
    doneTitle: { textDecorationLine: 'line-through', color: c.textSecondary },
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    due: { fontSize: 12, color: c.textSecondary },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    moveBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.background,
    },
    moveBtnText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    deleteBtn: { padding: 6 },
    deleteText: { color: c.faint, fontSize: 14 },
  });

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 24 },
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    summaryTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    summaryEventChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    summaryEventText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    summaryRow: { flexDirection: 'row' },
    summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
    summaryNum: { fontSize: 20, fontWeight: '800', color: c.textSecondary },
    summaryLabel: { fontSize: 11, color: c.textSecondary },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      minHeight: 32,
    },
    filterText: { fontSize: 17, fontWeight: '700', color: c.text },
    filterActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    clearFilter: { fontSize: 14, color: c.primary, fontWeight: '600' },
    searchIcon: { fontSize: 15 },
    searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: c.text,
    },
    searchCancel: { fontSize: 14, color: c.primary, fontWeight: '600' },
    eventChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    eventChip: {
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    eventChipText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    section: { marginBottom: 14 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 6,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    count: { fontSize: 13, color: c.textSecondary },
    empty: { fontSize: 13, color: c.faint, paddingVertical: 4, paddingLeft: 14 },
    calendarHint: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    eventSection: { marginTop: 18 },
    eventSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    eventSectionTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    eventAddBtn: { fontSize: 14, color: c.primary, fontWeight: '600' },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 10,
    },
    eventColorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    eventTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    eventRange: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    eventDday: { fontSize: 12, fontWeight: '800' },
    eventDelete: { color: c.faint, fontSize: 14, padding: 4 },
    archiveSection: { marginTop: 18 },
    archiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    archiveTitle: { fontSize: 15, fontWeight: '700', color: c.textSecondary },
    archiveChevron: { fontSize: 14, color: c.textSecondary },
    archiveHint: { fontSize: 11, color: c.faint, marginBottom: 8 },
    parseHint: {
      backgroundColor: c.todayBg,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    parseHintText: { fontSize: 13, color: c.primary, fontWeight: '600' },
    inputBar: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    input: {
      flex: 1,
      backgroundColor: c.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
    },
    addBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    addBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
  });
