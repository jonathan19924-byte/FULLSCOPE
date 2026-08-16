-- Fires a push notification the moment a row lands in `notifications` —
-- same pg_net-webhook-on-insert shape as 0019_signup_notification.sql, just
-- targeting a different route. Keeping this as a DB trigger (rather than
-- calling the webhook from every like/comment/follow/credit action) means
-- push stays wired to the single place notifications are actually created
-- (create-notification.ts's insert), not duplicated across call sites.
--
-- The webhook secret is read from a Postgres setting (app.settings.push_webhook_secret)
-- rather than hardcoded here, so it never ends up in git history. Set it
-- once via the Supabase SQL editor (not saved to a migration file):
--   alter database postgres set app.settings.push_webhook_secret = '<value>';
create or replace function public.handle_new_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://fullscope-eight.vercel.app/api/webhooks/send-push',
    body := jsonb_build_object('notificationId', new.id::text),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.push_webhook_secret', true)
    )
  );

  return new;
end;
$$;

create trigger on_notification_created
  after insert on public.notifications
  for each row execute function public.handle_new_notification();
