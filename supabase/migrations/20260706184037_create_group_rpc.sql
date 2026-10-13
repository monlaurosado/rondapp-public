create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(btrim(p_name), '');
  v_group_id uuid;
  v_invite_code text;
  v_attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'group name must be between 2 and 40 characters';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.is_age_confirmed = true
  ) then
    raise exception 'age confirmation required';
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_invite_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));

    exit when not exists (
      select 1
      from public.social_groups sg
      where sg.invite_code = v_invite_code
    );

    if v_attempts >= 10 then
      raise exception 'could not generate invite code';
    end if;
  end loop;

  insert into public.social_groups (name, owner_id, invite_code)
  values (v_name, v_user_id, v_invite_code)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner'::public.group_role);

  return v_group_id;
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.create_group(text) to service_role;

revoke insert on table public.social_groups from authenticated;
revoke insert on table public.group_members from authenticated;
