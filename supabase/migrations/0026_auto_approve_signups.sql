-- Turns off the manual-approval gate ahead of the App Store launch. Manual
-- review (added in 0017 for an invite-only rollout) doesn't scale past a
-- handful of signups a day, and the real security layers — Turnstile
-- captcha on signup, automated content moderation, and post rate-limiting
-- — don't depend on it at all. New signups now start 'approved' instead of
-- 'pending', so they pass straight through PendingApprovalScreen's check in
-- layout.tsx without ever seeing it.
--
-- Deliberately NOT dropping the approval_status column, its check
-- constraint, PendingApprovalScreen, or the dashboard's approve/reject
-- action — 'rejected' is still a real, working ban lever: flipping a user
-- to it via the dashboard immediately locks them out on their next request,
-- same mechanism as before, just used reactively post-signup instead of as
-- a front gate.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, approval_status)
  values (new.id, 'approved')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
