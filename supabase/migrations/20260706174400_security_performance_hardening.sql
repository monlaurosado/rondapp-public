create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.validate_moment_write() from anon, authenticated;
revoke execute on function public.validate_reaction_write() from anon, authenticated;
revoke execute on function public.validate_photo_vote_write() from anon, authenticated;
revoke execute on function public.hide_moment_after_reports() from anon, authenticated;
revoke execute on function public.close_round(uuid) from anon;
revoke execute on function public.join_group_by_invite(text) from anon;
revoke execute on function public.get_weekly_leaderboard(uuid, date) from anon;
grant execute on function public.close_round(uuid) to authenticated;
grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.get_weekly_leaderboard(uuid, date) to authenticated;

create index if not exists idx_blocks_blocked on public.blocks(blocked_id);
create index if not exists idx_moments_user on public.moments(user_id);
create index if not exists idx_photo_votes_group on public.photo_votes(group_id);
create index if not exists idx_photo_votes_moment on public.photo_votes(moment_id);
create index if not exists idx_photo_votes_voter on public.photo_votes(voter_id);
create index if not exists idx_reactions_group on public.reactions(group_id);
create index if not exists idx_reactions_round on public.reactions(round_id);
create index if not exists idx_reactions_user on public.reactions(user_id);
create index if not exists idx_reports_group on public.reports(group_id);
create index if not exists idx_reports_moment on public.reports(moment_id);
create index if not exists idx_reports_reported_user on public.reports(reported_user_id);
create index if not exists idx_rounds_created_by on public.rounds(created_by);
create index if not exists idx_rounds_winner_moment on public.rounds(winner_moment_id);
create index if not exists idx_social_groups_owner on public.social_groups(owner_id);
