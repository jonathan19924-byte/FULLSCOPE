-- Lets the dashboard's new Content Reports view mark a report as handled
-- without deleting it (keeps the row as an audit trail, same pattern as
-- profiles.approval_status). Reports are still never surfaced to the
-- reporting user or the reported party — this only changes what the owner
-- sees on the dashboard.
alter table public.content_reports add column if not exists status text not null default 'open'
  check (status in ('open', 'dismissed'));
