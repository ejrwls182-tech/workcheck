import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore, useTheme } from '../store';
import { Palette } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function formatSyncTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** 설정 모달 — 계정(동기화) 관리 */
export default function SettingsModal({ visible, onClose }: Props) {
  const { sync } = useStore();
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>, successMsg: string) => {
    setBusy(true);
    setMessage(null);
    const error = await fn();
    setBusy(false);
    setMessage(error ?? successMsg);
    if (!error) {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>⚙️ 설정</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.closeBtn}>닫기</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>동기화 계정</Text>

            {!sync.enabled ? (
              <Text style={styles.guide}>
                아직 서버 연동 준비 중입니다.{'\n'}
                Supabase 프로젝트가 연결되면 여기서 로그인해{'\n'}
                아이폰과 PC의 데이터를 실시간으로 동기화할 수 있어요.
              </Text>
            ) : sync.session ? (
              <>
                <View style={styles.accountRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountEmail}>{sync.session.user.email}</Text>
                    <Text style={styles.syncStatus}>
                      ✅ 동기화 켜짐
                      {sync.lastSyncAt ? ` · 마지막 동기화 ${formatSyncTime(sync.lastSyncAt)}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.guide}>
                  같은 계정으로 PC 브라우저에서도 로그인하면{'\n'}어디서 입력하든 몇 초 안에 서로
                  반영됩니다.
                </Text>
                <Pressable
                  style={styles.signOutBtn}
                  onPress={() => run(async () => (await sync.signOut(), null), '로그아웃했습니다')}
                >
                  <Text style={styles.signOutText}>로그아웃</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.guide}>
                  로그인하면 데이터가 클라우드에 백업되고,{'\n'}같은 계정의 모든 기기(아이폰·PC)와
                  실시간 동기화됩니다.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor={c.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 (6자 이상)"
                  placeholderTextColor={c.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <View style={styles.btnRow}>
                  <Pressable
                    style={[styles.authBtn, styles.primaryBtn]}
                    disabled={busy}
                    onPress={() => run(() => sync.signIn(email.trim(), password), '로그인 성공!')}
                  >
                    <Text style={styles.primaryBtnText}>로그인</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.authBtn, styles.secondaryBtn]}
                    disabled={busy}
                    onPress={() =>
                      run(
                        () => sync.signUp(email.trim(), password),
                        '가입 완료! 이제 로그인해 주세요.'
                      )
                    }
                  >
                    <Text style={styles.secondaryBtnText}>회원가입</Text>
                  </Pressable>
                </View>
              </>
            )}

            {busy && <ActivityIndicator style={{ marginTop: 10 }} color={c.primary} />}
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 20,
      paddingBottom: 34,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: c.text },
    closeBtn: { fontSize: 15, color: c.primary, fontWeight: '600' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8 },
    guide: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 12 },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    accountEmail: { fontSize: 15, fontWeight: '700', color: c.text },
    syncStatus: { fontSize: 12, color: c.done, marginTop: 4 },
    input: {
      backgroundColor: c.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
      color: c.text,
      marginBottom: 8,
    },
    btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    authBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtn: { backgroundColor: c.primary },
    primaryBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
    secondaryBtn: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    secondaryBtnText: { color: c.text, fontWeight: '700', fontSize: 15 },
    signOutBtn: { alignItems: 'center', paddingVertical: 10 },
    signOutText: { color: c.danger, fontSize: 15, fontWeight: '600' },
    message: { fontSize: 13, color: c.primary, marginTop: 10, textAlign: 'center' },
  });
