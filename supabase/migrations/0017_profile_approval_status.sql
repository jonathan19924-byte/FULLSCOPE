-- Gates new signups behind manual owner approval (invite-only rollout via
-- the separate FullScope_Dashboard admin tool). Existing users default to
-- 'approved' so nobody currently using the app gets locked out; only rows
-- created after this migration (via the signup trigger) start 'pending'.

alter table public.profiles
  add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('pending', 'approved', 'rejected'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, approval_status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
