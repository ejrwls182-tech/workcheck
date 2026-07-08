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
import { useStore } from '../store';
import { colors, EVENT_COLORS, statusMeta } from '../theme';
import { Task, TaskStatus } from '../types';
import { confirmAction } from '../utils/confirm';
import { formatKorean, isOverdue } from '../utils/date';

const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];

function TaskCard({ task }: { task: Task }) {
  const { setTaskStatus, deleteTask } = useStore();
  const meta = statusMeta[task.status];
  const overdue = task.dueDate && task.status !== 'done' && isOverdue(task.dueDate);

  const prev: TaskStatus | null =
    task.status === 'doing' ? 'todo' : task.status === 'done' ? 'doing' : null;
  const next: TaskStatus | null =
    task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : null;

  return (
    <View style={[cardStyles.card, { borderLeftColor: meta.color }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[cardStyles.title, task.status === 'done' && cardStyles.doneTitle]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.dueDate && (
          <Text style={[cardStyles.due, overdue && { color: colors.danger }]}>
            {formatKorean(task.dueDate)}
            {overdue ? ' · 기한 지남' : ''}
          </Text>
        )}
      </View>
      <View style={cardStyles.actions}>
        {prev && (
          <Pressable
            style={cardStyles.moveBtn}
            hitSlop={4}
            onPress={() => setTaskStatus(task.id, prev)}
          >
            <Text style={cardStyles.moveBtnText}>‹ {statusMeta[prev].label}</Text>
          </Pressable>
        )}
        {next && (
          <Pressable
            style={[cardStyles.moveBtn, { backgroundColor: statusMeta[next].bg }]}
            hitSlop={4}
            onPress={() => setTaskStatus(task.id, next)}
          >
            <Text style={[cardStyles.moveBtnText, { color: statusMeta[next].color }]}>
              {statusMeta[next].label} ›
            </Text>
          </Pressable>
        )}
        <Pressable
          style={cardStyles.deleteBtn}
          hitSlop={6}
          onPress={() =>
            confirmAction('업무 삭제', `"${task.title}"을(를) 삭제할까요?`, () =>
              deleteTask(task.id)
            )
          }
        >
          <Text style={cardStyles.deleteText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 8,
    gap: 8,
  },
  title: { fontSize: 15, color: colors.text, fontWeight: '500' },
  doneTitle: { textDecorationLine: 'line-through', color: colors.textSecondary },
  due: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  moveBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  deleteBtn: { padding: 6 },
  deleteText: { color: '#C7C7CC', fontSize: 14 },
});

export default function ChecklistScreen() {
  const { state, addTask, deleteEvent } = useStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [eventModalOpen, setEventModalOpen] = useState(false);

  // 선택된 날짜에 걸쳐 있는 기간 일정
  const selectedDateEvents = useMemo(
    () =>
      selectedDate
        ? state.events.filter((e) => e.start <= selectedDate && selectedDate <= e.end)
        : [],
    [state.events, selectedDate]
  );

  const visibleTasks = useMemo(
    () =>
      selectedDate ? state.tasks.filter((t) => t.dueDate === selectedDate) : state.tasks,
    [state.tasks, selectedDate]
  );

  const markers = useMemo(() => {
    const m: CalendarMarkers = {};
    for (const t of state.tasks) {
      if (!t.dueDate) continue;
      (m[t.dueDate] = m[t.dueDate] ?? []).push(t.status);
    }
    return m;
  }, [state.tasks]);

  const submit = () => {
    const title = input.trim();
    if (!title) return;
    addTask(title, selectedDate ?? undefined);
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
        {/* 필터 상태 표시 */}
        <View style={styles.filterRow}>
          <Text style={styles.filterText}>
            {selectedDate ? `${formatKorean(selectedDate)} 업무` : '전체 업무'}
          </Text>
          {selectedDate && (
            <Pressable onPress={() => setSelectedDate(null)} hitSlop={6}>
              <Text style={styles.clearFilter}>전체 보기</Text>
            </Pressable>
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
            state.events.map((e) => (
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
            ))
          )}
        </View>
      </ScrollView>

      <EventModal
        visible={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        initialDate={selectedDate}
      />

      {/* 추가 입력 바 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={
            selectedDate
              ? `${formatKorean(selectedDate)} 마감 업무 추가`
              : '새 업무 입력 (캘린더에서 날짜 선택 시 마감일 지정)'
          }
          placeholderTextColor={colors.textSecondary}
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterText: { fontSize: 17, fontWeight: '700', color: colors.text },
  clearFilter: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  section: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  count: { fontSize: 13, color: colors.textSecondary },
  empty: { fontSize: 13, color: '#C7C7CC', paddingVertical: 4, paddingLeft: 14 },
  calendarHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  eventChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  eventChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eventChipText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  eventSection: { marginTop: 18 },
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  eventAddBtn: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  eventColorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  eventRange: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  eventDelete: { color: '#C7C7CC', fontSize: 14, padding: 4 },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
