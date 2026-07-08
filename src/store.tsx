import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useColorScheme } from 'react-native';
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
import { darkColors, EVENT_COLORS, lightColors, Palette } from './theme';
import { loadState, saveState } from './storage';

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'addTask'; title: string; dueDate?: string }
  | { type: 'setTaskStatus'; id: string; status: TaskStatus }
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
              }
            : t
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

interface StoreValue {
  state: AppState;
  ready: boolean;
  addTask: (title: string, dueDate?: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
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
  const readyRef = useRef(false);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    loadState().then((loaded) => {
      dispatch({ type: 'hydrate', state: loaded });
      readyRef.current = true;
      forceRender();
    });
  }, []);

  useEffect(() => {
    if (readyRef.current) saveState(state);
  }, [state]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready: readyRef.current,
      addTask: (title, dueDate) => dispatch({ type: 'addTask', title, dueDate }),
      setTaskStatus: (id, status) => dispatch({ type: 'setTaskStatus', id, status }),
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
    [state]
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
