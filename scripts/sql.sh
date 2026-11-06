#!/usr/bin/env bash
# Uso: scripts/sql.sh "select 1"   ou   scripts/sql.sh -f arquivo.sql
# Executa SQL no projeto via Supabase Management API (token injetado pelo proxy do ambiente).
set -euo pipefail
REF=${SUPABASE_REF:-$(cat "$(dirname "$0")/../.secrets/ref")}
if [ "$1" = "-f" ]; then Q=$(cat "$2"); else Q="$1"; fi
python3 -c 'import json,sys;print(json.dumps({"query":sys.stdin.read()}))' <<<"$Q" | \
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H 'Content-Type: application/json' --data @-
echo
