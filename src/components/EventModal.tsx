import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { colors } from '../theme';
import { formatKorean, todayKey } from '../utils/date';
import Calendar from './Calendar';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 열릴 때 기본 시작일 (캘린더에서 선택돼 있던 날짜) */
  initialDate?: string | null;
}

/** 기간 일정 추가 모달 — 캘린더에서 시작일, 종료일을 차례로 탭해서 범위 선택 */
export default function EventModal({ visible, onClose, initialDate }: Props) {
  const { addEvent } = useStore();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  // 모달이 열릴 때마다 초기화
  const [wasVisible, setWasVisible] = useState(false);
  if (visible && !wasVisible) {
    setWasVisible(true);
    setTitle('');
    setStart(initialDate ?? null);
    setEnd(null);
  } else if (!visible && wasVisible) {
    setWasVisible(false);
  }

  const pick = (key: string | null) => {
    if (!key) return;
    if (!start || (start && end)) {
      // 새로 시작
      setStart(key);
      setEnd(null);
    } else if (key < start) {
      setStart(key);
    } else {
      setEnd(key);
    }
  };

  const canSave = title.trim().length > 0 && !!start;
  const save = () => {
    if (!canSave || !start) return;
    addEvent(title.trim(), start, end ?? start);
    onClose();
  };

  const rangeLabel = !start
    ? '캘린더에서 시작일을 탭하세요'
    : !end
      ? `${formatKorean(start)} 부터 — 종료일을 탭하세요 (하루짜리면 저장을 누르세요)`
      : `${formatKorean(start)} ~ ${formatKorean(end)}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.cancel}>취소</Text>
              </Pressable>
              <Text style={styles.headerTitle}>기간 일정 추가</Text>
              <Pressable onPress={save} hitSlop={8} disabled={!canSave}>
                <Text style={[styles.save, !canSave && styles.saveDisabled]}>저장</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="예: 오사카 출장, 제주도 여행"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.rangeLabel}>{rangeLabel}</Text>

            <Calendar
              selected={null}
              onSelect={pick}
              rangeStart={start}
              rangeEnd={end ?? start}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cancel: { fontSize: 15, color: colors.textSecondary },
  save: { fontSize: 15, color: colors.primary, fontWeight: '700' },
  saveDisabled: { color: '#C7C7CC' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  rangeLabel: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
});
