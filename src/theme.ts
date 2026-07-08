export const colors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  primary: '#007AFF',
  todo: '#8E8E93',
  doing: '#FF9500',
  done: '#34C759',
  danger: '#FF3B30',
  todoBg: '#F2F2F4',
  doingBg: '#FFF4E5',
  doneBg: '#EAF9EE',
};

/** 기간 일정 띠 색상 팔레트 — 일정 추가 순서대로 순환 */
export const EVENT_COLORS = ['#5856D6', '#FF2D55', '#00C7BE', '#AF52DE', '#FF9F0A'];

export const statusMeta = {
  todo: { label: '시작전', color: colors.todo, bg: colors.todoBg },
  doing: { label: '진행중', color: colors.doing, bg: colors.doingBg },
  done: { label: '완료', color: colors.done, bg: colors.doneBg },
} as const;
