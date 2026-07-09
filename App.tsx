import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import SettingsModal from './src/components/SettingsModal';
import ChecklistScreen from './src/screens/ChecklistScreen';
import MemoScreen from './src/screens/MemoScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import { StoreProvider, useTheme } from './src/store';
import { Palette } from './src/theme';
import { ThemeSetting } from './src/types';

type Tab = 'checklist' | 'routine' | 'memo';

const TABS: { key: Tab; label: string; icon: string; title: string }[] = [
  { key: 'checklist', label: '체크리스트', icon: '☑️', title: '체크리스트' },
  { key: 'routine', label: '루틴', icon: '🔁', title: '일일 · 주간 업무' },
  { key: 'memo', label: '메모', icon: '📝', title: '메모' },
];

const THEME_CYCLE: ThemeSetting[] = ['system', 'light', 'dark'];
const THEME_ICON: Record<ThemeSetting, string> = { system: '🌓', light: '☀️', dark: '🌙' };
const THEME_LABEL: Record<ThemeSetting, string> = { system: '자동', light: '라이트', dark: '다크' };

function Root() {
  const [tab, setTab] = useState<Tab>('checklist');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { c, mode, setting, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const current = TABS.find((t) => t.key === tab)!;

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(setting) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{current.title}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.themeBtn} onPress={cycleTheme} hitSlop={6}>
            <Text style={styles.themeIcon}>{THEME_ICON[setting]}</Text>
            <Text style={styles.themeLabel}>{THEME_LABEL[setting]}</Text>
          </Pressable>
          <Pressable style={styles.themeBtn} onPress={() => setSettingsOpen(true)} hitSlop={6}>
            <Text style={styles.themeIcon}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {tab === 'checklist' && <ChecklistScreen />}
        {tab === 'routine' && <RoutineScreen />}
        {tab === 'memo' && <MemoScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </StoreProvider>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: c.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    themeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    themeIcon: { fontSize: 13 },
    themeLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    body: { flex: 1 },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingBottom: 4,
      paddingTop: 2,
    },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
    tabIcon: { fontSize: 18 },
    tabLabel: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    tabLabelActive: { color: c.primary },
  });
