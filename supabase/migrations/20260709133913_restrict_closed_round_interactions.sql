drop policy if exists reactions_delete_own on public.reactions;
create policy reactions_delete_own
on public.reactions for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.rounds r
    where r.id = reactions.round_id
      and r.status = 'active'
      and r.closes_at > now()
  )
);

drop policy if exists photo_votes_delete_own on public.photo_votes;
create policy photo_votes_delete_own
on public.photo_votes for delete
to authenticated
using (
  voter_id = (select auth.uid())
  and exists (
    select 1
    from public.rounds r
    where r.id = photo_votes.round_id
      and r.status = 'active'
      and r.closes_at > now()
  )
);
