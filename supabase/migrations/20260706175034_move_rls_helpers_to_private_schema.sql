create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
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

create or replace function private.has_block_between(a uuid, b uuid)
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

grant execute on function private.is_group_member(uuid, uuid) to authenticated;
grant execute on function private.has_block_between(uuid, uuid) to authenticated;

create or replace function public.validate_reaction_write()
returns trigger
language plpgsql
security definer
set search_path = public, private
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
      and not private.has_block_between(new.user_id, m.user_id)
  ) then
    raise exception 'reaction not allowed';
  end if;
  return new;
end;
$$;

create or replace function public.validate_photo_vote_write()
returns trigger
language plpgsql
security definer
set search_path = public, private
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
      and not private.has_block_between(new.voter_id, m.user_id)
  ) then
    raise exception 'photo vote not allowed';
  end if;
  new.updated_at = now();
  return new;
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
set search_path = public, private
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

  if not private.is_group_member(v_group_id, auth.uid()) then
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
set search_path = public, private
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
where private.is_group_member(p_group_id, auth.uid())
order by score desc, fotons_received desc, winning_photos desc, rounds_started desc;
$$;

drop policy if exists groups_select_members on public.social_groups;
create policy groups_select_members
on public.social_groups for select
to authenticated
using (private.is_group_member(id));

drop policy if exists group_members_select_members on public.group_members;
create policy group_members_select_members
on public.group_members for select
to authenticated
using (private.is_group_member(group_id) or user_id = (select auth.uid()));

drop policy if exists rounds_select_members on public.rounds;
create policy rounds_select_members
on public.rounds for select
to authenticated
using (private.is_group_member(group_id));

drop policy if exists rounds_insert_members on public.rounds;
create policy rounds_insert_members
on public.rounds for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_group_member(group_id)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_age_confirmed = true
  )
);

drop policy if exists moments_select_group_members_not_blocked on public.moments;
create policy moments_select_group_members_not_blocked
on public.moments for select
to authenticated
using (
  private.is_group_member(group_id)
  and is_hidden = false
  and not private.has_block_between((select auth.uid()), user_id)
);

drop policy if exists moments_insert_members_active_round on public.moments;
create policy moments_insert_members_active_round
on public.moments for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_group_member(group_id)
);

drop policy if exists reactions_select_members on public.reactions;
create policy reactions_select_members
on public.reactions for select
to authenticated
using (private.is_group_member(group_id));

drop policy if exists reactions_insert_members_active_round on public.reactions;
create policy reactions_insert_members_active_round
on public.reactions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_group_member(group_id)
);

drop policy if exists photo_votes_select_members on public.photo_votes;
create policy photo_votes_select_members
on public.photo_votes for select
to authenticated
using (private.is_group_member(group_id));

drop policy if exists photo_votes_insert_members on public.photo_votes;
create policy photo_votes_insert_members
on public.photo_votes for insert
to authenticated
with check (
  voter_id = (select auth.uid())
  and private.is_group_member(group_id)
);

drop policy if exists photo_votes_update_own on public.photo_votes;
create policy photo_votes_update_own
on public.photo_votes for update
to authenticated
using (voter_id = (select auth.uid()))
with check (
  voter_id = (select auth.uid())
  and private.is_group_member(group_id)
);

drop policy if exists reports_insert_own_member on public.reports;
create policy reports_insert_own_member
on public.reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and (group_id is null or private.is_group_member(group_id))
);

drop policy if exists reports_select_own_or_group_admin on public.reports;
create policy reports_select_own_or_group_admin
on public.reports for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = reports.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner', 'admin')
  )
);

drop policy if exists moment_images_select_group_members on storage.objects;
create policy moment_images_select_group_members
on storage.objects for select
to authenticated
using (
  bucket_id = 'moments'
  and private.is_group_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists moment_images_insert_group_members_own_folder on storage.objects;
create policy moment_images_insert_group_members_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'moments'
  and private.is_group_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

drop policy if exists moment_images_delete_own_folder on storage.objects;
create policy moment_images_delete_own_folder
on storage.objects for delete
to authenticated
using (
  bucket_id = 'moments'
  and private.is_group_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

drop function if exists public.is_group_member(uuid, uuid);
drop function if exists public.has_block_between(uuid, uuid);

revoke execute on function public.close_round(uuid) from public, anon;
revoke execute on function public.join_group_by_invite(text) from public, anon;
revoke execute on function public.get_weekly_leaderboard(uuid, date) from public, anon;
grant execute on function public.close_round(uuid) to authenticated;
grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.get_weekly_leaderboard(uuid, date) to authenticated;
