-- Stores each signed-in user's APNs device token so the push webhook (see
-- 0031_push_notification_webhook.sql) knows where to send. token is unique
-- so re-registering the same device (app reinstall, token refresh) upserts
-- in place rather than accumulating stale duplicates; a token can only ever
-- belong to one user at a time, which also self-heals the case where a
-- device is later signed into a different account.
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy "users can manage their own device tokens"
  on public.device_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
