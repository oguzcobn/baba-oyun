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

-- =====================================================================
-- GRUP SOHBETLERİ (en çok 6 kişi). Bu bölüm de tekrar çalıştırılabilir.
-- Odaya yalnızca kurucunun ya da üyelerin onaylı arkadaşları eklenebilir.
-- =====================================================================
create table if not exists public.msn_rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  owner      uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.msn_room_members (
  room      uuid not null references public.msn_rooms (id) on delete cascade,
  member    uuid not null references auth.users (id) on delete cascade,
  last_read bigint not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room, member)
);
create table if not exists public.msn_room_msgs (
  id         bigint generated always as identity primary key,
  room       uuid not null references public.msn_rooms (id) on delete cascade,
  sender     uuid default auth.uid() references auth.users (id) on delete set null,
  kind       text not null default 'text' check (kind in ('text','system')),
  body       text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists msn_room_msgs_room on public.msn_room_msgs (room, id desc);
create index if not exists msn_room_members_member on public.msn_room_members (member);

create or replace function public.msn_in_room(p_room uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.msn_room_members where room = p_room and member = p_user);
$$;

alter table public.msn_rooms        enable row level security;
alter table public.msn_room_members enable row level security;
alter table public.msn_room_msgs    enable row level security;

drop policy if exists msn_r_sel  on public.msn_rooms;
drop policy if exists msn_rm_sel on public.msn_room_members;
drop policy if exists msn_rm_upd on public.msn_room_members;
drop policy if exists msn_rg_sel on public.msn_room_msgs;
drop policy if exists msn_rg_ins on public.msn_room_msgs;
create policy msn_r_sel  on public.msn_rooms        for select to authenticated using (public.msn_in_room(id, (select auth.uid())));
create policy msn_rm_sel on public.msn_room_members for select to authenticated using (public.msn_in_room(room, (select auth.uid())));
create policy msn_rm_upd on public.msn_room_members for update to authenticated using ((select auth.uid()) = member) with check ((select auth.uid()) = member);
create policy msn_rg_sel on public.msn_room_msgs    for select to authenticated using (public.msn_in_room(room, (select auth.uid())));
create policy msn_rg_ins on public.msn_room_msgs    for insert to authenticated with check (kind = 'text' and public.msn_in_room(room, (select auth.uid())));

-- üye yalnızca kendi "okundu" işaretini değiştirebilir; mesajda gönderen ve zaman sunucudan gelir
create or replace function public.msn_room_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_table_name = 'msn_room_members' then
    new.room := old.room; new.member := old.member; new.joined_at := old.joined_at;
    new.last_read := greatest(old.last_read, new.last_read);
  elsif tg_table_name = 'msn_room_msgs' then
    new.sender := auth.uid(); new.created_at := now(); new.kind := 'text';
  end if;
  return new;
end $$;
drop trigger if exists msn_room_guard on public.msn_room_members;
drop trigger if exists msn_room_guard on public.msn_room_msgs;
create trigger msn_room_guard before update on public.msn_room_members for each row execute function public.msn_room_guard();
create trigger msn_room_guard before insert on public.msn_room_msgs for each row execute function public.msn_room_guard();

create or replace function public.msn_room_sys(p_room uuid, p_body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.msn_room_msgs (room, sender, kind, body) values (p_room, auth.uid(), 'system', left(p_body, 300));
$$;

-- Oda kur: üyeler kurucunun onaylı arkadaşları olmalı; kurucu dahil en çok 6 kişi.
create or replace function public.msn_room_create(p_name text, p_members uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r uuid; m uuid; n int := 0;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.msn_room_members where member = me) >= 50 then raise exception 'too many rooms'; end if;
  if coalesce(array_length(p_members, 1), 0) < 1 then raise exception 'pick at least one person'; end if;
  if (select count(distinct x) from unnest(p_members) x where x <> me) > 5 then raise exception 'max 6 people'; end if;
  insert into public.msn_rooms (name, owner) values (left(coalesce(nullif(trim(p_name), ''), 'Grup'), 40), me) returning id into r;
  insert into public.msn_room_members (room, member) values (r, me);
  foreach m in array p_members loop
    if m <> me and public.msn_can_msg(me, m) and not public.msn_in_room(r, m) then
      insert into public.msn_room_members (room, member) values (r, m); n := n + 1;
    end if;
  end loop;
  if n = 0 then delete from public.msn_rooms where id = r; raise exception 'no valid friends'; end if;
  perform public.msn_room_sys(r, 'created');
  return r;
end $$;

create or replace function public.msn_room_add(p_room uuid, p_member uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if not public.msn_in_room(p_room, me) then return 'notmember'; end if;
  if public.msn_in_room(p_room, p_member) then return 'exists'; end if;
  if not public.msn_can_msg(me, p_member) then return 'notfriend'; end if;
  if (select count(*) from public.msn_room_members where room = p_room) >= 6 then return 'full'; end if;
  insert into public.msn_room_members (room, member) values (p_room, p_member);
  perform public.msn_room_sys(p_room, 'added:' || p_member::text);
  return 'ok';
end $$;

-- Kurucu bir üyeyi çıkarabilir.
create or replace function public.msn_room_kick(p_room uuid, p_member uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if p_member = me or not exists (select 1 from public.msn_rooms where id = p_room and owner = me) then return false; end if;
  delete from public.msn_room_members where room = p_room and member = p_member;
  if found then perform public.msn_room_sys(p_room, 'removed:' || p_member::text); end if;
  return found;
end $$;

-- Odadan ayrıl. Kurucu ayrılırsa en eski üye kurucu olur; kimse kalmazsa oda silinir.
create or replace function public.msn_room_leave(p_room uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); nxt uuid;
begin
  delete from public.msn_room_members where room = p_room and member = me;
  if not found then return false; end if;
  select member into nxt from public.msn_room_members where room = p_room order by joined_at limit 1;
  if nxt is null then delete from public.msn_rooms where id = p_room; return true; end if;
  update public.msn_rooms set owner = nxt where id = p_room and (owner = me or owner is null);
  perform public.msn_room_sys(p_room, 'left');
  return true;
end $$;

create or replace function public.msn_room_rename(p_room uuid, p_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.msn_in_room(p_room, auth.uid()) or nullif(trim(p_name), '') is null then return false; end if;
  update public.msn_rooms set name = left(trim(p_name), 40) where id = p_room;
  perform public.msn_room_sys(p_room, 'renamed:' || left(trim(p_name), 40));
  return true;
end $$;

-- Odadaki kişilerin adı ve avatarı (arkadaşın olmasalar da); durumları gizli kalır.
create or replace function public.msn_room_people(p_room uuid) returns table (id uuid, name text, code text, avatar jsonb, last_read bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.code, p.avatar, m.last_read
  from public.msn_room_members m join public.msn_profiles p on p.id = m.member
  where m.room = p_room and public.msn_in_room(p_room, auth.uid())
  order by m.joined_at;
$$;

revoke all on public.msn_rooms, public.msn_room_members, public.msn_room_msgs from anon, authenticated;
grant select on public.msn_rooms to authenticated;
grant select, update on public.msn_room_members to authenticated;
grant select, insert on public.msn_room_msgs to authenticated;
revoke all on function public.msn_in_room(uuid, uuid), public.msn_room_sys(uuid, text), public.msn_room_create(text, uuid[]), public.msn_room_add(uuid, uuid), public.msn_room_kick(uuid, uuid), public.msn_room_leave(uuid), public.msn_room_rename(uuid, text), public.msn_room_people(uuid) from public, anon;
grant execute on function public.msn_in_room(uuid, uuid), public.msn_room_create(text, uuid[]), public.msn_room_add(uuid, uuid), public.msn_room_kick(uuid, uuid), public.msn_room_leave(uuid), public.msn_room_rename(uuid, text), public.msn_room_people(uuid) to authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.msn_room_msgs;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.msn_room_members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.msn_rooms;        exception when duplicate_object then null; end;
end $$;

-- =====================================================================
-- GRUP DAVET BAĞLANTISI. Bağlantıyı alan (Messenger hesabı olan) kişi, grup dolu değilse katılabilir.
-- Bağlantı 7 gün geçerlidir; yenilenince ya da kapatılınca eskisi çalışmaz.
-- =====================================================================
alter table public.msn_rooms add column if not exists invite_token   text unique;
alter table public.msn_rooms add column if not exists invite_expires timestamptz;

create or replace function public.msn_room_invite(p_room uuid) returns table (token text, expires timestamptz)
language plpgsql security definer set search_path = '' as $$
declare t text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.msn_in_room(p_room, auth.uid()) then raise exception 'not a member'; end if;
  update public.msn_rooms set invite_token = t, invite_expires = now() + interval '7 days' where id = p_room;
  return query select r.invite_token, r.invite_expires from public.msn_rooms r where r.id = p_room;
end $$;

create or replace function public.msn_room_invite_off(p_room uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.msn_in_room(p_room, auth.uid()) then return false; end if;
  update public.msn_rooms set invite_token = null, invite_expires = null where id = p_room;
  return true;
end $$;

-- Katılmadan önce önizleme: yalnızca grup adı ve kişi sayısı.
create or replace function public.msn_room_peek(p_token text) returns table (room uuid, name text, people int, state text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.name, (select count(*)::int from public.msn_room_members m where m.room = r.id),
         case when public.msn_in_room(r.id, auth.uid()) then 'member'
              when r.invite_expires < now() then 'expired'
              when (select count(*) from public.msn_room_members m where m.room = r.id) >= 6 then 'full'
              else 'ok' end
  from public.msn_rooms r where r.invite_token = p_token and auth.uid() is not null;
$$;

create or replace function public.msn_room_join(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.msn_rooms;
begin
  if me is null then return 'auth'; end if;
  if not exists (select 1 from public.msn_profiles where id = me) then return 'noprofile'; end if;
  select * into r from public.msn_rooms where invite_token = p_token for update;
  if not found then return 'invalid'; end if;
  if public.msn_in_room(r.id, me) then return 'member:' || r.id::text; end if;
  if r.invite_expires < now() then return 'expired'; end if;
  if (select count(*) from public.msn_room_members where room = r.id) >= 6 then return 'full'; end if;
  if (select count(*) from public.msn_room_members where member = me) >= 50 then return 'limit'; end if;
  insert into public.msn_room_members (room, member) values (r.id, me);
  perform public.msn_room_sys(r.id, 'joined');
  return 'ok:' || r.id::text;
end $$;

revoke all on function public.msn_room_invite(uuid), public.msn_room_invite_off(uuid), public.msn_room_peek(text), public.msn_room_join(text) from public, anon;
grant execute on function public.msn_room_invite(uuid), public.msn_room_invite_off(uuid), public.msn_room_peek(text), public.msn_room_join(text) to authenticated;

-- =====================================================================
-- UYGULAMA KAPALIYKEN BİLDİRİM (Web Push). Ücretsiz: Supabase Edge Function "msn-push" gönderir.
-- Anahtarlar (VAPID) fonksiyon tarafından ilk çalışmada üretilip burada saklanır; kimse göremez.
-- =====================================================================
create table if not exists public.msn_push (
  endpoint   text primary key check (char_length(endpoint) < 1000),
  member     uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null check (char_length(p256dh) < 200),
  auth       text not null check (char_length(auth) < 100),
  lang       text not null default 'tr' check (lang in ('tr','en')),
  url        text not null default '' check (char_length(url) < 300),
  created_at timestamptz not null default now()
);
create index if not exists msn_push_member on public.msn_push (member);
create table if not exists public.msn_push_keys (id int primary key default 1 check (id = 1), pub text not null, priv text not null);
create table if not exists public.msn_push_sent (tbl text not null, rid bigint not null, at timestamptz not null default now(), primary key (tbl, rid));
alter table public.msn_push      enable row level security;
alter table public.msn_push_keys enable row level security;   -- politika yok: yalnızca sunucu (service role) erişir
alter table public.msn_push_sent enable row level security;
drop policy if exists msn_push_sel on public.msn_push;
create policy msn_push_sel on public.msn_push for select to authenticated using ((select auth.uid()) = member);
revoke all on public.msn_push, public.msn_push_keys, public.msn_push_sent from anon, authenticated;
grant select on public.msn_push to authenticated;

-- Bu cihazın bildirim aboneliğini kaydet (cihaz başka hesaba geçtiyse eskisini devralır).
create or replace function public.msn_push_save(p_endpoint text, p_p256dh text, p_auth text, p_lang text, p_url text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or p_endpoint !~ '^https://' then return false; end if;
  if (select count(*) from public.msn_push where member = me) >= 10 then
    delete from public.msn_push where endpoint in (select endpoint from public.msn_push where member = me order by created_at limit 1);
  end if;
  insert into public.msn_push (endpoint, member, p256dh, auth, lang, url)
  values (p_endpoint, me, p_p256dh, p_auth, case when p_lang = 'en' then 'en' else 'tr' end, left(coalesce(p_url, ''), 300))
  on conflict (endpoint) do update set member = me, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang, url = excluded.url, created_at = now();
  return true;
end $$;
create or replace function public.msn_push_remove(p_endpoint text) returns boolean
language sql security definer set search_path = '' as $$
  delete from public.msn_push where endpoint = p_endpoint and member = auth.uid() returning true;
$$;
revoke all on function public.msn_push_save(text, text, text, text, text), public.msn_push_remove(text) from public, anon;
grant execute on function public.msn_push_save(text, text, text, text, text), public.msn_push_remove(text) to authenticated;

-- Yeni mesajda fonksiyonu çağır. Fonksiyon kaydı veritabanından kendisi okur ve her mesajı en fazla bir kez gönderir,
-- bu yüzden çağrıda gizli bir anahtar gerekmez. Fonksiyon kurulmamışsa çağrı sessizce boşa düşer, mesajlaşma etkilenmez.
create extension if not exists pg_net;
create or replace function public.msn_push_hook() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'msn_room_msgs' and new.kind <> 'text' then return new; end if;
  perform net.http_post(
    url := 'https://zjzbpeiuhreyfdihzzzj.supabase.co/functions/v1/msn-push',
    body := jsonb_build_object('table', tg_table_name, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000);
  return new;
exception when others then return new;
end $$;
drop trigger if exists msn_push_hook on public.msn_messages;
drop trigger if exists msn_push_hook on public.msn_room_msgs;
create trigger msn_push_hook after insert on public.msn_messages for each row execute function public.msn_push_hook();
create trigger msn_push_hook after insert on public.msn_room_msgs for each row execute function public.msn_push_hook();
