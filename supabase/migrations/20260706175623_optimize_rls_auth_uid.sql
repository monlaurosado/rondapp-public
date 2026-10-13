drop policy if exists profiles_select_same_groups_or_self on public.profiles;
create policy profiles_select_same_groups_or_self
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.group_members me
    join public.group_members other on other.group_id = me.group_id
    where me.user_id = (select auth.uid())
      and other.user_id = profiles.id
  )
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists groups_insert_owner on public.social_groups;
create policy groups_insert_owner
on public.social_groups for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_age_confirmed = true
  )
);

drop policy if exists groups_update_owner_admin on public.social_groups;
create policy groups_update_owner_admin
on public.social_groups for update
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = social_groups.id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  )
)
with check (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = social_groups.id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  )
);

drop policy if exists group_members_insert_creator_owner on public.group_members;
create policy group_members_insert_creator_owner
on public.group_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.social_groups sg
    where sg.id = group_members.group_id
      and sg.owner_id = (select auth.uid())
  )
);

drop policy if exists group_members_update_self_muted_or_admin on public.group_members;
create policy group_members_update_self_muted_or_admin
on public.group_members for update
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  )
);

drop policy if exists rounds_update_creator_or_admin on public.rounds;
create policy rounds_update_creator_or_admin
on public.rounds for update
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = rounds.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  )
)
with check (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = rounds.group_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  )
);

drop policy if exists moments_delete_own on public.moments;
create policy moments_delete_own
on public.moments for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_delete_own
on public.reactions for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists photo_votes_delete_own on public.photo_votes;
create policy photo_votes_delete_own
on public.photo_votes for delete
to authenticated
using (voter_id = (select auth.uid()));

drop policy if exists device_tokens_select_own on public.device_tokens;
create policy device_tokens_select_own
on public.device_tokens for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists device_tokens_insert_own on public.device_tokens;
create policy device_tokens_insert_own
on public.device_tokens for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists device_tokens_update_own on public.device_tokens;
create policy device_tokens_update_own
on public.device_tokens for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists device_tokens_delete_own on public.device_tokens;
create policy device_tokens_delete_own
on public.device_tokens for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own
on public.blocks for select
to authenticated
using (
  blocker_id = (select auth.uid())
  or blocked_id = (select auth.uid())
);

drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own
on public.blocks for insert
to authenticated
with check (blocker_id = (select auth.uid()));

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own
on public.blocks for delete
to authenticated
using (blocker_id = (select auth.uid()));
