-- Optional single place name a story is centered on (city/region/landmark
-- level), populated at generation time when genuinely relevant — most
-- stories (policy, elections, court rulings) aren't tied to one place and
-- leave this null. Powers a "view on map" button that links out to a
-- Google Maps search by name; no coordinates/geocoding needed.

alter table public.stories add column if not exists location_name text;
