-- page_views was insert-only (0018) — written by every page view for the
-- dashboard's analytics, but nothing in the main app could ever read it
-- back. This adds a narrow read policy scoped to a user's own rows, so the
-- story page can look up "when did I last view this story" to highlight
-- which story_updates entries are new since then. Still no access to
-- anyone else's rows, and the dashboard's service-role client (which
-- bypasses RLS) is unaffected either way.
create policy "users can read their own page views"
  on public.page_views for select
  to authenticated
  using (auth.uid() = user_id);
