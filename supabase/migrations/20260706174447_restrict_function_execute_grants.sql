revoke execute on function public.handle_new_user() from public;
revoke execute on function public.validate_moment_write() from public;
revoke execute on function public.validate_reaction_write() from public;
revoke execute on function public.validate_photo_vote_write() from public;
revoke execute on function public.hide_moment_after_reports() from public;
revoke execute on function public.is_group_member(uuid, uuid) from public;
revoke execute on function public.has_block_between(uuid, uuid) from public;
revoke execute on function public.close_round(uuid) from public;
revoke execute on function public.join_group_by_invite(text) from public;
revoke execute on function public.get_weekly_leaderboard(uuid, date) from public;

grant execute on function public.close_round(uuid) to authenticated;
grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.get_weekly_leaderboard(uuid, date) to authenticated;
