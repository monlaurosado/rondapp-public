-- Keep a single live conversation per group. Expired rounds are closed first,
-- then any historical duplicates are reconciled by retaining the newest one.
update public.rounds r
set status = 'closed',
    closed_at = pg_catalog.now(),
    winner_moment_id = private.compute_round_winner(r.id)
where r.status = 'active'
  and r.closes_at <= pg_catalog.now();

with ranked_active_rounds as (
  select
    r.id,
    pg_catalog.row_number() over (
      partition by r.group_id
      order by r.created_at desc, r.id desc
    ) as active_position
  from public.rounds r
  where r.status = 'active'
)
update public.rounds r
set status = 'closed',
    closed_at = pg_catalog.now(),
    winner_moment_id = private.compute_round_winner(r.id)
from ranked_active_rounds ranked
where ranked.id = r.id
  and ranked.active_position > 1;

create unique index if not exists idx_rounds_one_active_per_group
  on public.rounds (group_id)
  where status = 'active';

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

  -- Preserve idempotent retries for a request that already committed.
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

  -- Different users can submit different round IDs at the same time. A lock
  -- scoped to the group makes the check-and-insert atomic for that race.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('create-round-group:' || p_group_id::text, 0)
  );

  update public.rounds r
  set status = 'closed',
      closed_at = pg_catalog.now(),
      winner_moment_id = private.compute_round_winner(r.id)
  where r.group_id = p_group_id
    and r.status = 'active'
    and r.closes_at <= pg_catalog.now();

  if exists (
    select 1
    from public.rounds r
    where r.group_id = p_group_id
      and r.status = 'active'
  ) then
    raise exception 'active round already exists';
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

revoke all on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text)
  to authenticated, service_role;

-- Group deletion removes the relational graph transactionally and leaves a
-- durable list of private Storage objects for immediate or deferred cleanup.
alter table public.storage_cleanup_queue
  drop constraint if exists storage_cleanup_queue_source_check;
alter table public.storage_cleanup_queue
  add constraint storage_cleanup_queue_source_check
  check (source in ('account_deletion', 'moment_deletion', 'group_deletion'));

create or replace function public.delete_owned_group(p_group_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_image_paths text[];
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('delete-group:' || p_group_id::text, 0)
  );

  select sg.owner_id into v_owner_id
  from public.social_groups sg
  where sg.id = p_group_id
  for update;

  if not found then
    raise exception 'group not found';
  end if;
  if v_owner_id <> v_user_id then
    raise exception 'only group owner can delete group';
  end if;

  select coalesce(
    pg_catalog.array_agg(distinct m.image_path),
    array[]::text[]
  ) into v_image_paths
  from public.moments m
  where m.group_id = p_group_id;

  insert into public.storage_cleanup_queue (
    image_path, source, source_id, status, attempt_count, last_error
  )
  select
    queued.image_path,
    'group_deletion',
    p_group_id,
    'pending',
    0,
    null
  from pg_catalog.unnest(v_image_paths) as queued(image_path)
  on conflict (image_path) do update
  set source = excluded.source,
      source_id = excluded.source_id,
      status = 'pending',
      attempt_count = 0,
      last_error = null;

  delete from public.social_groups sg
  where sg.id = p_group_id;

  return v_image_paths;
end;
$$;

revoke all on function public.delete_owned_group(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.delete_owned_group(uuid)
  to authenticated, service_role;
