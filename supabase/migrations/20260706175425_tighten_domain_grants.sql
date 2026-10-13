-- Tighten Data API exposure after creating the MVP schema.
-- RLS remains the authorization layer; these grants define which roles can reach each object at all.

revoke all privileges on table
  public.profiles,
  public.social_groups,
  public.group_members,
  public.rounds,
  public.moments,
  public.reactions,
  public.photo_votes,
  public.device_tokens,
  public.reports,
  public.blocks
from public, anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.social_groups to authenticated;
grant select, insert, update on table public.group_members to authenticated;
grant select, insert, update on table public.rounds to authenticated;
grant select, insert, delete on table public.moments to authenticated;
grant select, insert, delete on table public.reactions to authenticated;
grant select, insert, update, delete on table public.photo_votes to authenticated;
grant select, insert, update, delete on table public.device_tokens to authenticated;
grant select, insert on table public.reports to authenticated;
grant select, insert, delete on table public.blocks to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.social_groups,
  public.group_members,
  public.rounds,
  public.moments,
  public.reactions,
  public.photo_votes,
  public.device_tokens,
  public.reports,
  public.blocks
to service_role;

revoke execute on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_group_member(uuid, uuid) to authenticated;
grant execute on function private.has_block_between(uuid, uuid) to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
