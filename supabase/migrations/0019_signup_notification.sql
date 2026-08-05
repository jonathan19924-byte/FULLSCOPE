-- Emails the owner the moment someone signs up, so approving new accounts
-- doesn't require periodically checking the dashboard. Extends the same
-- handle_new_user() trigger that already creates the 'pending' profile row
-- (see 0017_profile_approval_status.sql), so this fires for every signup
-- path (web, native) without duplicating logic per path.
--
-- If this migration fails on `create extension pg_net`, enable it manually
-- via the Supabase dashboard: Database -> Extensions -> pg_net, then re-run
-- just the `create or replace function` statement below.

create extension if not exists pg_net;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, approval_status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;

  perform net.http_post(
    url := 'https://fullscope-eight.vercel.app/api/webhooks/new-signup',
    body := jsonb_build_object('email', new.email, 'userId', new.id::text),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 520f5c3ea7151a204b76883ebb799f86919b65ada9c26e71146ea7e24bf794d6'
    )
  );

  return new;
end;
$$;
