create extension if not exists pgcrypto;

do $$ begin
  create type public.group_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.round_status as enum ('active', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  birthdate date,
  is_age_confirmed boolean not null default false,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$')
);

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  avatar_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.social_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text,
  status public.round_status not null default 'active',
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default (now() + interval '4 hours'),
  closed_at timestamptz,
  winner_moment_id uuid,
  constraint closes_after_created check (closes_at > created_at)
);

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  caption text,
  drink_type text,
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caption_length check (caption is null or char_length(caption) <= 120),
  constraint drink_type_length check (drink_type is null or char_length(drink_type) <= 40)
);

do $$ begin
  alter table public.rounds
    add constraint rounds_winner_moment_id_fkey
    foreign key (winner_moment_id) references public.moments(id)
    deferrable initially deferred;
exception when duplicate_object then null;
end $$;

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('cheers', 'laugh', 'fire', 'wow')),
  created_at timestamptz not null default now(),
  unique (moment_id, user_id, type)
);

create table if not exists public.photo_votes (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  group_id uuid not null references public.social_groups(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null default 'foton' check (vote_type in ('foton')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, voter_id, vote_type)
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text check (platform in ('ios', 'android', 'unknown')) default 'unknown',
  device_name text,
  app_version text,
  build_number text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  moment_id uuid references public.moments(id) on delete cascade,
  group_id uuid references public.social_groups(id) on delete cascade,
  reason text not null,
  details text,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (reporter_id, moment_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_rounds_group_status on public.rounds(group_id, status, created_at desc);
create index if not exists idx_rounds_closes_at on public.rounds(closes_at);
create index if not exists idx_moments_round_created on public.moments(round_id, created_at asc);
create index if not exists idx_moments_group_created on public.moments(group_id, created_at desc);
create index if not exists idx_reactions_moment on public.reactions(moment_id);
create index if not exists idx_photo_votes_round on public.photo_votes(round_id);
create index if not exists idx_device_tokens_user on public.device_tokens(user_id);
create index if not exists idx_reports_status on public.reports(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists social_groups_set_updated_at on public.social_groups;
create trigger social_groups_set_updated_at
before update on public.social_groups
for each row execute function public.set_updated_at();

drop trigger if exists moments_set_updated_at on public.moments;
create trigger moments_set_updated_at
before update on public.moments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
  );
$$;

create or replace function public.has_block_between(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.validate_moment_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = new.user_id
      and p.is_age_confirmed = true
  ) then
    raise exception 'age confirmation required';
  end if;

  if not exists (
    select 1
    from public.rounds r
    where r.id = new.round_id
      and r.group_id = new.group_id
      and r.status = 'active'
      and r.closes_at > now()
  ) then
    raise exception 'round is closed or group mismatch';
  end if;

  select count(*) into v_count
  from public.moments m
  where m.round_id = new.round_id
    and m.user_id = new.user_id
    and (tg_op = 'INSERT' or m.id <> new.id);

  if v_count >= 3 then
    raise exception 'max moments per user per round reached';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_moment_write_trigger on public.moments;
create trigger validate_moment_write_trigger
before insert or update of round_id, group_id, user_id on public.moments
for each row execute function public.validate_moment_write();

create or replace function public.validate_reaction_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.moments m
    join public.rounds r on r.id = m.round_id
    where m.id = new.moment_id
      and m.round_id = new.round_id
      and m.group_id = new.group_id
      and m.user_id <> new.user_id
      and m.is_hidden = false
      and r.status = 'active'
      and r.closes_at > now()
      and not public.has_block_between(new.user_id, m.user_id)
  ) then
    raise exception 'reaction not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_reaction_write_trigger on public.reactions;
create trigger validate_reaction_write_trigger
before insert or update on public.reactions
for each row execute function public.validate_reaction_write();

create or replace function public.validate_photo_vote_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.moments m
    join public.rounds r on r.id = m.round_id
    where m.id = new.moment_id
      and m.round_id = new.round_id
      and m.group_id = new.group_id
      and m.user_id <> new.voter_id
      and m.is_hidden = false
      and r.status = 'active'
      and r.closes_at > now()
      and not public.has_block_between(new.voter_id, m.user_id)
  ) then
    raise exception 'photo vote not allowed';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists validate_photo_vote_write_trigger on public.photo_votes;
create trigger validate_photo_vote_write_trigger
before insert or update on public.photo_votes
for each row execute function public.validate_photo_vote_write();

create or replace function public.hide_moment_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.moment_id is not null and (
    select count(distinct reporter_id)
    from public.reports
    where moment_id = new.moment_id
  ) >= 3 then
    update public.moments
    set is_hidden = true,
        hidden_reason = 'report_threshold'
    where id = new.moment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists hide_moment_after_reports_trigger on public.reports;
create trigger hide_moment_after_reports_trigger
after insert on public.reports
for each row execute function public.hide_moment_after_reports();

alter table public.profiles enable row level security;
alter table public.social_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rounds enable row level security;
alter table public.moments enable row level security;
alter table public.reactions enable row level security;
alter table public.photo_votes enable row level security;
alter table public.device_tokens enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

drop policy if exists profiles_select_same_groups_or_self on public.profiles;
create policy profiles_select_same_groups_or_self
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.group_members me
    join public.group_members other on other.group_id = me.group_id
    where me.user_id = auth.uid()
      and other.user_id = profiles.id
  )
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists groups_select_members on public.social_groups;
create policy groups_select_members
on public.social_groups for select
to authenticated
using (public.is_group_member(id));

