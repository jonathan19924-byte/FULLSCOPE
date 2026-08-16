-- Removes the plaintext webhook secret that 0019_signup_notification.sql
-- hardcoded directly into the trigger function (visible in git history).
-- That secret is being rotated alongside this migration since the old
-- value must be treated as compromised. Going forward both webhook
-- functions read their secret from a Postgres setting instead — set once
-- via the Supabase SQL editor, never committed:
--   alter database postgres set app.settings.signup_webhook_secret = '<value>';
--   alter database postgres set app.settings.push_webhook_secret = '<value>';
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
      'Authorization', 'Bearer ' || current_setting('app.settings.signup_webhook_secret', true)
    )
  );

  return new;
end;
$$;
