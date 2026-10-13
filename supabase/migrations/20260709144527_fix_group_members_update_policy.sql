create or replace function private.is_group_admin(
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
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
      and gm.role in ('owner'::public.group_role, 'admin'::public.group_role)
  );
$$;

grant execute on function private.is_group_admin(uuid, uuid) to authenticated;

create or replace function public.validate_group_member_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_is_admin boolean := private.is_group_admin(old.group_id, v_actor);
begin
  if new.group_id <> old.group_id or new.user_id <> old.user_id then
    raise exception 'group membership identity cannot be changed';
  end if;

  if new.joined_at <> old.joined_at then
    raise exception 'membership join date cannot be changed';
  end if;

  if old.user_id = v_actor and not v_actor_is_admin and new.role <> old.role then
    raise exception 'members can only update notification settings';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_group_member_update() from public, anon, authenticated;

drop trigger if exists validate_group_member_update_trigger on public.group_members;
create trigger validate_group_member_update_trigger
before update on public.group_members
for each row execute function public.validate_group_member_update();

drop policy if exists group_members_update_self_muted_or_admin on public.group_members;
create policy group_members_update_self_muted_or_admin
on public.group_members for update
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_group_admin(group_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or private.is_group_admin(group_id, (select auth.uid()))
);
