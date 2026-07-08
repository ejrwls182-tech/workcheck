import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore, useTheme } from '../store';
import { Palette } from '../theme';
import { Memo } from '../types';
import { confirmAction } from '../utils/confirm';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

interface Draft {
  id?: string;
  title: string;
  body: string;
}

export default function MemoScreen() {
  const { state, saveMemo, deleteMemo } = useStore();
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');

  const openNew = () => setDraft({ title: '', body: '' });
  const openEdit = (m: Memo) => setDraft({ id: m.id, title: m.title, body: m.body });

  const close = () => setDraft(null);
  const save = () => {
    if (!draft) return;
    const title = draft.title.trim() || draft.body.trim().split('\n')[0].slice(0, 30);
    if (!title && !draft.body.trim()) {
      close();
      return;
    }
    saveMemo({ id: draft.id, title: title || '제목 없음', body: draft.body });
    close();
  };

  const q = query.trim().toLowerCase();
  const memos = q
    ? state.memos.filter(
        (m) => m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
      )
    : state.memos;

  return (
    <View style={{ flex: 1 }}>
      {/* 검색 */}
      {state.memos.length > 0 && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 메모 검색"
            placeholderTextColor={c.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {state.memos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>
              아직 메모가 없습니다.{'\n'}오른쪽 아래 + 버튼으로 작성해 보세요.
            </Text>
          </View>
        ) : memos.length === 0 ? (
          <Text style={styles.noResult}>"{query}" 검색 결과가 없습니다</Text>
        ) : (
          memos.map((m) => (
            <Pressable key={m.id} style={styles.memoCard} onPress={() => openEdit(m)}>
              <Text style={styles.memoTitle} numberOfLines={1}>
                {m.title}
              </Text>
              {!!m.body && (
                <Text style={styles.memoPreview} numberOfLines={2}>
                  {m.body}
                </Text>
              )}
              <Text style={styles.memoTime}>{formatTime(m.updatedAt)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <Modal visible={draft !== null} animationType="slide" onRequestClose={save}>
        {draft && (
          <KeyboardAvoidingView
            style={styles.editor}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.editorHeader}>
              <Pressable onPress={close} hitSlop={8}>
                <Text style={styles.editorCancel}>취소</Text>
              </Pressable>
              <Text style={styles.editorTitle}>{draft.id ? '메모 수정' : '새 메모'}</Text>
              <Pressable onPress={save} hitSlop={8}>
                <Text style={styles.editorSave}>저장</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="제목"
              placeholderTextColor={c.textSecondary}
              value={draft.title}
              onChangeText={(t) => setDraft({ ...draft, title: t })}
            />
            <TextInput
              style={styles.bodyInput}
              placeholder="내용을 입력하세요"
              placeholderTextColor={c.textSecondary}
              value={draft.body}
              onChangeText={(t) => setDraft({ ...draft, body: t })}
              multiline
              textAlignVertical="top"
            />
            {draft.id && (
              <Pressable
                style={styles.deleteMemoBtn}
                onPress={() =>
                  confirmAction('메모 삭제', '이 메모를 삭제할까요?', () => {
                    deleteMemo(draft.id!);
                    close();
                  })
                }
              >
                <Text style={styles.deleteMemoText}>메모 삭제</Text>
              </Pressable>
            )}
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    searchWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
    searchInput: {
      backgroundColor: c.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 14,
      color: c.text,
    },
    content: { padding: 16, paddingBottom: 100 },
    emptyWrap: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyEmoji: { fontSize: 40 },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
    noResult: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginTop: 40 },
    memoCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    memoTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    memoPreview: { fontSize: 13, color: c.textSecondary, marginTop: 4, lineHeight: 19 },
    memoTime: { fontSize: 11, color: c.faint, marginTop: 8 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
      elevation: 5,
    },
    fabText: { color: c.onPrimary, fontSize: 28, lineHeight: 32 },
    editor: {
      flex: 1,
      backgroundColor: c.card,
      paddingTop: Platform.OS === 'ios' ? 54 : 16,
    },
    editorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    editorCancel: { fontSize: 16, color: c.textSecondary },
    editorTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    editorSave: { fontSize: 16, color: c.primary, fontWeight: '700' },
    titleInput: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    bodyInput: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      paddingHorizontal: 16,
      paddingVertical: 14,
      lineHeight: 22,
    },
    deleteMemoBtn: { padding: 16, alignItems: 'center' },
    deleteMemoText: { color: c.danger, fontSize: 15, fontWeight: '600' },
  });
