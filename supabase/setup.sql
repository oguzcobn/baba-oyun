-- CBN bulut eşitleme tablosu. Supabase > SQL Editor'e yapıştırıp bir kez "Run" ile çalıştır.
create table if not exists public.cbn_records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  store      text        not null check (store in ('notes','folders','tasks','events','items','meta')),
  id         text        not null check (char_length(id) between 1 and 80),
  data       jsonb,
  updated_at bigint      not null default 0,
  deleted    boolean     not null default false,
  server_at  timestamptz not null default clock_timestamp(),
  primary key (user_id, store, id)
);

-- Satır düzeyi güvenlik: herkes yalnızca kendi satırlarını görür ve değiştirir.
alter table public.cbn_records enable row level security;

drop policy if exists "cbn kendi satirlarini oku"   on public.cbn_records;
drop policy if exists "cbn kendi satirlarini ekle"  on public.cbn_records;
drop policy if exists "cbn kendi satirlarini degistir" on public.cbn_records;
drop policy if exists "cbn kendi satirlarini sil"   on public.cbn_records;

create policy "cbn kendi satirlarini oku" on public.cbn_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cbn kendi satirlarini ekle" on public.cbn_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cbn kendi satirlarini degistir" on public.cbn_records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cbn kendi satirlarini sil" on public.cbn_records
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Her yazmada sunucu zamanını ve sahibini sunucu belirler (istemci başkası adına yazamaz).
create or replace function public.cbn_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.server_at := clock_timestamp();
  new.user_id   := auth.uid();
  return new;
end $$;

drop trigger if exists cbn_touch on public.cbn_records;
create trigger cbn_touch before insert or update on public.cbn_records
  for each row execute function public.cbn_touch();

create index if not exists cbn_records_pull on public.cbn_records (user_id, server_at);

revoke all on public.cbn_records from anon;
grant select, insert, update, delete on public.cbn_records to authenticated;
