create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default pg_catalog.now(),
  last_seen_at timestamptz not null default pg_catalog.now(),
  constraint web_push_subscriptions_endpoint_length
    check (pg_catalog.char_length(endpoint) between 20 and 4096),
  constraint web_push_subscriptions_p256dh_length
    check (pg_catalog.char_length(p256dh) between 40 and 255),
  constraint web_push_subscriptions_auth_length
    check (pg_catalog.char_length(auth) between 8 and 255),
  constraint web_push_subscriptions_user_agent_length
    check (user_agent is null or pg_catalog.char_length(user_agent) <= 500)
);

create index web_push_subscriptions_user_id_idx
  on public.web_push_subscriptions (user_id);

alter table public.web_push_subscriptions enable row level security;

revoke all privileges on table public.web_push_subscriptions
  from public, anon, authenticated;
grant select, insert, update, delete on table public.web_push_subscriptions
  to service_role;

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
  if v_endpoint is null
     or v_endpoint !~ '^https://[^[:space:]]+$'
     or pg_catalog.char_length(v_endpoint) not between 20 and 4096 then
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
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      last_seen_at = excluded.last_seen_at
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

create or replace function public.unregister_web_push_subscription(p_endpoint text)
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

  delete from public.web_push_subscriptions subscription
  where subscription.user_id = v_user_id
    and subscription.endpoint = pg_catalog.btrim(p_endpoint);
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.register_web_push_subscription(text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_web_push_subscription(text, text, text, text)
  to authenticated, service_role;

revoke all on function public.unregister_web_push_subscription(text)
  from public, anon, authenticated, service_role;
grant execute on function public.unregister_web_push_subscription(text)
  to authenticated, service_role;