drop policy if exists groups_insert_owner on public.social_groups;
create policy groups_insert_owner
on public.social_groups for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_age_confirmed = true
  )
);

drop policy if exists groups_update_owner_admin on public.social_groups;
create policy groups_update_owner_admin
on public.social_groups for update
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = social_groups.id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = social_groups.id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);

drop policy if exists group_members_select_members on public.group_members;
create policy group_members_select_members
on public.group_members for select
to authenticated
using (public.is_group_member(group_id) or user_id = auth.uid());

drop policy if exists group_members_insert_creator_owner on public.group_members;
create policy group_members_insert_creator_owner
on public.group_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.social_groups sg
    where sg.id = group_members.group_id
      and sg.owner_id = auth.uid()
  )
);

drop policy if exists group_members_update_self_muted_or_admin on public.group_members;
create policy group_members_update_self_muted_or_admin
on public.group_members for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);

drop policy if exists rounds_select_members on public.rounds;
create policy rounds_select_members
on public.rounds for select
to authenticated
using (public.is_group_member(group_id));

drop policy if exists rounds_insert_members on public.rounds;
create policy rounds_insert_members
on public.rounds for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_group_member(group_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_age_confirmed = true
  )
);

drop policy if exists rounds_update_creator_or_admin on public.rounds;
create policy rounds_update_creator_or_admin
on public.rounds for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = rounds.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = rounds.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);

drop policy if exists moments_select_group_members_not_blocked on public.moments;
create policy moments_select_group_members_not_blocked
on public.moments for select
to authenticated
using (
  public.is_group_member(group_id)
  and is_hidden = false
  and not public.has_block_between(auth.uid(), user_id)
);

drop policy if exists moments_insert_members_active_round on public.moments;
create policy moments_insert_members_active_round
on public.moments for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_group_member(group_id)
);

drop policy if exists moments_delete_own on public.moments;
create policy moments_delete_own
on public.moments for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists reactions_select_members on public.reactions;
create policy reactions_select_members
on public.reactions for select
to authenticated
using (public.is_group_member(group_id));

drop policy if exists reactions_insert_members_active_round on public.reactions;
create policy reactions_insert_members_active_round
on public.reactions for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_group_member(group_id)
);

drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_delete_own
on public.reactions for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists photo_votes_select_members on public.photo_votes;
create policy photo_votes_select_members
on public.photo_votes for select
to authenticated
using (public.is_group_member(group_id));

