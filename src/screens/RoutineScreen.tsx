import React, { useState } from 'react';
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
import { useStore } from '../store';
import { colors } from '../theme';
import { Routine, RoutineFreq } from '../types';
import { confirmAction } from '../utils/confirm';
import { formatKorean, todayKey, weekKey, weekRangeLabel } from '../utils/date';

function RoutineRow({ routine, periodKey }: { routine: Routine; periodKey: string }) {
  const { state, toggleRoutine, deleteRoutine } = useStore();
  const checked = !!state.routineLog[routine.id]?.[periodKey];

  return (
    <Pressable
      style={styles.row}
      onPress={() => toggleRoutine(routine.id, periodKey)}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.rowTitle, checked && styles.rowTitleDone]} numberOfLines={2}>
        {routine.title}
      </Text>
      <Pressable
        hitSlop={6}
        style={styles.deleteBtn}
        onPress={() =>
          confirmAction('루틴 삭제', `"${routine.title}"을(를) 삭제할까요?`, () =>
            deleteRoutine(routine.id)
          )
        }
      >
        <Text style={styles.deleteText}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

function Section({
  title,
  subtitle,
  routines,
  periodKey,
}: {
  title: string;
  subtitle: string;
  routines: Routine[];
  periodKey: string;
}) {
  const { state } = useStore();
  const doneCount = routines.filter((r) => state.routineLog[r.id]?.[periodKey]).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <Text
          style={[
            styles.progress,
            routines.length > 0 && doneCount === routines.length && { color: colors.done },
          ]}
        >
          {routines.length > 0 ? `${doneCount}/${routines.length} 완료` : ''}
        </Text>
      </View>
      {routines.length === 0 ? (
        <Text style={styles.empty}>아래 입력창에서 루틴을 추가해 보세요</Text>
      ) : (
        routines.map((r) => <RoutineRow key={r.id} routine={r} periodKey={periodKey} />)
      )}
    </View>
  );
}

export default function RoutineScreen() {
  const { state, addRoutine } = useStore();
  const [input, setInput] = useState('');
  const [freq, setFreq] = useState<RoutineFreq>('daily');

  const today = todayKey();
  const thisWeek = weekKey();
  const daily = state.routines.filter((r) => r.freq === 'daily');
  const weekly = state.routines.filter((r) => r.freq === 'weekly');

  const submit = () => {
    const title = input.trim();
    if (!title) return;
    addRoutine(title, freq);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageHint}>
          매일 · 매주 반복되는 업무입니다. 일일 업무는 자정에, 주간 업무는 월요일에 자동으로
          초기화됩니다.
        </Text>
        <Section
          title="오늘의 일일 업무"
          subtitle={formatKorean(today)}
          routines={daily}
          periodKey={today}
        />
        <Section
          title="이번 주 주간 업무"
          subtitle={weekRangeLabel()}
          routines={weekly}
          periodKey={thisWeek}
        />
      </ScrollView>

      <View style={styles.inputBar}>
        <View style={styles.freqToggle}>
          {(['daily', 'weekly'] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.freqBtn, freq === f && styles.freqBtnOn]}
              onPress={() => setFreq(f)}
            >
              <Text style={[styles.freqText, freq === f && styles.freqTextOn]}>
                {f === 'daily' ? '매일' : '매주'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder={freq === 'daily' ? '예: 퇴근 전 보안점검' : '예: 주간 업무보고 작성'}
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
  content: { padding: 16, paddingBottom: 24 },
  pageHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 14 },
  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  progress: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  empty: { fontSize: 13, color: '#C7C7CC', paddingVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.done, borderColor: colors.done },
  checkmark: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  rowTitle: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  rowTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#C7C7CC', fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  freqToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 2,
  },
  freqBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  freqBtnOn: { backgroundColor: colors.card },
  freqText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  freqTextOn: { color: colors.text },
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
    paddingVertical: 10,
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
