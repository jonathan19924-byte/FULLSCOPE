-- 0032_secure_webhook_secrets.sql accidentally reintroduced the manual-
-- approval gate that 0026_auto_approve_signups.sql had already turned off —
-- it rewrote handle_new_user() by copying 0019's old body (pending status +
-- signup webhook) without accounting for 0026's later change. This restores
-- 0026's version exactly: new signups go straight to 'approved' again, no
-- webhook call.
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
