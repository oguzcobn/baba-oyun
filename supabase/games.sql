-- BABA. Oyunlar · Aile skor tablosu + Draft düellosu
-- Supabase > SQL Editor'e yapıştırıp bir kez "Run". Önce messenger.sql çalışmış olmalı (arkadaşlık bilgisi oradan gelir).
-- Tekrar çalıştırmak güvenlidir. Herkes yalnızca kendi skorlarını ve Messenger'daki onaylı arkadaşlarının skorlarını görür.

-- ---------- skorlar ----------
create table if not exists public.game_scores (
  id     bigint generated always as identity primary key,
  member uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game   text not null check (game in ('draft','2048','blocks','sudoku','mines')),
  score  int  not null check (score between 0 and 100000000),
  meta   jsonb not null default '{}'::jsonb check (pg_column_size(meta) < 2000),
  at     timestamptz not null default now()
);
create index if not exists game_scores_member on public.game_scores (member, game);
create index if not exists game_scores_at on public.game_scores (at desc);

-- ---------- Draft kadroları ve düellolar ----------
create table if not exists public.draft_squads (
  member     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null check (pg_column_size(data) < 30000),
  updated_at timestamptz not null default now()
);
create table if not exists public.draft_matches (
  id   bigint generated always as identity primary key,
  home uuid not null default auth.uid() references auth.users (id) on delete cascade,
  away uuid not null references auth.users (id) on delete cascade,
  hs   int not null check (hs between 0 and 30),
  aws  int not null check (aws between 0 and 30),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  at   timestamptz not null default now(),
  check (home <> away)
);
create index if not exists draft_matches_home on public.draft_matches (home, at desc);
create index if not exists draft_matches_away on public.draft_matches (away, at desc);

alter table public.game_scores   enable row level security;
alter table public.draft_squads  enable row level security;
alter table public.draft_matches enable row level security;

drop policy if exists gs_sel on public.game_scores;
drop policy if exists gs_ins on public.game_scores;
create policy gs_sel on public.game_scores for select to authenticated using ((select auth.uid()) = member or public.msn_can_msg((select auth.uid()), member));
create policy gs_ins on public.game_scores for insert to authenticated with check ((select auth.uid()) = member);

drop policy if exists dsq_sel on public.draft_squads;
drop policy if exists dsq_ins on public.draft_squads;
drop policy if exists dsq_upd on public.draft_squads;
create policy dsq_sel on public.draft_squads for select to authenticated using ((select auth.uid()) = member or public.msn_can_msg((select auth.uid()), member));
create policy dsq_ins on public.draft_squads for insert to authenticated with check ((select auth.uid()) = member);
create policy dsq_upd on public.draft_squads for update to authenticated using ((select auth.uid()) = member) with check ((select auth.uid()) = member);

drop policy if exists dm_sel on public.draft_matches;
drop policy if exists dm_ins on public.draft_matches;
create policy dm_sel on public.draft_matches for select to authenticated using ((select auth.uid()) in (home, away));
create policy dm_ins on public.draft_matches for insert to authenticated with check (
  (select auth.uid()) = home and public.msn_can_msg(home, away)
  and exists (select 1 from public.draft_squads s where s.member = away));

-- sahibi ve zamanı sunucu belirler; aşırı kayıt sınırı (saatte 120 skor, 40 maç)
create or replace function public.games_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'game_scores' then
    new.member := auth.uid(); new.at := now();
    if (select count(*) from public.game_scores where member = new.member and at > now() - interval '1 hour') >= 120 then raise exception 'too many scores'; end if;
  elsif tg_table_name = 'draft_squads' then
    new.member := auth.uid(); new.updated_at := now();
  elsif tg_table_name = 'draft_matches' then
    new.home := auth.uid(); new.at := now();
    if (select count(*) from public.draft_matches where home = new.home and at > now() - interval '1 hour') >= 40 then raise exception 'too many matches'; end if;
  end if;
  return new;
end $$;
drop trigger if exists games_guard on public.game_scores;
drop trigger if exists games_guard on public.draft_squads;
drop trigger if exists games_guard on public.draft_matches;
create trigger games_guard before insert on public.game_scores for each row execute function public.games_guard();
create trigger games_guard before insert or update on public.draft_squads for each row execute function public.games_guard();
create trigger games_guard before insert on public.draft_matches for each row execute function public.games_guard();

-- Skor tablosu: kişi ve oyun başına en iyi skor (yalnızca görmeye izin verilen satırlar üzerinden hesaplanır).
create or replace function public.game_board(p_since timestamptz) returns table (member uuid, game text, best int, low int, plays int)
language sql stable security invoker set search_path = '' as $$
  select s.member, s.game, max(s.score), min(s.score), count(*)::int
  from public.game_scores s
  where s.at >= coalesce(p_since, '-infinity'::timestamptz)
  group by s.member, s.game;
$$;

revoke all on public.game_scores, public.draft_squads, public.draft_matches from anon, authenticated;
grant select, insert on public.game_scores to authenticated;
grant select, insert, update on public.draft_squads to authenticated;
grant select, insert on public.draft_matches to authenticated;
revoke all on function public.game_board(timestamptz) from public, anon;
grant execute on function public.game_board(timestamptz) to authenticated;
