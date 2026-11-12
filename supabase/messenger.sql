-- BABA Messenger · Supabase > SQL Editor'e yapıştırıp bir kez "Run" ile çalıştır.
-- Tekrar çalıştırmak güvenlidir (var olanları bozmaz). Ücretsiz katmanda çalışır.
-- Güvenlik: herkes yalnızca kendi kayıtlarını, arkadaşlarının profilini ve kendi sohbetlerini görür.

-- ---------- tablolar ----------
create table if not exists public.msn_profiles (
  id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  code       text not null unique,
  name       text not null default '' check (char_length(name) <= 40),
  psm        text not null default '' check (char_length(psm) <= 120),
  status     text not null default 'online' check (status in ('online','busy','away','invisible')),
  avatar     jsonb,
  last_seen  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.msn_friends (
  owner      uuid not null references auth.users (id) on delete cascade,
  friend     uuid not null references auth.users (id) on delete cascade,
  state      text not null check (state in ('out','in','accepted','blocked')),
  grp        text not null default 'friends' check (char_length(grp) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (owner, friend),
  check (owner <> friend)
);

create table if not exists public.msn_messages (
  id         bigint generated always as identity primary key,
  sender     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  receiver   uuid not null references auth.users (id) on delete cascade,
  kind       text not null default 'text' check (kind in ('text','nudge')),
  body       text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists msn_messages_pair on public.msn_messages (sender, receiver, created_at desc);
create index if not exists msn_messages_in   on public.msn_messages (receiver, created_at desc);

create table if not exists public.msn_typing (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  peer  uuid not null references auth.users (id) on delete cascade,
  at    timestamptz not null default now(),
  primary key (owner, peer)
);

create table if not exists public.msn_prefs (
  id   uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000)
);

-- ---------- yardımcılar (RLS içinde döngüye girmemek için security definer) ----------
create or replace function public.msn_sees(viewer uuid, target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select viewer = target or (
    exists (select 1 from public.msn_friends where owner = viewer and friend = target and state = 'accepted')
    and exists (select 1 from public.msn_friends where owner = target and friend = viewer and state = 'accepted'));
$$;
create or replace function public.msn_can_msg(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.msn_friends where owner = a and friend = b and state = 'accepted')
     and exists (select 1 from public.msn_friends where owner = b and friend = a and state = 'accepted');
$$;

-- ---------- satır düzeyi güvenlik ----------
alter table public.msn_profiles enable row level security;
alter table public.msn_friends  enable row level security;
alter table public.msn_messages enable row level security;
alter table public.msn_typing   enable row level security;
alter table public.msn_prefs    enable row level security;

drop policy if exists msn_p_sel on public.msn_profiles;
drop policy if exists msn_p_ins on public.msn_profiles;
drop policy if exists msn_p_upd on public.msn_profiles;
create policy msn_p_sel on public.msn_profiles for select to authenticated using (public.msn_sees((select auth.uid()), id));
create policy msn_p_upd on public.msn_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists msn_f_sel on public.msn_friends;
drop policy if exists msn_f_upd on public.msn_friends;
create policy msn_f_sel on public.msn_friends for select to authenticated using ((select auth.uid()) = owner);
create policy msn_f_upd on public.msn_friends for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
-- ekleme / silme / kabul yalnızca aşağıdaki fonksiyonlarla

drop policy if exists msn_m_sel on public.msn_messages;
drop policy if exists msn_m_ins on public.msn_messages;
drop policy if exists msn_m_upd on public.msn_messages;
create policy msn_m_sel on public.msn_messages for select to authenticated using ((select auth.uid()) in (sender, receiver));
create policy msn_m_ins on public.msn_messages for insert to authenticated with check ((select auth.uid()) = sender and public.msn_can_msg(sender, receiver));
create policy msn_m_upd on public.msn_messages for update to authenticated using ((select auth.uid()) = receiver) with check ((select auth.uid()) = receiver);

drop policy if exists msn_t_sel on public.msn_typing;
drop policy if exists msn_t_ins on public.msn_typing;
drop policy if exists msn_t_upd on public.msn_typing;
create policy msn_t_sel on public.msn_typing for select to authenticated using ((select auth.uid()) in (owner, peer));
create policy msn_t_ins on public.msn_typing for insert to authenticated with check ((select auth.uid()) = owner and public.msn_can_msg(owner, peer));
create policy msn_t_upd on public.msn_typing for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

drop policy if exists msn_pr_all on public.msn_prefs;
create policy msn_pr_all on public.msn_prefs for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------- tetikleyiciler: istemci başkası adına yazamaz, değiştiremeyeceği alanlara dokunamaz ----------
create or replace function public.msn_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'msn_messages' then
    if tg_op = 'INSERT' then new.sender := auth.uid(); new.created_at := now(); new.read_at := null;
    else -- alıcı yalnızca okundu bilgisini koyabilir
      new.id := old.id; new.sender := old.sender; new.receiver := old.receiver; new.kind := old.kind; new.body := old.body; new.created_at := old.created_at;
      if new.read_at is not null then new.read_at := coalesce(old.read_at, now()); end if;
    end if;
  elsif tg_table_name = 'msn_profiles' then
    new.id := coalesce(old.id, auth.uid()); new.updated_at := now();
    if tg_op = 'UPDATE' then new.code := old.code; end if;
  elsif tg_table_name = 'msn_friends' then -- kişi yalnızca grubu ya da engeli değiştirebilir (fonksiyonlar serbest)
    if current_user <> 'authenticated' then return new; end if;
    new.owner := old.owner; new.friend := old.friend; new.created_at := old.created_at;
    if new.state <> old.state and not (new.state = 'blocked' and old.state = 'accepted') and not (new.state = 'accepted' and old.state = 'blocked') then new.state := old.state; end if;
  elsif tg_table_name = 'msn_typing' then
    new.owner := auth.uid(); new.at := now();
  end if;
  return new;
end $$;

drop trigger if exists msn_guard on public.msn_messages;
drop trigger if exists msn_guard on public.msn_profiles;
drop trigger if exists msn_guard on public.msn_friends;
drop trigger if exists msn_guard on public.msn_typing;
create trigger msn_guard before insert or update on public.msn_messages for each row execute function public.msn_guard();
create trigger msn_guard before insert or update on public.msn_profiles for each row execute function public.msn_guard();
create trigger msn_guard before update on public.msn_friends for each row execute function public.msn_guard();
create trigger msn_guard before insert or update on public.msn_typing for each row execute function public.msn_guard();

-- ---------- işlemler ----------
-- Profil yoksa oluşturur ve kendi kodunu döndürür (ör. OGUZ-4821).
create or replace function public.msn_me(p_name text) returns public.msn_profiles
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.msn_profiles; c text; base text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into r from public.msn_profiles where id = me;
  if found then return r; end if;
  base := upper(left(regexp_replace(translate(coalesce(p_name, ''), 'çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU'), '[^A-Za-z]', '', 'g'), 4));
  if char_length(base) < 2 then base := 'BABA'; end if;
  loop
    c := base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.msn_profiles where code = c);
  end loop;
  insert into public.msn_profiles (id, code, name) values (me, c, left(coalesce(p_name, ''), 40)) returning * into r;
  return r;
end $$;

-- Koda göre arkadaşlık isteği gönderir. Karşı taraf zaten istek attıysa doğrudan kabul eder.
create or replace function public.msn_request(p_code text, p_grp text) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid; g text := coalesce(nullif(left(p_grp, 40), ''), 'friends'); st text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into them from public.msn_profiles where code = upper(trim(p_code));
  if them is null then return 'notfound'; end if;
  if them = me then return 'self'; end if;
  if (select count(*) from public.msn_friends where owner = me) >= 500 then return 'limit'; end if;
  select state into st from public.msn_friends where owner = me and friend = them;
  if st = 'accepted' or st = 'blocked' then return 'exists'; end if;
  if st = 'out' then return 'pending'; end if;
  if st = 'in' then
    update public.msn_friends set state = 'accepted', grp = g where owner = me and friend = them;
    update public.msn_friends set state = 'accepted' where owner = them and friend = me and state = 'out';
    return 'accepted';
  end if;
  if exists (select 1 from public.msn_friends where owner = them and friend = me and state = 'blocked') then return 'pending'; end if;
  insert into public.msn_friends (owner, friend, state, grp) values (me, them, 'out', g);
  insert into public.msn_friends (owner, friend, state) values (them, me, 'in') on conflict do nothing;
  return 'sent';
end $$;

create or replace function public.msn_accept(p_friend uuid, p_grp text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  update public.msn_friends set state = 'accepted', grp = coalesce(nullif(left(p_grp, 40), ''), grp) where owner = me and friend = p_friend and state = 'in';
  if not found then return false; end if;
  update public.msn_friends set state = 'accepted' where owner = p_friend and friend = me and state = 'out';
  return true;
end $$;

-- İsteği reddeder ya da kişiyi listeden siler (iki taraftan da).
create or replace function public.msn_remove(p_friend uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then return false; end if;
  delete from public.msn_friends where (owner = me and friend = p_friend) or (owner = p_friend and friend = me and state <> 'blocked');
  delete from public.msn_typing where (owner = me and peer = p_friend) or (owner = p_friend and peer = me);
  return true;
end $$;

-- Bekleyen istekler: yalnızca ad, kod ve avatar görünür (durum ve son görülme gizli kalır).
create or replace function public.msn_pending() returns table (id uuid, dir text, name text, code text, avatar jsonb, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, f.state, p.name, p.code, p.avatar, f.created_at
  from public.msn_friends f join public.msn_profiles p on p.id = f.friend
  where f.owner = auth.uid() and f.state in ('in', 'out')
  order by f.created_at desc;
$$;

-- Grup adı silinince kişileri başka gruba taşır.
create or replace function public.msn_move_group(p_from text, p_to text) returns void
language sql security definer set search_path = '' as $$
  update public.msn_friends set grp = left(p_to, 40) where owner = auth.uid() and grp = p_from;
$$;

-- ---------- yetkiler ----------
revoke all on public.msn_profiles, public.msn_friends, public.msn_messages, public.msn_typing, public.msn_prefs from anon, authenticated;
grant select, update on public.msn_profiles to authenticated;   -- profil yalnızca msn_me() ile oluşur
grant select, update on public.msn_friends to authenticated;
grant select, insert, update on public.msn_messages to authenticated;
grant select, insert, update on public.msn_typing to authenticated;
grant select, insert, update, delete on public.msn_prefs to authenticated;
revoke all on function public.msn_sees(uuid, uuid), public.msn_can_msg(uuid, uuid), public.msn_me(text), public.msn_request(text, text), public.msn_accept(uuid, text), public.msn_remove(uuid), public.msn_move_group(text, text), public.msn_pending() from public, anon;
grant execute on function public.msn_sees(uuid, uuid), public.msn_can_msg(uuid, uuid), public.msn_me(text), public.msn_request(text, text), public.msn_accept(uuid, text), public.msn_remove(uuid), public.msn_move_group(text, text), public.msn_pending() to authenticated;

-- ---------- anlık bildirim (Realtime) ----------
do $$ begin
  begin alter publication supabase_realtime add table public.msn_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.msn_profiles; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.msn_friends;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.msn_typing;   exception when duplicate_object then null; end;
end $$;
