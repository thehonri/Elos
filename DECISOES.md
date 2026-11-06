# Decisões

Uma linha por decisão: decisão — motivo.

- Ambiente de execução: sessão na nuvem do Claude Code, repo `thehonri/Elos` — pedido do Emanuel em vez do PC local.
- Supabase: projeto existente **Agael** (`jorlmgssfbldvxoonhdi`, us-west-2), que estava vazio (0 tabelas, 0 usuários) — o token não tinha permissão de criar projeto e o Emanuel autorizou usar o Agael. Custo: ~150 ms a mais de latência vs sa-east-1.
- Login por **código de 6 dígitos (OTP) por e-mail**, não magic link — no iPhone o link abre no Safari, cujo armazenamento é separado do PWA instalado; a sessão não chegaria ao app.
- Login por senha também habilitado (escondido) — necessário para o casal demo e para testes automatizados.
- Leitura do parceiro por views `security definer` (`partner_view_daily`, `partner_view_cycles`, `partner_profile`) donas do `postgres`, com filtro explícito por `auth.uid()`, casal, `share_settings`, `paused_at` e `confirmed_at` — view `security_invoker` voltaria vazia, pois o RLS de `daily_logs` só deixa o dono ler.
- Ciclo do parceiro numa view separada `partner_view_cycles` (não dentro de `partner_view_daily`) — ciclo e diário têm granularidades diferentes; ambas aplicam as mesmas regras.
- `share_settings.confirmed_at`: nada dela chega a ele enquanto ela não confirma a tela de compartilhamento — impõe no banco a regra do onboarding. Para ele, já nasce confirmado.
- Mapeamento de sintoma → categoria feito no banco (`symptom_category`) — o modo "só categoria" não pode depender da tela.
- Humor "simple": 1-2 = difícil, 3 = mais ou menos, 4-5 = bem (`mood_simple`).
- Mensagens antecipadas do Cofre ficam invisíveis para quem recebe até serem entregues por `vault_pick()` num dia ruim — senão perdem a surpresa.
- `reminder_settings` ganhou a coluna `kind` (checkin | reaction) — o lembrete de reação das 21h precisa de horários próprios; vem desligado no fim de semana.
- Tabelas extras: `support_shown` (não repetir mensagem na semana), `safety_net_shown` (rede de segurança 1x por ciclo), `household.last_done_*` — necessárias para regras do produto.
- Colunas extras em `requests`: `done_at`, `reaction` — "todo gesto ganha reação", pedidos também.
- Edição restrita por grants de coluna (ex.: parceiro só muda `status/done_at/reaction` de um pedido) — RLS por linha sozinha não impede reescrever o conteúdo.
- Pets e tarefas da casa são objetos compartilhados do casal (os dois editam) — a casa é dos dois; registros pessoais seguem intocáveis.
- Pasta de Storage `elo/<couple_id>/...` privada, com política por casal.
- SQL aplicado via Management API (`scripts/sql.sh`) em vez de `supabase db push` — não exige senha do banco nem conexão 5432.
- `iud_hormonal` NÃO é tratado como "sem ovulação"; só `hormonal_pill` usa cartela ativa/pausa — DIU hormonal frequentemente mantém a ovulação.
- App majoritariamente client-side (supabase-js com sessão em localStorage) e rotas de API para push, cron, atalho, exclusão de conta — sessão persistente no PWA e menos atrito com cache do Next 16.
