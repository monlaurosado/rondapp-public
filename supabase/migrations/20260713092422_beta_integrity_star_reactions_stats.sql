-- Beta integrity hardening for voting, reactions, rounds, moderation, ranking,
-- private profile statistics, notifications, and account deletion.

create extension if not exists pg_cron;

create table if not exists public.round_notification_dispatches (
  round_id uuid primary key references public.rounds(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text
);

alter table public.round_notification_dispatches enable row level security;

revoke all privileges on table public.round_notification_dispatches
from public, anon, authenticated;
grant select, insert, update, delete on table public.round_notification_dispatches to service_role;

create table if not exists public.moment_storage_deletions (
  moment_id uuid primary key,
  image_path text not null unique,
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.moment_storage_deletions enable row level security;
revoke all privileges on table public.moment_storage_deletions
from public, anon, authenticated;
grant select, insert, update, delete on table public.moment_storage_deletions to service_role;

create table if not exists public.storage_cleanup_queue (
  image_path text primary key,
  source text not null check (source in ('account_deletion', 'moment_deletion')),
  source_id uuid,
  status text not null default 'pending' check (status in ('pending', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.storage_cleanup_queue enable row level security;
revoke all privileges on table public.storage_cleanup_queue
from public, anon, authenticated;
grant select, insert, update, delete on table public.storage_cleanup_queue to service_role;

drop trigger if exists storage_cleanup_queue_set_updated_at on public.storage_cleanup_queue;
create trigger storage_cleanup_queue_set_updated_at
before update on public.storage_cleanup_queue
for each row execute function public.set_updated_at();

-- Deleting a user must not delete rounds (and therefore moments) created by
-- other group members. A deleted winner is cleared and recomputed below.
alter table public.rounds
  alter column created_by drop not null;

alter table public.rounds
  drop constraint if exists rounds_created_by_fkey;
alter table public.rounds
  add constraint rounds_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.rounds
  drop constraint if exists rounds_winner_moment_id_fkey;
alter table public.rounds
  add constraint rounds_winner_moment_id_fkey
  foreign key (winner_moment_id) references public.moments(id) on delete set null
  deferrable initially deferred;

update public.rounds
set closed_at = coalesce(closed_at, closes_at)
where status = 'closed' and closed_at is null;

update public.rounds
set closed_at = null,
    winner_moment_id = null
where status = 'active'
  and (closed_at is not null or winner_moment_id is not null);

alter table public.rounds
  drop constraint if exists rounds_state_consistency;
alter table public.rounds
  add constraint rounds_state_consistency check (
    (status = 'active' and closed_at is null and winner_moment_id is null)
    or (status = 'closed' and closed_at is not null)
  );

create or replace function private.normalize_drink_type(p_drink_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(pg_catalog.btrim(p_drink_type))
    when '' then null
    when 'beer' then 'beer'
    when 'cerveza' then 'beer'
    when 'tinto' then 'tinto'
    when 'tinto_de_verano' then 'tinto'
    when 'tinto de verano' then 'tinto'
    when 'wine' then 'wine'
    when 'vino' then 'wine'
    when 'spirit' then 'spirit'
    when 'copa' then 'spirit'
    when 'cocktail' then 'cocktail'
    when 'coctel' then 'cocktail'
    when 'cóctel' then 'cocktail'
    when 'vermouth' then 'vermouth'
    when 'vermut' then 'vermouth'
    when 'soft_drink' then 'soft_drink'
    when 'refresco' then 'soft_drink'
    when 'zero_zero' then 'zero_zero'
    when '0,0' then 'zero_zero'
    when '0.0' then 'zero_zero'
    when 'sin alcohol' then 'zero_zero'
    when 'water' then 'water'
    when 'agua' then 'water'
    when 'other' then 'other'
    when 'otro' then 'other'
    when 'prefer_not_say' then 'prefer_not_say'
    when 'prefiero_no_decir' then 'prefer_not_say'
    when 'prefiero no decirlo' then 'prefer_not_say'
    else case when p_drink_type is null then null else 'other' end
  end;
$$;

update public.moments
set drink_type = private.normalize_drink_type(drink_type)
where drink_type is distinct from private.normalize_drink_type(drink_type);

alter table public.moments
  drop constraint if exists drink_type_length;
alter table public.moments
  drop constraint if exists moments_drink_type_check;
alter table public.moments
  add constraint moments_drink_type_check check (
    drink_type is null
    or drink_type in (
      'beer', 'tinto', 'wine', 'spirit', 'cocktail', 'vermouth',
      'soft_drink', 'zero_zero', 'water', 'other', 'prefer_not_say'
    )
  );

-- Consolidate legacy multi-reactions while writes are blocked. The most recent
-- explicit choice wins; UUID is the deterministic final tie-breaker.
begin;
lock table public.reactions in share row exclusive mode;
with ranked as (
  select id,
         row_number() over (
           partition by moment_id, user_id
           order by created_at desc, id desc
         ) as position
  from public.reactions
)
delete from public.reactions r
using ranked d
where r.id = d.id
  and d.position > 1;

alter table public.reactions
  drop constraint if exists reactions_moment_id_user_id_type_key;
alter table public.reactions
  drop constraint if exists reactions_moment_id_user_id_key;
alter table public.reactions
  add constraint reactions_moment_id_user_id_key unique (moment_id, user_id);

lock table public.photo_votes in share row exclusive mode;
with ranked as (
  select id,
         row_number() over (
           partition by round_id, voter_id
           order by updated_at desc, created_at desc, id desc
         ) as position
  from public.photo_votes
)
delete from public.photo_votes v
using ranked d
where v.id = d.id
  and d.position > 1;

alter table public.photo_votes
  drop constraint if exists photo_votes_round_id_voter_id_vote_type_key;
alter table public.photo_votes
  drop constraint if exists photo_votes_round_id_voter_id_key;
alter table public.photo_votes
  add constraint photo_votes_round_id_voter_id_key unique (round_id, voter_id);
commit;

create or replace function private.is_group_member(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user_id is not null and exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
  );
$$;

create or replace function private.is_group_admin(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user_id is not null and exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  );
$$;

create or replace function private.has_block_between(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select a is not null and b is not null and exists (
    select 1
    from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

create or replace function private.can_view_moment(
  p_moment_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user_id is not null and exists (
    select 1
    from public.moments m
    where m.id = p_moment_id
      and m.is_hidden = false
      and private.is_group_member(m.group_id, p_user_id)
      and not private.has_block_between(p_user_id, m.user_id)
      and not exists (
        select 1
        from public.reports rp
        where rp.reporter_id = p_user_id
          and rp.moment_id = m.id
      )
  );
$$;

create or replace function private.can_upload_moment_path(
  p_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_parts text[];
  v_filename text;
  v_group_id uuid;
begin
  if p_user_id is null then
    return false;
  end if;

  v_parts := storage.foldername(p_name);
  v_filename := pg_catalog.split_part(
    p_name,
    '/',
    pg_catalog.array_length(pg_catalog.string_to_array(p_name, '/'), 1)
  );
  if pg_catalog.cardinality(v_parts) <> 3
     or v_parts[3] <> p_user_id::text
     or v_filename !~* '^[0-9a-f-]{36}\.jpg$' then
    return false;
  end if;

  begin
    v_group_id := v_parts[1]::uuid;
    perform v_parts[2]::uuid;
    perform pg_catalog.replace(v_filename, '.jpg', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return private.is_group_member(v_group_id, p_user_id);
end;
$$;

create or replace function private.can_view_moment_storage_object(
  p_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_parts text[];
  v_filename text;
  v_moment_id uuid;
begin
  if p_user_id is null then
    return false;
  end if;

  v_parts := storage.foldername(p_name);
  v_filename := pg_catalog.split_part(
    p_name,
    '/',
    pg_catalog.array_length(pg_catalog.string_to_array(p_name, '/'), 1)
  );
  if pg_catalog.cardinality(v_parts) <> 3
     or v_filename !~* '^[0-9a-f-]{36}\.jpg$' then
    return false;
  end if;

  begin
    perform v_parts[1]::uuid;
    perform v_parts[2]::uuid;
    perform v_parts[3]::uuid;
    v_moment_id := pg_catalog.replace(v_filename, '.jpg', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return private.can_view_moment(v_moment_id, p_user_id)
    and exists (
      select 1
      from public.moments m
      where m.id = v_moment_id
        and m.image_path = p_name
    );
end;
$$;

create or replace function private.can_delete_unreferenced_moment_path(
  p_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.can_upload_moment_path(p_name, p_user_id)
    and not exists (
      select 1
      from public.moments m
      where m.image_path = p_name
    );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.validate_moment_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_expected_path text;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.round_id is distinct from old.round_id
       or new.group_id is distinct from old.group_id
       or new.user_id is distinct from old.user_id
       or new.image_path is distinct from old.image_path
       or new.created_at is distinct from old.created_at then
      raise exception 'moment identity cannot be changed';
    end if;
    new.updated_at := pg_catalog.now();
    new.drink_type := private.normalize_drink_type(new.drink_type);
    return new;
  end if;

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
      and r.closes_at > pg_catalog.now()
  ) then
    raise exception 'round is closed or group mismatch';
  end if;

  select count(*) into v_count
  from public.moments m
  where m.round_id = new.round_id
    and m.user_id = new.user_id;

  if v_count >= 3 then
    raise exception 'max moments per user per round reached';
  end if;

  v_expected_path := pg_catalog.concat(
    new.group_id::text, '/', new.round_id::text, '/', new.user_id::text, '/', new.id::text, '.jpg'
  );
  if new.image_path <> v_expected_path then
    raise exception 'image path does not match group, round, user and moment';
  end if;

  new.caption := nullif(pg_catalog.btrim(new.caption), '');
  new.drink_type := private.normalize_drink_type(new.drink_type);
  new.is_hidden := false;
  new.hidden_reason := null;
  new.created_at := pg_catalog.now();
  new.updated_at := new.created_at;
  return new;
end;
$$;

drop trigger if exists validate_moment_write_trigger on public.moments;
create trigger validate_moment_write_trigger
before insert or update on public.moments
for each row execute function public.validate_moment_write();

create or replace function public.validate_reaction_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_status public.round_status;
  v_closes_at timestamptz;
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.moment_id is distinct from old.moment_id
    or new.round_id is distinct from old.round_id
    or new.group_id is distinct from old.group_id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'reaction identity cannot be changed';
  end if;

  select m.user_id, r.status, r.closes_at
  into v_author_id, v_status, v_closes_at
  from public.moments m
  join public.rounds r on r.id = m.round_id
  where m.id = new.moment_id
    and m.round_id = new.round_id
    and m.group_id = new.group_id
    and m.is_hidden = false
  for share of r;

  if v_author_id is null
     or v_author_id = new.user_id
     or v_status <> 'active'
     or v_closes_at <= pg_catalog.now()
     or private.has_block_between(new.user_id, v_author_id) then
    raise exception 'reaction not allowed';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := pg_catalog.now();
  end if;
  return new;
end;
$$;

create or replace function public.validate_photo_vote_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_status public.round_status;
  v_closes_at timestamptz;
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.round_id is distinct from old.round_id
    or new.group_id is distinct from old.group_id
    or new.voter_id is distinct from old.voter_id
    or new.vote_type is distinct from old.vote_type
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'photo vote identity cannot be changed';
  end if;

  select m.user_id, r.status, r.closes_at
  into v_author_id, v_status, v_closes_at
  from public.moments m
  join public.rounds r on r.id = m.round_id
  where m.id = new.moment_id
    and m.round_id = new.round_id
    and m.group_id = new.group_id
    and m.is_hidden = false
  for share of r;

  if v_author_id is null
     or v_author_id = new.voter_id
     or v_status <> 'active'
     or v_closes_at <= pg_catalog.now()
     or private.has_block_between(new.voter_id, v_author_id) then
    raise exception 'photo vote not allowed';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := pg_catalog.now();
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.toggle_reaction(
  p_moment_id uuid,
  p_type text
)
returns table (
  action text,
  reaction_id uuid,
  moment_id uuid,
  reaction_type text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_group_id uuid;
  v_author_id uuid;
  v_status public.round_status;
  v_closes_at timestamptz;
  v_existing public.reactions%rowtype;
  v_reaction_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_type not in ('cheers', 'laugh', 'fire', 'wow') then
    raise exception 'invalid reaction type';
  end if;

  select m.round_id, m.group_id, m.user_id, r.status, r.closes_at
  into v_round_id, v_group_id, v_author_id, v_status, v_closes_at
  from public.moments m
  join public.rounds r on r.id = m.round_id
  where m.id = p_moment_id
    and m.is_hidden = false
  for share of r;

  if v_round_id is null
     or not private.is_group_member(v_group_id, v_user_id)
     or v_author_id = v_user_id
     or private.has_block_between(v_user_id, v_author_id)
     or v_status <> 'active'
     or v_closes_at <= pg_catalog.now() then
    raise exception 'reaction not allowed';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('reaction:' || p_moment_id::text || ':' || v_user_id::text, 0)
  );

  select r.* into v_existing
  from public.reactions r
  where r.moment_id = p_moment_id
    and r.user_id = v_user_id
  for update;

  if found and v_existing.type = p_type then
    delete from public.reactions r where r.id = v_existing.id;
    return query select 'removed'::text, null::uuid, p_moment_id, null::text;
    return;
  end if;

  if found then
    update public.reactions r
    set type = p_type
    where r.id = v_existing.id
    returning r.id into v_reaction_id;
    return query select 'changed'::text, v_reaction_id, p_moment_id, p_type;
    return;
  end if;

  insert into public.reactions (moment_id, round_id, group_id, user_id, type)
  values (p_moment_id, v_round_id, v_group_id, v_user_id, p_type)
  returning id into v_reaction_id;

  return query select 'added'::text, v_reaction_id, p_moment_id, p_type;
end;
$$;

create or replace function public.toggle_round_star(p_moment_id uuid)
returns table (
  action text,
  vote_id uuid,
  selected_moment_id uuid,
  round_id uuid,
  available integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_group_id uuid;
  v_author_id uuid;
  v_status public.round_status;
  v_closes_at timestamptz;
  v_existing public.photo_votes%rowtype;
  v_vote_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select m.round_id, m.group_id, m.user_id, r.status, r.closes_at
  into v_round_id, v_group_id, v_author_id, v_status, v_closes_at
  from public.moments m
  join public.rounds r on r.id = m.round_id
  where m.id = p_moment_id
    and m.is_hidden = false
  for share of r;

  if v_round_id is null
     or not private.is_group_member(v_group_id, v_user_id)
     or v_author_id = v_user_id
     or private.has_block_between(v_user_id, v_author_id)
     or v_status <> 'active'
     or v_closes_at <= pg_catalog.now() then
    raise exception 'round star not allowed';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('star:' || v_round_id::text || ':' || v_user_id::text, 0)
  );

  select v.* into v_existing
  from public.photo_votes v
  where v.round_id = v_round_id
    and v.voter_id = v_user_id
  for update;

  if found and v_existing.moment_id = p_moment_id then
    delete from public.photo_votes v where v.id = v_existing.id;
    return query select 'removed'::text, null::uuid, null::uuid, v_round_id, 1;
    return;
  end if;

  if found then
    update public.photo_votes v
    set moment_id = p_moment_id
    where v.id = v_existing.id
    returning v.id into v_vote_id;
    return query select 'moved'::text, v_vote_id, p_moment_id, v_round_id, 0;
    return;
  end if;

  insert into public.photo_votes (moment_id, round_id, group_id, voter_id, vote_type)
  values (p_moment_id, v_round_id, v_group_id, v_user_id, 'foton')
  returning id into v_vote_id;

  return query select 'added'::text, v_vote_id, p_moment_id, v_round_id, 0;
end;
$$;

create or replace function public.create_round_with_moment(
  p_group_id uuid,
  p_round_id uuid,
  p_moment_id uuid,
  p_image_path text,
  p_caption text default null,
  p_drink_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected_path text;
  v_existing_round public.rounds%rowtype;
  v_existing_moment public.moments%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.is_age_confirmed = true
  ) then
    raise exception 'age confirmation required';
  end if;
  v_expected_path := pg_catalog.concat(
    p_group_id::text, '/', p_round_id::text, '/', v_user_id::text, '/', p_moment_id::text, '.jpg'
  );
  if p_image_path <> v_expected_path then
    raise exception 'image path does not match round, user and moment';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('create-round:' || p_round_id::text, 0)
  );

  select r.* into v_existing_round
  from public.rounds r
  where r.id = p_round_id
  for update;

  if found then
    if v_existing_round.group_id <> p_group_id
       or v_existing_round.created_by is distinct from v_user_id then
      raise exception 'round id already exists with different ownership';
    end if;

    select m.* into v_existing_moment
    from public.moments m
    where m.id = p_moment_id;

    if not found
       or v_existing_moment.round_id <> p_round_id
       or v_existing_moment.group_id <> p_group_id
       or v_existing_moment.user_id <> v_user_id
       or v_existing_moment.image_path <> p_image_path
       or v_existing_moment.caption is distinct from nullif(pg_catalog.btrim(p_caption), '')
       or v_existing_moment.drink_type is distinct from private.normalize_drink_type(p_drink_type) then
      raise exception 'idempotency conflict for existing round';
    end if;
    return p_round_id;
  end if;

  if not private.is_group_member(p_group_id, v_user_id) then
    raise exception 'not a group member';
  end if;

  insert into public.rounds (id, group_id, created_by)
  values (p_round_id, p_group_id, v_user_id);

  insert into public.moments (
    id, round_id, group_id, user_id, image_path, caption, drink_type
  ) values (
    p_moment_id,
    p_round_id,
    p_group_id,
    v_user_id,
    p_image_path,
    nullif(pg_catalog.btrim(p_caption), ''),
    private.normalize_drink_type(p_drink_type)
  );

  return p_round_id;
end;
$$;

create or replace function public.create_moment(
  p_round_id uuid,
  p_moment_id uuid,
  p_image_path text,
  p_caption text default null,
  p_drink_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_status public.round_status;
  v_closes_at timestamptz;
  v_expected_path text;
  v_count integer;
  v_existing public.moments%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.is_age_confirmed = true
  ) then
    raise exception 'age confirmation required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('create-moment:' || p_round_id::text || ':' || v_user_id::text, 0)
  );

  -- Resolve an already committed identical request before checking whether the
  -- round is still open. This covers a lost response retried after closure.
  select m.* into v_existing
  from public.moments m
  where m.id = p_moment_id;

  if found then
    if v_existing.round_id = p_round_id
       and v_existing.user_id = v_user_id
       and v_existing.image_path = p_image_path
       and v_existing.caption is not distinct from nullif(pg_catalog.btrim(p_caption), '')
       and v_existing.drink_type is not distinct from private.normalize_drink_type(p_drink_type) then
      return p_moment_id;
    end if;
    raise exception 'idempotency conflict for existing moment';
  end if;

  select r.group_id, r.status, r.closes_at
  into v_group_id, v_status, v_closes_at
  from public.rounds r
  where r.id = p_round_id
  for share;

  if v_group_id is null
     or not private.is_group_member(v_group_id, v_user_id)
     or v_status <> 'active'
     or v_closes_at <= pg_catalog.now() then
    raise exception 'round is closed or not available';
  end if;

  v_expected_path := pg_catalog.concat(
    v_group_id::text, '/', p_round_id::text, '/', v_user_id::text, '/', p_moment_id::text, '.jpg'
  );
  if p_image_path <> v_expected_path then
    raise exception 'image path does not match round, user and moment';
  end if;

  select count(*) into v_count
  from public.moments m
  where m.round_id = p_round_id
    and m.user_id = v_user_id;
  if v_count >= 3 then
    raise exception 'max moments per user per round reached';
  end if;

  insert into public.moments (
    id, round_id, group_id, user_id, image_path, caption, drink_type
  ) values (
    p_moment_id,
    p_round_id,
    v_group_id,
    v_user_id,
    p_image_path,
    nullif(pg_catalog.btrim(p_caption), ''),
    private.normalize_drink_type(p_drink_type)
  );

  return p_moment_id;
end;
$$;

create or replace function public.validate_report_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_author_id uuid;
  v_hidden boolean;
begin
  -- FK ON DELETE SET NULL runs before the reported user's moments/reports are
  -- cascaded away. Permit only that nested referential action.
  if tg_op = 'UPDATE'
     and new.reported_user_id is null
     and old.reported_user_id is not null
     and pg_catalog.pg_trigger_depth() > 1 then
    return new;
  end if;

  select m.group_id, m.user_id, m.is_hidden
  into v_group_id, v_author_id, v_hidden
  from public.moments m
  where m.id = new.moment_id;

  if v_group_id is null
     or new.group_id is distinct from v_group_id
     or new.reported_user_id is distinct from v_author_id
     or new.reporter_id = v_author_id
     or v_hidden
     or not private.is_group_member(v_group_id, new.reporter_id)
     or private.has_block_between(new.reporter_id, v_author_id) then
    raise exception 'report not allowed or inconsistent';
  end if;

  if new.reason not in ('offensive', 'harassment', 'minor', 'dangerous', 'privacy', 'other') then
    raise exception 'invalid report reason';
  end if;
  if new.details is not null and pg_catalog.char_length(new.details) > 500 then
    raise exception 'report details too long';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.reporter_id is distinct from old.reporter_id
    or new.moment_id is distinct from old.moment_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'report identity cannot be changed';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := pg_catalog.now();
  end if;
  new.details := nullif(pg_catalog.btrim(new.details), '');
  return new;
end;
$$;

drop trigger if exists validate_report_write_trigger on public.reports;
create trigger validate_report_write_trigger
before insert or update on public.reports
for each row execute function public.validate_report_write();

create or replace function public.report_moment(
  p_moment_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_author_id uuid;
  v_hidden boolean;
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select m.group_id, m.user_id, m.is_hidden
  into v_group_id, v_author_id, v_hidden
  from public.moments m
  where m.id = p_moment_id;

  if v_group_id is null
     or v_hidden
     or v_author_id = v_user_id
     or not private.is_group_member(v_group_id, v_user_id)
     or private.has_block_between(v_user_id, v_author_id) then
    raise exception 'report not allowed';
  end if;

  insert into public.reports (
    reporter_id, reported_user_id, moment_id, group_id, reason, details
  ) values (
    v_user_id,
    v_author_id,
    p_moment_id,
    v_group_id,
    p_reason,
    nullif(pg_catalog.btrim(p_details), '')
  )
  on conflict (reporter_id, moment_id) do update
  set reported_user_id = excluded.reported_user_id,
      group_id = excluded.group_id,
      reason = excluded.reason,
      details = excluded.details
  returning id into v_report_id;

  return v_report_id;
end;
$$;

create or replace function public.hide_moment_after_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moment_id is not null and (
    select count(distinct r.reporter_id)
    from public.reports r
    where r.moment_id = new.moment_id
  ) >= 3 then
    update public.moments m
    set is_hidden = true,
        hidden_reason = 'report_threshold'
    where m.id = new.moment_id
      and m.is_hidden = false;
  end if;
  return new;
end;
$$;

create or replace function public.register_device_token(
  p_expo_push_token text,
  p_platform text default 'unknown',
  p_device_name text default null,
  p_app_version text default null,
  p_build_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token_id uuid;
  v_platform text := coalesce(p_platform, 'unknown');
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_expo_push_token is null
     or pg_catalog.char_length(p_expo_push_token) not between 10 and 255 then
    raise exception 'invalid push token';
  end if;
  if v_platform not in ('ios', 'android', 'unknown') then
    v_platform := 'unknown';
  end if;

  insert into public.device_tokens (
    user_id, expo_push_token, platform, device_name, app_version, build_number, last_seen_at
  ) values (
    v_user_id,
    p_expo_push_token,
    v_platform,
    nullif(pg_catalog.btrim(p_device_name), ''),
    nullif(pg_catalog.btrim(p_app_version), ''),
    nullif(pg_catalog.btrim(p_build_number), ''),
    pg_catalog.now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      device_name = excluded.device_name,
      app_version = excluded.app_version,
      build_number = excluded.build_number,
      last_seen_at = excluded.last_seen_at
  returning id into v_token_id;

  return v_token_id;
end;
$$;

create or replace function public.unregister_device_token(p_expo_push_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from public.device_tokens d
  where d.user_id = v_user_id
    and d.expo_push_token = p_expo_push_token;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.delete_moment(p_moment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_moment public.moments%rowtype;
  v_queued_path text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select q.image_path into v_queued_path
  from public.moment_storage_deletions q
  where q.moment_id = p_moment_id
    and q.requested_by = v_user_id;
  if found then
    return v_queued_path;
  end if;

  select m.* into v_moment
  from public.moments m
  where m.id = p_moment_id
  for update;
  if not found then
    raise exception 'moment not found';
  end if;
  if v_moment.user_id <> v_user_id
     and not private.is_group_admin(v_moment.group_id, v_user_id) then
    raise exception 'not allowed to delete this moment';
  end if;

  insert into public.moment_storage_deletions (moment_id, image_path, requested_by)
  values (v_moment.id, v_moment.image_path, v_user_id);

  insert into public.storage_cleanup_queue (
    image_path, source, source_id, status, attempt_count, last_error
  ) values (
    v_moment.image_path, 'moment_deletion', v_moment.id, 'pending', 0, null
  )
  on conflict (image_path) do update
  set source = excluded.source,
      source_id = excluded.source_id,
      status = 'pending',
      last_error = null;

  delete from public.moments m where m.id = v_moment.id;
  return v_moment.image_path;
end;
$$;

create or replace function public.claim_round_notification_dispatch(p_round_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required';
  end if;

  insert into public.round_notification_dispatches (
    round_id, status, attempt_count, claimed_at, sent_at, last_error
  ) values (
    p_round_id, 'processing', 1, pg_catalog.now(), null, null
  )
  on conflict (round_id) do update
  set status = 'processing',
      attempt_count = public.round_notification_dispatches.attempt_count + 1,
      claimed_at = pg_catalog.now(),
      sent_at = null,
      last_error = null
  where (
    public.round_notification_dispatches.status = 'failed'
    and public.round_notification_dispatches.last_error like 'retryable:%'
  ) or (
    public.round_notification_dispatches.status = 'processing'
    and public.round_notification_dispatches.last_error is null
    and public.round_notification_dispatches.claimed_at < pg_catalog.now() - interval '5 minutes'
  )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

-- Winner selection is centralized so manual closure, cron closure, and
-- moderation recomputation cannot drift. Invalidated blocked interactions do
-- not count, and the final UUID ordering makes every tie deterministic.
create or replace function private.compute_round_winner(p_round_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  with candidates as (
    select m.id, m.created_at, m.user_id, m.group_id
    from public.moments m
    where m.round_id = p_round_id
      and m.is_hidden = false
  ), star_counts as (
    select pv.moment_id, pg_catalog.count(*)::integer as total
    from public.photo_votes pv
    join candidates c on c.id = pv.moment_id
    where private.is_group_member(c.group_id, pv.voter_id)
      and not private.has_block_between(c.user_id, pv.voter_id)
    group by pv.moment_id
  ), reaction_counts as (
    select rx.moment_id, pg_catalog.count(*)::integer as total
    from public.reactions rx
    join candidates c on c.id = rx.moment_id
    where private.is_group_member(c.group_id, rx.user_id)
      and not private.has_block_between(c.user_id, rx.user_id)
    group by rx.moment_id
  )
  select c.id
  from candidates c
  left join star_counts sc on sc.moment_id = c.id
  left join reaction_counts rc on rc.moment_id = c.id
  order by
    coalesce(sc.total, 0) desc,
    coalesce(rc.total, 0) desc,
    c.created_at asc,
    c.id asc
  limit 1;
$$;

create or replace function public.close_round(p_round_id uuid)
returns table (
  round_id uuid,
  winner_moment_id uuid,
  status public.round_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round public.rounds%rowtype;
  v_winner uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select r.* into v_round
  from public.rounds r
  where r.id = p_round_id
  for update;

  if not found then
    raise exception 'round not found';
  end if;
  if not private.is_group_member(v_round.group_id, v_user_id) then
    raise exception 'not allowed';
  end if;

  if v_round.status = 'closed' then
    return query
    select r.id, r.winner_moment_id, r.status
    from public.rounds r
    where r.id = p_round_id;
    return;
  end if;

  if v_round.closes_at > pg_catalog.now()
     and v_round.created_by is distinct from v_user_id
     and not private.is_group_admin(v_round.group_id, v_user_id) then
    raise exception 'round still active';
  end if;

  v_winner := private.compute_round_winner(p_round_id);
  update public.rounds r
  set status = 'closed',
      closed_at = pg_catalog.now(),
      winner_moment_id = v_winner
  where r.id = p_round_id;

  return query
  select r.id, r.winner_moment_id, r.status
  from public.rounds r
  where r.id = p_round_id;
end;
$$;

create or replace function private.close_expired_rounds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round record;
  v_closed integer := 0;
begin
  for v_round in
    select r.id
    from public.rounds r
    where r.status = 'active'
      and r.closes_at <= pg_catalog.now()
    order by r.closes_at, r.id
    for update skip locked
  loop
    update public.rounds r
    set status = 'closed',
        closed_at = pg_catalog.now(),
        winner_moment_id = private.compute_round_winner(v_round.id)
    where r.id = v_round.id
      and r.status = 'active';
    if found then
      v_closed := v_closed + 1;
    end if;
  end loop;
  return v_closed;
end;
$$;

create or replace function private.cleanup_moment_deletion_receipts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.moment_storage_deletions d
  where d.completed_at < pg_catalog.now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function private.recompute_closed_round_winner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round_id uuid := case when tg_op = 'DELETE' then old.round_id else new.round_id end;
begin
  if tg_op = 'UPDATE' and new.is_hidden is not distinct from old.is_hidden then
    return new;
  end if;

  update public.rounds r
  set winner_moment_id = private.compute_round_winner(v_round_id)
  where r.id = v_round_id
    and r.status = 'closed';

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists recompute_closed_round_winner_trigger on public.moments;
create trigger recompute_closed_round_winner_trigger
after update of is_hidden or delete on public.moments
for each row execute function private.recompute_closed_round_winner();

update public.rounds r
set winner_moment_id = private.compute_round_winner(r.id)
where r.status = 'closed';

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select j.jobid
    from cron.job j
    where j.jobname = 'rondapp-close-expired-rounds'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'rondapp-close-expired-rounds',
    '* * * * *',
    'select private.close_expired_rounds();'
  );

  for v_job_id in
    select j.jobid
    from cron.job j
    where j.jobname = 'rondapp-cleanup-moment-deletion-receipts'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'rondapp-cleanup-moment-deletion-receipts',
    '17 3 * * *',
    'select private.cleanup_moment_deletion_receipts();'
  );
end;
$$;

create or replace function public.get_weekly_leaderboard(
  p_group_id uuid,
  p_week_start date
)
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
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception 'not authenticated';
  end if;
  if not private.is_group_member(p_group_id, v_caller_id) then
    raise exception 'not a group member';
  end if;

  return query
  with bounds as (
    select
      (p_week_start::timestamp without time zone at time zone 'Europe/Madrid') as start_at,
      ((p_week_start + 7)::timestamp without time zone at time zone 'Europe/Madrid') as end_at
  ), members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = p_group_id
      and not private.has_block_between(v_caller_id, gm.user_id)
  ), week_rounds as (
    select r.id, r.created_by, r.winner_moment_id, r.status
    from public.rounds r
    cross join bounds b
    where r.group_id = p_group_id
      and r.created_at >= b.start_at
      and r.created_at < b.end_at
  ), week_moments as (
    select m.id, m.round_id, m.user_id, m.group_id
    from public.moments m
    join week_rounds wr on wr.id = m.round_id
    where m.is_hidden = false
  ), rounds_started_metric as (
    select wr.created_by as metric_user_id, pg_catalog.count(*)::integer as total
    from week_rounds wr
    where exists (
      select 1 from week_moments wm where wm.round_id = wr.id
    )
      and wr.created_by is not null
    group by wr.created_by
  ), moments_uploaded_metric as (
    select wm.user_id as metric_user_id, pg_catalog.count(*)::integer as total
    from week_moments wm
    group by wm.user_id
  ), participant_pairs as (
    select distinct wr.id as round_id, wr.created_by, wm.user_id as participant_id
    from week_rounds wr
    join week_moments wm on wm.round_id = wr.id
    where wr.created_by is not null
      and wm.user_id <> wr.created_by
      and not private.has_block_between(wr.created_by, wm.user_id)
  ), participants_metric as (
    select pp.created_by as metric_user_id, pg_catalog.count(*)::integer as total
    from participant_pairs pp
    group by pp.created_by
  ), reactions_metric as (
    select wm.user_id as metric_user_id, pg_catalog.count(rx.id)::integer as total
    from week_moments wm
    join public.reactions rx on rx.moment_id = wm.id
    where private.is_group_member(wm.group_id, rx.user_id)
      and not private.has_block_between(wm.user_id, rx.user_id)
    group by wm.user_id
  ), stars_metric as (
    select wm.user_id as metric_user_id, pg_catalog.count(pv.id)::integer as total
    from week_moments wm
    join public.photo_votes pv on pv.moment_id = wm.id
    where private.is_group_member(wm.group_id, pv.voter_id)
      and not private.has_block_between(wm.user_id, pv.voter_id)
    group by wm.user_id
  ), wins_metric as (
    select wm.user_id as metric_user_id, pg_catalog.count(*)::integer as total
    from week_rounds wr
    join week_moments wm on wm.id = wr.winner_moment_id
    where wr.status = 'closed'
    group by wm.user_id
  ), participated_metric as (
    select pp.participant_id as metric_user_id, pg_catalog.count(*)::integer as total
    from participant_pairs pp
    group by pp.participant_id
  ), ranked as (
    select
      p.id as result_user_id,
      p.display_name as result_display_name,
      p.username as result_username,
      p.avatar_url as result_avatar_url,
      (
        coalesce(rs.total, 0) * 10
        + coalesce(mu.total, 0) * 5
        + coalesce(pj.total, 0) * 3
        + coalesce(rr.total, 0)
        + coalesce(fr.total, 0) * 8
        + coalesce(wp.total, 0) * 15
        + coalesce(po.total, 0) * 5
      )::integer as result_score,
      coalesce(rs.total, 0)::integer as result_rounds_started,
      coalesce(mu.total, 0)::integer as result_moments_uploaded,
      coalesce(pj.total, 0)::integer as result_participants,
      coalesce(rr.total, 0)::integer as result_reactions,
      coalesce(fr.total, 0)::integer as result_fotons,
      coalesce(wp.total, 0)::integer as result_wins,
      coalesce(po.total, 0)::integer as result_participated
    from members mb
    join public.profiles p on p.id = mb.user_id
    left join rounds_started_metric rs on rs.metric_user_id = p.id
    left join moments_uploaded_metric mu on mu.metric_user_id = p.id
    left join participants_metric pj on pj.metric_user_id = p.id
    left join reactions_metric rr on rr.metric_user_id = p.id
    left join stars_metric fr on fr.metric_user_id = p.id
    left join wins_metric wp on wp.metric_user_id = p.id
    left join participated_metric po on po.metric_user_id = p.id
  )
  select
    ranked.result_user_id,
    ranked.result_display_name,
    ranked.result_username,
    ranked.result_avatar_url,
    ranked.result_score,
    ranked.result_rounds_started,
    ranked.result_moments_uploaded,
    ranked.result_participants,
    ranked.result_reactions,
    ranked.result_fotons,
    ranked.result_wins,
    ranked.result_participated
  from ranked
  order by
    ranked.result_score desc,
    ranked.result_fotons desc,
    ranked.result_wins desc,
    ranked.result_rounds_started desc,
    ranked.result_user_id asc;
end;
$$;

create or replace function public.get_my_profile_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_with_drink integer;
  v_by_drink jsonb;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(*) filter (
      where m.drink_type is not null and m.drink_type <> 'prefer_not_say'
    )::integer
  into v_total, v_with_drink
  from public.moments m
  where m.user_id = v_user_id;

  select coalesce(
    pg_catalog.jsonb_object_agg(d.drink_type, d.total order by d.drink_type),
    '{}'::jsonb
  )
  into v_by_drink
  from (
    select m.drink_type, pg_catalog.count(*)::integer as total
    from public.moments m
    where m.user_id = v_user_id
      and m.drink_type is not null
      and m.drink_type <> 'prefer_not_say'
    group by m.drink_type
  ) d;

  return pg_catalog.jsonb_build_object(
    'total_moments', v_total,
    'total_with_drink', v_with_drink,
    'by_drink', v_by_drink
  );
end;
$$;

create or replace function public.join_group_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.is_age_confirmed = true
  ) then
    raise exception 'age confirmation required';
  end if;

  select sg.id into v_group_id
  from public.social_groups sg
  where sg.invite_code = pg_catalog.upper(pg_catalog.btrim(p_invite_code))
    and sg.is_active = true;

  if v_group_id is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member'::public.group_role)
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

create or replace function public.validate_group_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if new.group_id is distinct from old.group_id
     or new.user_id is distinct from old.user_id then
    raise exception 'group membership identity cannot be changed';
  end if;
  if new.joined_at is distinct from old.joined_at then
    raise exception 'membership join date cannot be changed';
  end if;

  -- Nested ownership transfer runs from the profile deletion trigger. All
  -- ordinary Data API callers may update only their own muted flag.
  if auth.role() = 'service_role' or pg_catalog.pg_trigger_depth() > 1 then
    return new;
  end if;
  if v_actor is null or old.user_id is distinct from v_actor then
    raise exception 'members can update only their own notification settings';
  end if;
  if new.role is distinct from old.role then
    raise exception 'membership role cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function private.transfer_groups_before_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group record;
  v_replacement_id uuid;
begin
  for v_group in
    select sg.id
    from public.social_groups sg
    where sg.owner_id = old.id
    order by sg.created_at, sg.id
    for update
  loop
    select gm.user_id
    into v_replacement_id
    from public.group_members gm
    where gm.group_id = v_group.id
      and gm.user_id <> old.id
    order by gm.joined_at, gm.user_id
    limit 1
    for update;

    if v_replacement_id is null then
      delete from public.social_groups sg where sg.id = v_group.id;
    else
      update public.group_members gm
      set role = 'owner'::public.group_role
      where gm.group_id = v_group.id
        and gm.user_id = v_replacement_id;

      update public.social_groups sg
      set owner_id = v_replacement_id
      where sg.id = v_group.id;
    end if;
  end loop;
  return old;
end;
$$;

drop trigger if exists transfer_groups_before_profile_delete_trigger on public.profiles;
create trigger transfer_groups_before_profile_delete_trigger
before delete on public.profiles
for each row execute function private.transfer_groups_before_profile_delete();

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns table (
  own_paths text[],
  removed_group_paths text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_own_paths text[];
  v_removed_paths text[];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required';
  end if;

  select coalesce(pg_catalog.array_agg(distinct m.image_path), array[]::text[])
  into v_own_paths
  from public.moments m
  where m.user_id = p_user_id;

  select coalesce(pg_catalog.array_agg(distinct m.image_path), array[]::text[])
  into v_removed_paths
  from public.moments m
  join public.social_groups sg on sg.id = m.group_id
  where sg.owner_id = p_user_id
    and not exists (
      select 1
      from public.group_members gm
      where gm.group_id = sg.id
        and gm.user_id <> p_user_id
    );

  return query select
    coalesce(v_own_paths, array[]::text[]),
    coalesce(v_removed_paths, array[]::text[]);
end;
$$;

-- RLS reads follow the same visibility contract as the moment itself. This
-- prevents hidden/reported/blocked content from leaking through child rows or
-- signed Storage URLs.
drop policy if exists moments_select_group_members_not_blocked on public.moments;
create policy moments_select_group_members_not_blocked
on public.moments for select
to authenticated
using (private.can_view_moment(id, (select auth.uid())));

drop policy if exists moments_insert_members_active_round on public.moments;
drop policy if exists moments_delete_own on public.moments;

drop policy if exists reactions_select_members on public.reactions;
create policy reactions_select_members
on public.reactions for select
to authenticated
using (
  private.can_view_moment(moment_id, (select auth.uid()))
  and not private.has_block_between((select auth.uid()), user_id)
);

drop policy if exists reactions_insert_members_active_round on public.reactions;
drop policy if exists reactions_delete_own on public.reactions;

drop policy if exists photo_votes_select_members on public.photo_votes;
create policy photo_votes_select_members
on public.photo_votes for select
to authenticated
using (
  private.can_view_moment(moment_id, (select auth.uid()))
  and not private.has_block_between((select auth.uid()), voter_id)
);

drop policy if exists photo_votes_insert_members on public.photo_votes;
drop policy if exists photo_votes_update_own on public.photo_votes;
drop policy if exists photo_votes_delete_own on public.photo_votes;

drop policy if exists rounds_insert_members on public.rounds;
drop policy if exists rounds_update_creator_or_admin on public.rounds;

drop policy if exists group_members_update_self_muted_or_admin on public.group_members;
create policy group_members_update_self_muted_or_admin
on public.group_members for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists reports_insert_own_member on public.reports;
create policy reports_insert_own_member
on public.reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1
    from public.moments m
    where m.id = reports.moment_id
      and m.group_id = reports.group_id
      and m.user_id = reports.reported_user_id
      and m.user_id <> (select auth.uid())
      and m.is_hidden = false
      and private.is_group_member(m.group_id, (select auth.uid()))
      and not private.has_block_between((select auth.uid()), m.user_id)
  )
);

drop policy if exists reports_select_own_or_group_admin on public.reports;
create policy reports_select_own_or_group_admin
on public.reports for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or private.is_group_admin(group_id, (select auth.uid()))
);

drop policy if exists device_tokens_insert_own on public.device_tokens;
drop policy if exists device_tokens_update_own on public.device_tokens;
drop policy if exists device_tokens_delete_own on public.device_tokens;

drop policy if exists moment_images_select_group_members on storage.objects;
create policy moment_images_select_group_members
on storage.objects for select
to authenticated
using (
  bucket_id = 'moments'
  and (
    private.can_view_moment_storage_object(name, (select auth.uid()))
    or private.can_delete_unreferenced_moment_path(name, (select auth.uid()))
  )
);

drop policy if exists moment_images_insert_group_members_own_folder on storage.objects;
create policy moment_images_insert_group_members_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'moments'
  and private.can_upload_moment_path(name, (select auth.uid()))
);

drop policy if exists moment_images_delete_own_folder on storage.objects;
create policy moment_images_delete_own_folder
on storage.objects for delete
to authenticated
using (
  bucket_id = 'moments'
  and private.can_delete_unreferenced_moment_path(name, (select auth.uid()))
);

-- Mutations with cross-row invariants only go through the RPCs above.
revoke insert, update on table public.rounds from authenticated;
revoke insert, delete on table public.moments from authenticated;
revoke insert, update, delete on table public.reactions from authenticated;
revoke insert, update, delete on table public.photo_votes from authenticated;
revoke insert on table public.reports from authenticated;
revoke insert, update, delete on table public.device_tokens from authenticated;

drop index if exists public.idx_blocks_blocked;
create index idx_blocks_blocked
  on public.blocks (blocked_id, blocker_id);
create index if not exists idx_rounds_group_created
  on public.rounds (group_id, created_at, id);
create index if not exists idx_rounds_active_closes_at
  on public.rounds (closes_at, id)
  where status = 'active';
create index if not exists idx_round_notification_dispatches_status
  on public.round_notification_dispatches (status, claimed_at);
create index if not exists idx_storage_cleanup_queue_status
  on public.storage_cleanup_queue (status, updated_at);
create index if not exists idx_moment_storage_deletions_requested_by
  on public.moment_storage_deletions (requested_by)
  where requested_by is not null;

-- Helpers used directly from RLS need schema usage/execute. Internal helpers
-- and all trigger functions remain owner-only.
grant usage on schema private to authenticated;

revoke all on function private.is_group_member(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.is_group_admin(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.has_block_between(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_view_moment(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_upload_moment_path(text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_view_moment_storage_object(text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_delete_unreferenced_moment_path(text, uuid)
  from public, anon, authenticated, service_role;

grant execute on function private.is_group_member(uuid, uuid) to authenticated;
grant execute on function private.is_group_admin(uuid, uuid) to authenticated;
grant execute on function private.has_block_between(uuid, uuid) to authenticated;
grant execute on function private.can_view_moment(uuid, uuid) to authenticated;
grant execute on function private.can_upload_moment_path(text, uuid) to authenticated;
grant execute on function private.can_view_moment_storage_object(text, uuid) to authenticated;
grant execute on function private.can_delete_unreferenced_moment_path(text, uuid) to authenticated;

revoke all on function private.normalize_drink_type(text)
  from public, anon, authenticated, service_role;
revoke all on function private.compute_round_winner(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.close_expired_rounds()
  from public, anon, authenticated, service_role;
revoke all on function private.cleanup_moment_deletion_receipts()
  from public, anon, authenticated, service_role;
revoke all on function private.recompute_closed_round_winner()
  from public, anon, authenticated, service_role;
revoke all on function private.transfer_groups_before_profile_delete()
  from public, anon, authenticated, service_role;

revoke all on function public.set_updated_at()
  from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_moment_write()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_reaction_write()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_photo_vote_write()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_report_write()
  from public, anon, authenticated, service_role;
revoke all on function public.hide_moment_after_reports()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_group_member_update()
  from public, anon, authenticated, service_role;

revoke all on function public.toggle_reaction(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.toggle_round_star(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.create_moment(uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.report_moment(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.register_device_token(text, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.unregister_device_token(text)
  from public, anon, authenticated, service_role;
revoke all on function public.delete_moment(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.close_round(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.join_group_by_invite(text)
  from public, anon, authenticated, service_role;
revoke all on function public.get_weekly_leaderboard(uuid, date)
  from public, anon, authenticated, service_role;
revoke all on function public.get_my_profile_stats()
  from public, anon, authenticated, service_role;

grant execute on function public.toggle_reaction(uuid, text) to authenticated, service_role;
grant execute on function public.toggle_round_star(uuid) to authenticated, service_role;
grant execute on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.create_moment(uuid, uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.report_moment(uuid, text, text)
  to authenticated, service_role;
grant execute on function public.register_device_token(text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.unregister_device_token(text)
  to authenticated, service_role;
grant execute on function public.delete_moment(uuid) to authenticated, service_role;
grant execute on function public.close_round(uuid) to authenticated, service_role;
grant execute on function public.join_group_by_invite(text) to authenticated, service_role;
grant execute on function public.get_weekly_leaderboard(uuid, date)
  to authenticated, service_role;
grant execute on function public.get_my_profile_stats() to authenticated, service_role;

revoke all on function public.prepare_account_deletion(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
revoke all on function public.claim_round_notification_dispatch(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_round_notification_dispatch(uuid) to service_role;

alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;