drop policy if exists photo_votes_insert_members on public.photo_votes;
create policy photo_votes_insert_members
on public.photo_votes for insert
to authenticated
with check (
  voter_id = auth.uid()
  and public.is_group_member(group_id)
);

drop policy if exists photo_votes_update_own on public.photo_votes;
create policy photo_votes_update_own
on public.photo_votes for update
to authenticated
using (voter_id = auth.uid())
with check (
  voter_id = auth.uid()
  and public.is_group_member(group_id)
);

drop policy if exists photo_votes_delete_own on public.photo_votes;
create policy photo_votes_delete_own
on public.photo_votes for delete
to authenticated
using (voter_id = auth.uid());

drop policy if exists device_tokens_select_own on public.device_tokens;
create policy device_tokens_select_own
on public.device_tokens for select
to authenticated
using (user_id = auth.uid());

drop policy if exists device_tokens_insert_own on public.device_tokens;
create policy device_tokens_insert_own
on public.device_tokens for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists device_tokens_update_own on public.device_tokens;
create policy device_tokens_update_own
on public.device_tokens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists device_tokens_delete_own on public.device_tokens;
create policy device_tokens_delete_own
on public.device_tokens for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists reports_insert_own_member on public.reports;
create policy reports_insert_own_member
on public.reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and (group_id is null or public.is_group_member(group_id))
);

drop policy if exists reports_select_own_or_group_admin on public.reports;
create policy reports_select_own_or_group_admin
on public.reports for select
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = reports.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);

drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own
on public.blocks for select
to authenticated
using (blocker_id = auth.uid() or blocked_id = auth.uid());

drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own
on public.blocks for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own
on public.blocks for delete
to authenticated
using (blocker_id = auth.uid());

create or replace function public.join_group_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_age_confirmed = true
  ) then
    raise exception 'age confirmation required';
  end if;

  select id into v_group_id
  from public.social_groups
  where invite_code = upper(trim(p_invite_code))
    and is_active = true;

  if v_group_id is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

