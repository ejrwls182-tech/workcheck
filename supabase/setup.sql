-- 업무체크 앱 DB 설정
-- Supabase 대시보드 → SQL Editor → New query에 전체 붙여넣고 Run 하세요.

-- 사용자별 앱 상태 (한 사용자당 한 행, 전체 상태를 JSONB로 저장)
create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  rev text,
  updated_at timestamptz not null default now()
);

-- 행 수준 보안: 본인 데이터만 읽고 쓸 수 있음
alter table public.app_state enable row level security;

create policy "own_state_select" on public.app_state
  for select using (auth.uid() = user_id);

create policy "own_state_insert" on public.app_state
  for insert with check (auth.uid() = user_id);

create policy "own_state_update" on public.app_state
  for update using (auth.uid() = user_id);

-- 실시간 동기화 활성화 (PC ↔ 아이폰 즉시 반영)
alter publication supabase_realtime add table public.app_state;
