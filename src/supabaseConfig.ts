/**
 * Supabase 프로젝트 접속 정보.
 * 두 값이 모두 채워져야 동기화가 활성화된다. 비어 있으면 앱은 기기 로컬 저장만 사용.
 *
 * - SUPABASE_URL: Project Settings → API → Project URL
 * - SUPABASE_ANON_KEY: Project Settings → API → anon public key
 *   (anon 키는 공개돼도 되는 키로, 데이터 보호는 RLS 정책이 담당한다 — supabase/setup.sql 참고)
 */
export const SUPABASE_URL = 'https://iysfmvsunqfiltppglgr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5c2ZtdnN1bnFmaWx0cHBnbGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDQ5MzksImV4cCI6MjA5OTEyMDkzOX0.siqPXhEJ1j8C-98-LbSLhNNhicqsENBziaHOMXmhPnw';
