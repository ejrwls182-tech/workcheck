export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** 마감일 (YYYY-MM-DD). 없으면 날짜 미지정 업무 */
  dueDate?: string;
  createdAt: number;
  completedAt?: number;
}

export type RoutineFreq = 'daily' | 'weekly';

export interface Routine {
  id: string;
  title: string;
  freq: RoutineFreq;
  createdAt: number;
}

/**
 * 루틴 완료 기록.
 * daily 루틴은 날짜 키(YYYY-MM-DD), weekly 루틴은 그 주 월요일 날짜 키를 사용한다.
 * ex) { "routine-id": { "2026-07-08": true } }
 */
export type RoutineLog = Record<string, Record<string, boolean>>;

export interface Memo {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

/** 기간 일정 (출장, 여행 등) — start~end 범위가 캘린더에 색상 띠로 표시된다 */
export interface CalendarEvent {
  id: string;
  title: string;
  /** 시작일 (YYYY-MM-DD) */
  start: string;
  /** 종료일 (YYYY-MM-DD, start와 같으면 하루짜리) */
  end: string;
  /** EVENT_COLORS 팔레트 인덱스 */
  colorIndex: number;
  createdAt: number;
}

export interface AppState {
  tasks: Task[];
  routines: Routine[];
  routineLog: RoutineLog;
  memos: Memo[];
  events: CalendarEvent[];
}

export const EMPTY_STATE: AppState = {
  tasks: [],
  routines: [],
  routineLog: {},
  memos: [],
  events: [],
};
