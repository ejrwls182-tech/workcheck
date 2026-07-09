import { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { loadState, saveState } from './storage';
import { mergeStates, newRev, supabase } from './sync';
import { darkColors, EVENT_COLORS, lightColors, Palette } from './theme';
import {
  AppState,
  CalendarEvent,
  EMPTY_STATE,
  Memo,
  Routine,
  RoutineFreq,
  Task,
  TaskStatus,
  ThemeSetting,
} from './types';

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'addTask'; title: string; dueDate?: string }
  | { type: 'setTaskStatus'; id: string; status: TaskStatus }
  | { type: 'setTaskArchived'; id: string; archived: boolean }
  | { type: 'deleteTask'; id: string }
  | { type: 'addRoutine'; title: string; freq: RoutineFreq }
  | { type: 'toggleRoutine'; id: string; periodKey: string }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'upsertMemo'; memo: Memo }
  | { type: 'deleteMemo'; id: string }
  | { type: 'addEvent'; title: string; start: string; end: string }
  | { type: 'deleteEvent'; id: string }
  | { type: 'setTheme'; theme: ThemeSetting };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'addTask': {
      const task: Task = {
        id: newId(),
        title: action.title,
        status: 'todo',
        dueDate: action.dueDate,
        createdAt: Date.now(),
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }
    case 'setTaskStatus':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? {
                ...t,
                status: action.status,
                completedAt: action.status === 'done' ? Date.now() : undefined,
                archived: undefined, // 상태가 바뀌면 보관 지정 초기화
              }
            : t
        ),
      };
    case 'setTaskArchived':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, archived: action.archived } : t
        ),
      };
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'addRoutine': {
      const routine: Routine = {
        id: newId(),
        title: action.title,
        freq: action.freq,
        createdAt: Date.now(),
      };
      return { ...state, routines: [...state.routines, routine] };
    }
    case 'toggleRoutine': {
      const log = state.routineLog[action.id] ?? {};
      const next = { ...log, [action.periodKey]: !log[action.periodKey] };
      return { ...state, routineLog: { ...state.routineLog, [action.id]: next } };
    }
    case 'deleteRoutine': {
      const { [action.id]: _removed, ...restLog } = state.routineLog;
      return {
        ...state,
        routines: state.routines.filter((r) => r.id !== action.id),
        routineLog: restLog,
      };
    }
    case 'upsertMemo': {
      const exists = state.memos.some((m) => m.id === action.memo.id);
      return {
        ...state,
        memos: exists
          ? state.memos.map((m) => (m.id === action.memo.id ? action.memo : m))
          : [action.memo, ...state.memos],
      };
    }
    case 'deleteMemo':
      return { ...state, memos: state.memos.filter((m) => m.id !== action.id) };
    case 'addEvent': {
      const [start, end] =
        action.start <= action.end ? [action.start, action.end] : [action.end, action.start];
      const event: CalendarEvent = {
        id: newId(),
        title: action.title,
        start,
        end,
        colorIndex: state.events.length % EVENT_COLORS.length,
        createdAt: Date.now(),
      };
      const events = [...state.events, event].sort((a, b) =>
        a.start === b.start ? a.createdAt - b.createdAt : a.start < b.start ? -1 : 1
      );
      return { ...state, events };
    }
    case 'deleteEvent':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case 'setTheme':
      return { ...state, settings: { ...state.settings, theme: action.theme } };
    default:
      return state;
  }
}

export interface SyncInfo {
  /** Supabase 설정이 채워져 있는지 */
  enabled: boolean;
  session: Session | null;
  lastSyncAt: number | null;
  /** 성공 시 null, 실패 시 오류 메시지 반환 */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

interface StoreValue {
  state: AppState;
  ready: boolean;
  sync: SyncInfo;
  addTask: (title: string, dueDate?: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskArchived: (id: string, archived: boolean) => void;
  deleteTask: (id: string) => void;
  addRoutine: (title: string, freq: RoutineFreq) => void;
  toggleRoutine: (id: string, periodKey: string) => void;
  deleteRoutine: (id: string) => void;
  saveMemo: (memo: { id?: string; title: string; body: string }) => void;
  deleteMemo: (id: string) => void;
  addEvent: (title: string, start: string, end: string) => void;
  deleteEvent: (id: string) => void;
  setTheme: (theme: ThemeSetting) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  /** 로컬 변경이 아직 서버에 push되지 않은 상태 */
  const dirtyRef = useRef(false);
  /** 내가 마지막으로 push한 rev — 실시간 이벤트의 내 echo를 무시하는 데 사용 */
  const myRevRef = useRef<string | null>(null);
  /** 원격 상태를 적용하는 중이면 push를 건너뛴다 (ping-pong 방지) */
  const applyingRemoteRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) 로컬 저장소에서 복원
  useEffect(() => {
    loadState().then((loaded) => {
      applyingRemoteRef.current = true;
      dispatch({ type: 'hydrate', state: loaded });
      setReady(true);
    });
  }, []);

