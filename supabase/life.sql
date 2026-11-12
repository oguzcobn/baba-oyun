-- =====================================================================
-- BABA. HAYAT — çok oyunculu dünya (isteğe bağlı)
-- Önce supabase/messenger.sql çalışmış olmalı (msn_friends ve msn_can_msg kullanılır).
-- Supabase → SQL Editor → bu dosyanın tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir.
--
-- Gizlilik:
--  * Oyun Messenger mesajlarını OKUMAZ; bu dosya msn_messages / msn_room_messages tablolarına dokunmaz.
--  * life_chars yalnızca oyuncunun açıkça izin verdiği küçük karakter kartını tutar
--    (karakter adı, simge, yaş, oyundaki meslek, ruh hâli, semt) ve yalnızca karşılıklı
--    Messenger arkadaşları görebilir. Oyuncu dünyadan ayrılınca kart silinir.
-- =====================================================================

create table if not exists public.life_chars (
  member     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint life_chars_size check (pg_column_size(data) < 2048)
);

create table if not exists public.life_meets (
  id          bigint generated always as identity primary key,
  a           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  b           uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('meet','activity')),
  activity    text check (activity is null or char_length(activity) <= 60),
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  at          timestamptz not null default now(),
  answered_at timestamptz,
  constraint life_meets_not_self check (a <> b)
);
create index if not exists life_meets_b_idx on public.life_meets (b, status);
create index if not exists life_meets_a_idx on public.life_meets (a, at desc);

-- kartı yalnızca izin verilen alanlarla tut
create or replace function public.life_chars_guard() returns trigger
language plpgsql set search_path = '' as $$
declare d jsonb := coalesce(new.data, '{}'::jsonb);
begin
  new.member := auth.uid();
  new.updated_at := now();
  new.data := jsonb_strip_nulls(jsonb_build_object(
    'name',     left(coalesce(d->>'name', ''), 32),
    'avatar',   left(coalesce(d->>'avatar', ''), 8),
    'age',      case when (d->>'age') ~ '^\d{1,3}$' then (d->>'age')::int end,
    'job',      left(d->>'job', 48),
    'mood',     left(d->>'mood', 4),
    'district', case when d->>'district' in ('merkez','sahil','eski','tekno','vadi') then d->>'district' end,
    'year',     case when (d->>'year') ~ '^\d{4}$' then (d->>'year')::int end,
    'month',    case when (d->>'month') ~ '^\d{1,2}$' then (d->>'month')::int end));
  return new;
end $$;
drop trigger if exists life_chars_guard on public.life_chars;
create trigger life_chars_guard before insert or update on public.life_chars
  for each row execute function public.life_chars_guard();

-- davet kuralları: yalnızca dünyaya katılmış Messenger arkadaşlarına, saatte en fazla 20, aynı kişiye tek bekleyen davet
create or replace function public.life_meets_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.a := auth.uid(); new.status := 'pending'; new.at := now(); new.answered_at := null;
    if not public.msn_can_msg(new.a, new.b) then raise exception 'Bu kişiyle Messenger''da arkadaş değilsiniz'; end if;
    if not exists (select 1 from public.life_chars where member = new.a)
       or not exists (select 1 from public.life_chars where member = new.b) then
      raise exception 'İki oyuncunun da dünyaya katılmış olması gerekir'; end if;
    if (select count(*) from public.life_meets where a = new.a and at > now() - interval '1 hour') >= 20 then
      raise exception 'Çok fazla davet gönderdin, biraz bekle'; end if;
    if exists (select 1 from public.life_meets where status = 'pending'
               and ((a = new.a and b = new.b) or (a = new.b and b = new.a))) then
      raise exception 'Zaten bekleyen bir davet var'; end if;
    return new;
  end if;
  -- UPDATE: yalnızca davet edilen kişi, yalnızca bekleyen daveti yanıtlayabilir
  if auth.uid() is distinct from old.b then raise exception 'Bu daveti yalnızca davet edilen kişi yanıtlayabilir'; end if;
  if old.status <> 'pending' or new.status not in ('accepted','declined') then raise exception 'Geçersiz yanıt'; end if;
  new.id := old.id; new.a := old.a; new.b := old.b; new.kind := old.kind; new.activity := old.activity; new.at := old.at;
  new.answered_at := now();
  return new;
end $$;
drop trigger if exists life_meets_guard on public.life_meets;
create trigger life_meets_guard before insert or update on public.life_meets
  for each row execute function public.life_meets_guard();

alter table public.life_chars enable row level security;
alter table public.life_meets enable row level security;

drop policy if exists life_chars_read  on public.life_chars;
drop policy if exists life_chars_ins   on public.life_chars;
drop policy if exists life_chars_upd   on public.life_chars;
drop policy if exists life_chars_del   on public.life_chars;
create policy life_chars_read on public.life_chars for select to authenticated
  using (member = auth.uid() or public.msn_can_msg(auth.uid(), member));
create policy life_chars_ins on public.life_chars for insert to authenticated with check (member = auth.uid());
create policy life_chars_upd on public.life_chars for update to authenticated using (member = auth.uid()) with check (member = auth.uid());
create policy life_chars_del on public.life_chars for delete to authenticated using (member = auth.uid());

drop policy if exists life_meets_read on public.life_meets;
drop policy if exists life_meets_ins  on public.life_meets;
drop policy if exists life_meets_upd  on public.life_meets;
drop policy if exists life_meets_del  on public.life_meets;
create policy life_meets_read on public.life_meets for select to authenticated using (a = auth.uid() or b = auth.uid());
create policy life_meets_ins  on public.life_meets for insert to authenticated with check (a = auth.uid());
create policy life_meets_upd  on public.life_meets for update to authenticated using (b = auth.uid());
create policy life_meets_del  on public.life_meets for delete to authenticated using (a = auth.uid() or b = auth.uid());

-- dünyadan ayrılınca o kişinin davetleri de silinsin
create or replace function public.life_chars_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin delete from public.life_meets where a = old.member or b = old.member; return old; end $$;
drop trigger if exists life_chars_cleanup on public.life_chars;
create trigger life_chars_cleanup after delete on public.life_chars
  for each row execute function public.life_chars_cleanup();

revoke all on public.life_chars, public.life_meets from anon;
grant select, insert, update, delete on public.life_chars, public.life_meets to authenticated;
