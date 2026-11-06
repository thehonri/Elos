-- Suporte ao cron de lembretes
alter table public.pets add column if not exists last_alert_on date;
alter table public.couples add column if not exists outings_week date;
create unique index if not exists outings_unique_title on public.outings(couple_id, week, title);
