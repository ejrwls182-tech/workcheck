import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';
import { AppState, EMPTY_STATE } from './types';

/**
 * Supabase 클라이언트. 설정이 비어 있으면 null — 앱은 로컬 저장만 사용한다.
 * 동기화 모델: 사용자당 app_state 한 행에 전체 상태(JSONB)를 저장하는 last-write-wins.
 * 최초 로그인 시에는 기기 데이터와 서버 데이터를 id 단위로 병합해 유실을 막는다.
 */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item); // 같은 id는 원격 우선
  return [...map.values()];
}

/** 최초 로그인 시 1회 사용하는 병합 — 양쪽 데이터를 합집합으로 보존 */
export function mergeStates(local: AppState, remote: Partial<AppState>): AppState {
  const r = { ...EMPTY_STATE, ...remote };

  const routineLog: AppState['routineLog'] = { ...local.routineLog };
  for (const [routineId, periods] of Object.entries(r.routineLog)) {
    routineLog[routineId] = { ...routineLog[routineId], ...periods };
  }

  return {
    tasks: mergeById(local.tasks, r.tasks).sort((a, b) => b.createdAt - a.createdAt),
    routines: mergeById(local.routines, r.routines).sort((a, b) => a.createdAt - b.createdAt),
    memos: mergeById(local.memos, r.memos).sort((a, b) => b.updatedAt - a.updatedAt),
    events: mergeById(local.events, r.events).sort((a, b) =>
      a.start === b.start ? a.createdAt - b.createdAt : a.start < b.start ? -1 : 1
    ),
    routineLog,
    settings: r.settings ?? local.settings,
  };
}

export function newRev(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
