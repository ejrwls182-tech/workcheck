import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ChecklistScreen from './src/screens/ChecklistScreen';
import MemoScreen from './src/screens/MemoScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import { StoreProvider } from './src/store';
import { colors } from './src/theme';

type Tab = 'checklist' | 'routine' | 'memo';

const TABS: { key: Tab; label: string; icon: string; title: string }[] = [
  { key: 'checklist', label: '체크리스트', icon: '☑️', title: '체크리스트' },
  { key: 'routine', label: '루틴', icon: '🔁', title: '일일 · 주간 업무' },
  { key: 'memo', label: '메모', icon: '📝', title: '메모' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('checklist');
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <StoreProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <StatusBar style="dark" />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{current.title}</Text>
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
        </SafeAreaView>
      </SafeAreaProvider>
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 4,
    paddingTop: 2,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: colors.primary },
});
