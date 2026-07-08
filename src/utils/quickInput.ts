import { addDays, toKey } from './date';

/**
 * 자연어 빠른 입력 파서.
 * "업무보고 7/9까지" → { title: "업무보고", dueDate: "2026-07-09" }
 * 지원: M/D, M.D, M월 D일, 오늘/내일/모레, (이번주|다음주)? X요일 — 뒤에 "까지" 허용
 */
export interface QuickParse {
  title: string;
  dueDate?: string;
  /** 인식된 날짜 표현 원문 (힌트 표시용) */
  matched?: string;
}

const WEEKDAYS = '일월화수목금토';

export function parseQuickInput(raw: string, base: Date = new Date()): QuickParse {
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let text = raw;
  let due: Date | null = null;
  let matched: string | undefined;

  const tryMatch = (re: RegExp, toDate: (m: RegExpExecArray) => Date | null) => {
    if (due) return;
    const m = re.exec(text);
    if (!m) return;
    const d = toDate(m);
    if (!d) return;
    due = d;
    matched = m[0].trim();
    text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
  };

  /** 월/일 → 날짜. 이미 지난 날짜면 내년으로 */
  const mdDate = (month: number, day: number): Date | null => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    let d = new Date(today.getFullYear(), month - 1, day);
    if (d.getMonth() !== month - 1) return null; // 존재하지 않는 날짜 (예: 2/30)
    if (d < today) d = new Date(today.getFullYear() + 1, month - 1, day);
    return d;
  };

  /** 이번 주 월요일까지의 오프셋 */
  const monOffset = (weekday: number) => (weekday === 0 ? -6 : 1 - weekday);

  const weekdayDate = (prefix: string | undefined, ch: string): Date | null => {
    const target = WEEKDAYS.indexOf(ch);
    if (target < 0) return null;
    const fromMonday = target === 0 ? 6 : target - 1; // 월요일 기준 오프셋
    if (prefix && prefix.includes('다음')) {
      return addDays(today, monOffset(today.getDay()) + 7 + fromMonday);
    }
    if (prefix && prefix.includes('이번')) {
      return addDays(today, monOffset(today.getDay()) + fromMonday);
    }
    // 접두어 없음: 다가오는 해당 요일 (오늘이면 오늘)
    return addDays(today, (target - today.getDay() + 7) % 7);
  };

  // 1) "7월 9일(까지)"
  tryMatch(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?(?:\s*까지)?/, (m) => mdDate(+m[1], +m[2]));
  // 2) "7/9(까지)", "7.9"
  tryMatch(/(\d{1,2})\s*[\/.]\s*(\d{1,2})(?!\d)(?:\s*까지)?/, (m) => mdDate(+m[1], +m[2]));
  // 3) 오늘/내일/모레(까지)
  tryMatch(/(오늘|내일|모레)(?:\s*까지)?/, (m) =>
    addDays(today, { 오늘: 0, 내일: 1, 모레: 2 }[m[1] as '오늘' | '내일' | '모레'])
  );
  // 4) (이번주|다음주)? X요일(까지)
  tryMatch(/(다음\s*주|이번\s*주)?\s*([일월화수목금토])요일(?:\s*까지)?/, (m) =>
    weekdayDate(m[1], m[2])
  );

  const title = text.replace(/\s+/g, ' ').trim();
  return {
    title: title || raw.trim(),
    dueDate: due ? toKey(due) : undefined,
    matched,
  };
}
