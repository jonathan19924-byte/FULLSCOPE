-- Removes the plaintext webhook secret that 0019_signup_notification.sql
-- hardcoded directly into the trigger function (visible in git history).
-- That secret is being rotated alongside this migration since the old
-- value must be treated as compromised. Going forward both webhook
-- functions read their secret from Supabase Vault instead — store it once
-- via the Supabase SQL editor, never committed:
--   select vault.create_secret('<value>', 'signup_webhook_secret');
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  webhook_secret text;
begin
  insert into public.profiles (user_id, approval_status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'signup_webhook_secret';

  perform net.http_post(
    url := 'https://fullscope-eight.vercel.app/api/webhooks/new-signup',
    body := jsonb_build_object('email', new.email, 'userId', new.id::text),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    )
  );

  return new;
end;
$$;
