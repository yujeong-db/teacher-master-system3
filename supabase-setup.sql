-- ============================================================
-- Teacher Talent Management System — Supabase 초기 설정
-- Supabase 대시보드 > SQL Editor 에서 이 스크립트 전체를 실행하세요.
-- ============================================================

-- 1) 전체 시스템 데이터를 담는 테이블 (기존 Netlify Blobs의 KV 저장 방식과 동일하게
--    id='main' 한 행에 모든 데이터를 JSON(jsonb)으로 저장합니다)
create table if not exists app_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_data enable row level security;

drop policy if exists "app_data anon read" on app_data;
create policy "app_data anon read" on app_data
  for select using (true);

drop policy if exists "app_data anon insert" on app_data;
create policy "app_data anon insert" on app_data
  for insert with check (true);

drop policy if exists "app_data anon update" on app_data;
create policy "app_data anon update" on app_data
  for update using (true) with check (true);

-- 2) 이력서 PDF 원본을 저장할 Storage 버킷
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

drop policy if exists "resumes anon read" on storage.objects;
create policy "resumes anon read" on storage.objects
  for select using (bucket_id = 'resumes');

drop policy if exists "resumes anon insert" on storage.objects;
create policy "resumes anon insert" on storage.objects
  for insert with check (bucket_id = 'resumes');

drop policy if exists "resumes anon update" on storage.objects;
create policy "resumes anon update" on storage.objects
  for update using (bucket_id = 'resumes') with check (bucket_id = 'resumes');

drop policy if exists "resumes anon delete" on storage.objects;
create policy "resumes anon delete" on storage.objects
  for delete using (bucket_id = 'resumes');