create or replace function public.close_round(p_round_id uuid)
returns table (
  round_id uuid,
  winner_moment_id uuid,
  status public.round_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_status public.round_status;
  v_winner uuid;
begin
  select r.group_id, r.status
  into v_group_id, v_status
  from public.rounds r
  where r.id = p_round_id;

  if v_group_id is null then
    raise exception 'round not found';
  end if;

  if not public.is_group_member(v_group_id, auth.uid()) then
    raise exception 'not allowed';
  end if;

  if v_status = 'closed' then
    return query
    select r.id, r.winner_moment_id, r.status
    from public.rounds r
    where r.id = p_round_id;
    return;
  end if;

  if exists (select 1 from public.rounds r where r.id = p_round_id and r.closes_at > now()) then
    raise exception 'round still active';
  end if;

  select m.id into v_winner
  from public.moments m
  left join public.photo_votes pv on pv.moment_id = m.id
  left join public.reactions rx on rx.moment_id = m.id
  where m.round_id = p_round_id
    and m.is_hidden = false
  group by m.id, m.created_at
  order by
    count(distinct pv.id) desc,
    count(distinct rx.id) desc,
    m.created_at asc
  limit 1;

  update public.rounds r
  set status = 'closed',
      closed_at = now(),
      winner_moment_id = v_winner
  where r.id = p_round_id;

  return query
  select r.id, r.winner_moment_id, r.status
  from public.rounds r
  where r.id = p_round_id;
end;
$$;

create or replace function public.get_weekly_leaderboard(p_group_id uuid, p_week_start date)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  score integer,
  rounds_started integer,
  moments_uploaded integer,
  participants_joined_my_rounds integer,
  reactions_received integer,
  fotons_received integer,
  winning_photos integer,
  participated_other_rounds integer
)
language sql
security definer
set search_path = public
stable
as $$
with bounds as (
  select p_week_start::timestamptz as start_at,
         (p_week_start::timestamptz + interval '7 days') as end_at
), members as (
  select gm.user_id
  from public.group_members gm
  where gm.group_id = p_group_id
), week_rounds as (
  select r.*
  from public.rounds r, bounds b
  where r.group_id = p_group_id
    and r.created_at >= b.start_at
    and r.created_at < b.end_at
), rounds_started as (
  select created_by as user_id, count(*)::int as c
  from week_rounds
  group by created_by
), moments_uploaded as (
  select m.user_id, count(*)::int as c
  from public.moments m, bounds b
  where m.group_id = p_group_id
    and m.created_at >= b.start_at
    and m.created_at < b.end_at
    and m.is_hidden = false
  group by m.user_id
), participants_joined_my_rounds as (
  select r.created_by as user_id, count(distinct m.user_id)::int as c
  from week_rounds r
  join public.moments m on m.round_id = r.id
  where m.user_id <> r.created_by
    and m.is_hidden = false
  group by r.created_by
), reactions_received as (
  select m.user_id, count(rx.id)::int as c
  from public.moments m
  join public.reactions rx on rx.moment_id = m.id
  join bounds b on rx.created_at >= b.start_at and rx.created_at < b.end_at
  where m.group_id = p_group_id
    and m.is_hidden = false
  group by m.user_id
), fotons_received as (
  select m.user_id, count(pv.id)::int as c
  from public.moments m
  join public.photo_votes pv on pv.moment_id = m.id
  join bounds b on pv.created_at >= b.start_at and pv.created_at < b.end_at
  where m.group_id = p_group_id
    and m.is_hidden = false
  group by m.user_id
), winning_photos as (
  select m.user_id, count(*)::int as c
  from week_rounds r
  join public.moments m on m.id = r.winner_moment_id
  where r.status = 'closed'
    and m.is_hidden = false
  group by m.user_id
), participated_other_rounds as (
  select m.user_id, count(distinct m.round_id)::int as c
  from public.moments m
  join public.rounds r on r.id = m.round_id
  join bounds b on m.created_at >= b.start_at and m.created_at < b.end_at
  where m.group_id = p_group_id
    and m.user_id <> r.created_by
    and m.is_hidden = false
  group by m.user_id
)
select
  p.id as user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  (
    coalesce(rs.c, 0) * 10 +
    coalesce(mu.c, 0) * 5 +
    coalesce(pj.c, 0) * 3 +
    coalesce(rr.c, 0) * 1 +
    coalesce(fr.c, 0) * 8 +
    coalesce(wp.c, 0) * 15 +
    coalesce(po.c, 0) * 5
  )::int as score,
  coalesce(rs.c, 0) as rounds_started,
  coalesce(mu.c, 0) as moments_uploaded,
  coalesce(pj.c, 0) as participants_joined_my_rounds,
  coalesce(rr.c, 0) as reactions_received,
  coalesce(fr.c, 0) as fotons_received,
  coalesce(wp.c, 0) as winning_photos,
  coalesce(po.c, 0) as participated_other_rounds
from members mb
join public.profiles p on p.id = mb.user_id
left join rounds_started rs on rs.user_id = p.id
left join moments_uploaded mu on mu.user_id = p.id
left join participants_joined_my_rounds pj on pj.user_id = p.id
left join reactions_received rr on rr.user_id = p.id
left join fotons_received fr on fr.user_id = p.id
left join winning_photos wp on wp.user_id = p.id
left join participated_other_rounds po on po.user_id = p.id
where public.is_group_member(p_group_id, auth.uid())
order by score desc, fotons_received desc, winning_photos desc, rounds_started desc;
$$;

insert into storage.buckets (id, name, public)
values ('moments', 'moments', false)
on conflict (id) do nothing;

drop policy if exists moment_images_select_group_members on storage.objects;
create policy moment_images_select_group_members
on storage.objects for select
to authenticated
using (
  bucket_id = 'moments'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists moment_images_insert_group_members_own_folder on storage.objects;
create policy moment_images_insert_group_members_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'moments'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[3] = auth.uid()::text
);

drop policy if exists moment_images_delete_own_folder on storage.objects;
create policy moment_images_delete_own_folder
on storage.objects for delete
to authenticated
using (
  bucket_id = 'moments'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[3] = auth.uid()::text
);
