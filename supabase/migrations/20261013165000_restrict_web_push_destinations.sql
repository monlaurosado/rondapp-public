-- Restrict outbound notification destinations without deleting existing data.
create or replace function private.is_allowed_web_push_endpoint(p_endpoint text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    pg_catalog.char_length(p_endpoint) between 20 and 4096
    and p_endpoint !~ '[[:space:]]'
    and p_endpoint ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|[a-z0-9-]+[.]push[.]apple[.]com|[a-z0-9-]+[.]notify[.]windows[.]com)/[A-Za-z0-9_~!$&()*+,;=:@%/?-]+$',
    false
  );
$$;

revoke all on function private.is_allowed_web_push_endpoint(text)
  from public, anon, authenticated;
grant execute on function private.is_allowed_web_push_endpoint(text)
  to service_role;

-- Existing rows remain readable for cleanup; new/updated rows must be safe.
alter table public.web_push_subscriptions
  add constraint web_push_subscriptions_allowed_endpoint
  check (private.is_allowed_web_push_endpoint(endpoint)) not valid;

create or replace function public.register_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription_id uuid;
  v_endpoint text := pg_catalog.btrim(p_endpoint);
  v_p256dh text := pg_catalog.btrim(p_p256dh);
  v_auth text := pg_catalog.btrim(p_auth);
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if not private.is_allowed_web_push_endpoint(v_endpoint) then
    raise exception 'invalid web push endpoint';
  end if;
  if v_p256dh is null
     or v_p256dh !~ '^[A-Za-z0-9_-]+$'
     or pg_catalog.char_length(v_p256dh) not between 40 and 255 then
    raise exception 'invalid web push p256dh key';
  end if;
  if v_auth is null
     or v_auth !~ '^[A-Za-z0-9_-]+$'
     or pg_catalog.char_length(v_auth) not between 8 and 255 then
    raise exception 'invalid web push auth key';
  end if;
  if p_user_agent is not null and pg_catalog.char_length(p_user_agent) > 500 then
    raise exception 'invalid web push user agent';
  end if;

  -- Serialize registrations for one account, including concurrent devices.
  perform 1 from public.profiles where id = v_user_id for update;
  if not exists (
    select 1 from public.web_push_subscriptions
    where user_id = v_user_id and endpoint = v_endpoint
  ) and (select count(*) from public.web_push_subscriptions
         where user_id = v_user_id) >= 10 then
    raise exception 'web push subscription limit reached';
  end if;

  insert into public.web_push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    last_seen_at
  ) values (
    v_user_id,
    v_endpoint,
    v_p256dh,
    v_auth,
    nullif(pg_catalog.btrim(p_user_agent), ''),
    pg_catalog.now()
  )
  on conflict (endpoint) do update
  set p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      last_seen_at = excluded.last_seen_at
  where public.web_push_subscriptions.user_id = v_user_id
  returning id into v_subscription_id;
  if v_subscription_id is null then
    raise exception 'web push subscription unavailable';
  end if;

  return v_subscription_id;
end;
$$;

