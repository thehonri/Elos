#!/usr/bin/env bash
# Grava URL e segredo do cron no Vault do Supabase e agenda o job. Uso: scripts/setup-cron.sh https://sua-url.vercel.app
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${1:?url de produção}/api/cron/reminders"
SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)
scripts/sql.sh "
do \$\$ begin
  perform vault.update_secret((select id from vault.secrets where name='elo_cron_secret'), '$SECRET');
  if not found or (select count(*) from vault.secrets where name='elo_cron_secret') = 0 then
    perform vault.create_secret('$SECRET', 'elo_cron_secret');
  end if;
exception when others then
  perform vault.create_secret('$SECRET', 'elo_cron_secret');
end \$\$;
delete from vault.secrets where name='elo_cron_url';
select vault.create_secret('$URL', 'elo_cron_url');
" >/dev/null
scripts/sql.sh -f supabase/migrations/0004_cron.sql
