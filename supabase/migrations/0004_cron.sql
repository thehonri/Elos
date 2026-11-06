-- Agenda: pg_cron + pg_net chamam a rota de lembretes a cada 5 min.
-- O segredo NÃO fica no git: scripts/setup-cron.sh grava em vault com o nome 'elo_cron_secret'.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$ begin
  perform cron.unschedule('elo-reminders');
exception when others then null; end $$;

select cron.schedule(
  'elo-reminders',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'elo_cron_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'elo_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
