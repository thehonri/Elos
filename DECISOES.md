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
- **Login por e-mail + senha** como caminho principal (não OTP) — o plano grátis do Supabase não permite editar o modelo de e-mail sem SMTP próprio, e o e-mail padrão só manda link (que abre no Safari, fora do PWA). Senha é digitada uma vez, dentro do app, e a sessão persiste.
- **Cadastro público desligado** no Supabase; contas só nascem em `/api/signup`: quem cria o casal precisa estar em `ELO_CREATOR_EMAILS`, quem entra precisa de convite válido com vaga — evita que qualquer pessoa crie conta (a confirmação automática de e-mail foi recusada por segurança).
- "Esqueci a senha" usa o e-mail padrão do Supabase (link abre no Safari, cria a senha nova lá e volta pro app) — funciona sem SMTP, só limitado a 2 e-mails/hora.
- `@serwist/turbopack` (rota `/serwist/sw.js`) em vez de `@serwist/next` — o Next 16 builda com Turbopack; o plugin webpack não roda. `cacheComponents` desligado porque a integração do Serwist exige.
- Regras `react-hooks/set-state-in-effect` e `preserve-manual-memoization` desligadas no ESLint — padrão de busca assíncrona ao Supabase dentro de efeito; o setState acontece depois do await.
- Sugestões são calculadas no aparelho de quem vai agir (a partir da view do parceiro) e guardadas em `suggestions` com `inputs_snapshot`; só recalcula quando o estado do outro muda — RLS impede gravar sugestões em nome do outro.
- Push é disparado pelo cliente via `/api/notify`, e o servidor confere no banco que a pessoa é mesmo a autora antes de enviar — mais simples que webhooks do banco e sem abrir brecha.
- Cron: URL e segredo guardados no **Vault do Supabase** (`elo_cron_url`, `elo_cron_secret`), nunca no git; janela de 60 min para lembretes caso o cron atrase; `last_sent_on` garante 1 por dia.
- Rolês (Etapa B) gerados quinta ≥19h a partir do banco de contexto + ideias genéricas (8 por semana); match = view `outing_matches` (2 "sim"). Swipe do outro é invisível (RLS).
- Pergunta do dia: escolhida por `dia % 60`, igual para os dois; a resposta do outro só aparece via RLS depois que você responde.
- Rede de segurança: 10+ dias com rosto 1-2 no ciclo atual, ou 7+ no atual e 7+ no anterior ("padrão pesado repetido"); registrada em `safety_net_shown` (1x por ciclo).
- Atalho do iPhone: token `elo_<48 hex>` gerado no aparelho, só o SHA-256 vai ao banco.
- Casal demo e testes rodam no mesmo projeto Supabase (só existe um), com e-mails `@elo.test`; testes apagam o que criam.
- Vercel: projeto `elo`, deploy por CLI (sem integração Git ainda). Proteção de deploy padrão vale só para URLs de preview; produção é pública.
- **Visual (pedido do Emanuel)**: estilo Apple, fofo e limpo. Cor da marca = cor da logo `#40D1B2`; fundos em verde-água bebê (`#F3FBF8`, `#DDF6EF`); secundárias bebê (pêssego, lavanda, manteiga, céu, rosa) como fundo de cartões. Texto sobre a cor da logo é verde-petróleo `#0E4D42`, porque branco teria contraste ~1,9:1 (ilegível).
- Fonte `ui-rounded` (SF Pro Rounded no iPhone), com Nunito como reserva em outros aparelhos.
- Ícones do app gerados a partir da logo enviada (fundo removido em `public/brand/logo.png`, ícones com fundo branco).
