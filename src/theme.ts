export interface Palette {
  background: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  /** 아주 옅은 텍스트/아이콘 (플레이스홀더, 삭제 버튼 등) */
  faint: string;
  primary: string;
  onPrimary: string;
  /** 오늘 날짜/범위 강조 배경 */
  todayBg: string;
  inputBg: string;
  todo: string;
  doing: string;
  done: string;
  danger: string;
  todoBg: string;
  doingBg: string;
  doneBg: string;
  overlay: string;
}

export const lightColors: Palette = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  faint: '#C7C7CC',
  primary: '#007AFF',
  onPrimary: '#FFFFFF',
  todayBg: '#E8F1FF',
  inputBg: '#F2F2F7',
  todo: '#8E8E93',
  doing: '#FF9500',
  done: '#34C759',
  danger: '#FF3B30',
  todoBg: '#F2F2F4',
  doingBg: '#FFF4E5',
  doneBg: '#EAF9EE',
  overlay: 'rgba(0,0,0,0.35)',
};

export const darkColors: Palette = {
  background: '#000000',
  card: '#1C1C1E',
  border: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#98989D',
  faint: '#48484A',
  primary: '#0A84FF',
  onPrimary: '#FFFFFF',
  todayBg: '#0A2A4D',
  inputBg: '#2C2C2E',
  todo: '#98989D',
  doing: '#FF9F0A',
  done: '#30D158',
  danger: '#FF453A',
  todoBg: '#2C2C2E',
  doingBg: '#3A2E17',
  doneBg: '#17361F',
  overlay: 'rgba(0,0,0,0.6)',
};

/** 기간 일정 띠 색상 팔레트 — 일정 추가 순서대로 순환 (라이트/다크 공용) */
export const EVENT_COLORS = ['#5856D6', '#FF2D55', '#00C7BE', '#AF52DE', '#FF9F0A'];

export function getStatusMeta(c: Palette) {
  return {
    todo: { label: '시작전', color: c.todo, bg: c.todoBg },
    doing: { label: '진행중', color: c.doing, bg: c.doingBg },
    done: { label: '완료', color: c.done, bg: c.doneBg },
  } as const;
}