  // 2) 인증 세션 감시
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const pushState = useCallback(async (s: AppState) => {
    const sess = sessionRef.current;
    if (!supabase || !sess) return;
    const rev = newRev();
    myRevRef.current = rev;
    dirtyRef.current = false;
    const { error } = await supabase.from('app_state').upsert({
      user_id: sess.user.id,
      state: s,
      rev,
      updated_at: new Date().toISOString(),
    });
    if (!error) setLastSyncAt(Date.now());
  }, []);

  const applyRemote = useCallback((remote: Partial<AppState>) => {
    applyingRemoteRef.current = true;
    dispatch({ type: 'hydrate', state: { ...EMPTY_STATE, ...remote } });
    setLastSyncAt(Date.now());
  }, []);

  const pullLatest = useCallback(async () => {
    const sess = sessionRef.current;
    if (!supabase || !sess || dirtyRef.current) return;
    const { data } = await supabase
      .from('app_state')
      .select('state, rev')
      .eq('user_id', sess.user.id)
      .maybeSingle();
    if (data?.state && data.rev !== myRevRef.current) applyRemote(data.state);
  }, [applyRemote]);

  // 3) 로그인 후 최초 동기화 + 실시간 구독 + 화면 복귀 시 갱신
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!supabase || !userId || !ready) return;
    const sb = supabase;
    let cancelled = false;

    (async () => {
      const { data } = await sb
        .from('app_state')
        .select('state')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.state) {
        // 최초 1회: 기기 데이터와 서버 데이터 병합 (유실 방지)
        const merged = mergeStates(stateRef.current, data.state);
        applyingRemoteRef.current = true;
        dispatch({ type: 'hydrate', state: merged });
        await pushState(merged);
      } else {
        await pushState(stateRef.current);
      }
    })();

    const channel = sb
      .channel(`app_state_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { state?: Partial<AppState>; rev?: string } | null;
          if (!row?.state || row.rev === myRevRef.current) return;
          if (dirtyRef.current) return; // 내 변경이 곧 push됨 (last-write-wins)
          applyRemote(row.state);
        }
      )
      .subscribe();

    // 웹/PWA: 화면으로 돌아오면 최신 상태 확인 (실시간 놓침 대비)
    let onVisibility: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisibility = () => {
        if (document.visibilityState === 'visible') pullLatest();
      };
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, ready, pushState, pullLatest, applyRemote]);

  // 4) 상태 변경 시: 로컬 저장 + (로그인 상태면) 서버 push 예약
  useEffect(() => {
    if (!ready) return;
    saveState(state);
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return; // 방금 적용한 원격 상태를 다시 push하지 않는다
    }
    if (supabase && sessionRef.current) {
      dirtyRef.current = true;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => pushState(stateRef.current), 800);
    }
  }, [state, ready, pushState]);

  const sync = useMemo<SyncInfo>(
    () => ({
      enabled: !!supabase,
      session,
      lastSyncAt,
      signIn: async (email, password) => {
        if (!supabase) return 'Supabase 설정이 필요합니다';
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
      },
      signUp: async (email, password) => {
        if (!supabase) return 'Supabase 설정이 필요합니다';
        const { error } = await supabase.auth.signUp({ email, password });
        return error ? error.message : null;
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [session, lastSyncAt]
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      sync,
      addTask: (title, dueDate) => dispatch({ type: 'addTask', title, dueDate }),
      setTaskStatus: (id, status) => dispatch({ type: 'setTaskStatus', id, status }),
      setTaskArchived: (id, archived) => dispatch({ type: 'setTaskArchived', id, archived }),
      deleteTask: (id) => dispatch({ type: 'deleteTask', id }),
      addRoutine: (title, freq) => dispatch({ type: 'addRoutine', title, freq }),
      toggleRoutine: (id, periodKey) => dispatch({ type: 'toggleRoutine', id, periodKey }),
      deleteRoutine: (id) => dispatch({ type: 'deleteRoutine', id }),
      saveMemo: ({ id, title, body }) =>
        dispatch({
          type: 'upsertMemo',
          memo: { id: id ?? newId(), title, body, updatedAt: Date.now() },
        }),
      deleteMemo: (id) => dispatch({ type: 'deleteMemo', id }),
      addEvent: (title, start, end) => dispatch({ type: 'addEvent', title, start, end }),
      deleteEvent: (id) => dispatch({ type: 'deleteEvent', id }),
      setTheme: (theme) => dispatch({ type: 'setTheme', theme }),
    }),
    [state, ready, sync]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/** 현재 테마 팔레트. 설정이 'system'이면 기기 다크모드를 따라간다 */
export function useTheme(): {
  c: Palette;
  mode: 'light' | 'dark';
  setting: ThemeSetting;
  setTheme: (t: ThemeSetting) => void;
} {
  const { state, setTheme } = useStore();
  const system = useColorScheme();
  const setting = state.settings?.theme ?? 'system';
  const mode: 'light' | 'dark' =
    setting === 'system' ? (system === 'dark' ? 'dark' : 'light') : setting;
  return { c: mode === 'dark' ? darkColors : lightColors, mode, setting, setTheme };
}
