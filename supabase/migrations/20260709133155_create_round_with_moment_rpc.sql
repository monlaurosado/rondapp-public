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
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected_path text;
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

  if not private.is_group_member(p_group_id, v_user_id) then
    raise exception 'not a group member';
  end if;

  v_expected_path := concat(p_group_id::text, '/', p_round_id::text, '/', v_user_id::text, '/', p_moment_id::text, '.jpg');

  if p_image_path <> v_expected_path then
    raise exception 'image path does not match round, user and moment';
  end if;

  insert into public.rounds (id, group_id, created_by)
  values (p_round_id, p_group_id, v_user_id);

  insert into public.moments (
    id,
    round_id,
    group_id,
    user_id,
    image_path,
    caption,
    drink_type
  )
  values (
    p_moment_id,
    p_round_id,
    p_group_id,
    v_user_id,
    p_image_path,
    nullif(trim(p_caption), ''),
    nullif(trim(p_drink_type), '')
  );

  return p_round_id;
end;
$$;

revoke execute on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.create_round_with_moment(uuid, uuid, uuid, text, text, text) to service_role;
