const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

/** "YYYY-MM-DD" → Date (로컬 자정) */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 해당 날짜가 속한 주의 월요일 키 — 주간 루틴 기록에 사용 */
export function weekKey(d: Date = new Date()): string {
  const day = d.getDay(); // 0=일
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return toKey(monday);
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** "YYYY-MM-DD" → "7월 8일 (화)" */
export function formatKorean(key: string): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_LABELS[d.getDay()]})`;
}

/** 마감일이 오늘보다 이전인지 */
export function isOverdue(key: string): boolean {
  return key < todayKey();
}

/** 이번 주 범위 문자열 "7/6 ~ 7/12" */
export function weekRangeLabel(d: Date = new Date()): string {
  const monday = fromKey(weekKey(d));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const f = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;
  return `${f(monday)} ~ ${f(sunday)}`;
}
