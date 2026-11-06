# Elo — Entrega

## URL de produção
**https://elo-eta-pied.vercel.app**

## Instalar no iPhone e ativar notificações (os dois)
1. Abra a URL no **Safari** (precisa ser o Safari).
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.
3. Abra o **Elo pelo ícone novo** e entre com e-mail e senha.
4. Vá em **Ajustes → Notificações → Ativar** e aceite. Depois toque em **Enviar teste**: deve chegar uma notificação.
5. Requisito: iOS 16.4 ou mais novo. No Safari comum o iPhone não deixa ativar push; só no app instalado.

## Criar o casal e mandar o convite
1. Emanuel abre o app → **Criar o casal (primeira vez)** → nome, "ele", e-mail `ehds2001@gmail.com` e uma senha.
   (Só os e-mails em `ELO_CREATOR_EMAILS` podem criar casal; o cadastro público está fechado.)
2. No onboarding aparece o **link de convite** → **Mandar o convite** (WhatsApp, iMessage…).
3. Ela abre o link, cria a conta, responde ciclo e método e vê a **tela de compartilhamento antes** de qualquer dado dela chegar até você.
4. Os dois cadastram os gatos, ativam notificações e tocam em 10 itens de contexto.

## Atalho do iPhone e as duas automações
Passo a passo completo dentro do app em **Ajustes → Atalho do iPhone → como montar** (`/atalho`). Resumo:
1. Ajustes → **Gerar token pessoal** → copiar (aparece uma vez só; dá para revogar).
2. App Atalhos → novo atalho "Check-in Elo": **Escolher do Menu** (5 rostos) → **Texto** com o número → **Obter Conteúdo do URL**:
   - URL `https://elo-eta-pied.vercel.app/api/checkin/quick`, método **POST**
   - Cabeçalho `Authorization: Bearer SEU_TOKEN`
   - Corpo JSON: `mood` = Resultado do Menu
3. Automação 1: Horário do Dia **8:30**, segunda a sexta → Executar Atalho.
4. Automação 2: **11:00**, sábado e domingo → Executar Atalho.
5. Widget: Tela de Início → Editar → Adicionar Widget → Atalhos → Check-in Elo.

## Casal demo (dados fictícios, separados dos seus)
| Quem | E-mail | Senha |
|---|---|---|
| Ela | `demo-ela@elo.test` | `demo-elo-2026` |
| Ele | `demo-ele@elo.test` | `demo-elo-2026` |

3 ciclos completos + atual, ~95 dias de check-ins (com padrão pessoal nos dias 24-27), 20 itens de contexto, 2 gatos (Mingau e Paçoca) e itens no Cofre. Para recriar do zero: `npx tsx scripts/seed-demo.ts`.

## Variáveis de ambiente
| Nome | Onde | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | chave pública (RLS protege tudo) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (secreta) + `.env.local` | rotas do servidor (cadastro, push, cron, atalho, apagar conta) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel + `.env.local` | Web Push |
| `VAPID_PRIVATE_KEY` | Vercel (secreta) + `.env.local` | Web Push |
| `VAPID_SUBJECT` | Vercel + `.env.local` | contato do remetente do push |
| `CRON_SECRET` | Vercel (secreta) + `.env.local` + Vault do Supabase | protege `/api/cron/reminders` |
| `ELO_CREATOR_EMAILS` | Vercel + `.env.local` | quem pode criar um casal |

Nada disso está no git. O cron (pg_cron + pg_net, a cada 5 min) lê URL e segredo do **Vault** do Supabase (`elo_cron_url`, `elo_cron_secret`); para refazer: `scripts/setup-cron.sh https://elo-eta-pied.vercel.app`.

## Portões
1. **RLS** (`npm run test:rls`): 50/50 com usuários reais — parceiro não lê `private_note`, nada com compartilhamento desligado/pausado/não confirmado, ninguém edita o do outro, casais isolados, anônimo sem acesso, Storage por casal, pergunta do dia e match de rolês.
2. **typecheck, lint e build**: sem erros.
3. **Playwright 390×844** (`npm run test:e2e`): 8/8 — convite e entrada dela, check-in em 2 toques, "igual ontem", pedido chegando ao outro, carinho com animação, pausar compartilhamento, atalho com token válido/inválido/revogado.
4. **Produção**: login, manifest (standalone), service worker (escopo `/`), cron (200 via pg_net) e envio de push pelo servidor (`sent: 1`) verificados. Falta só o recebimento num iPhone real (ver BLOQUEIOS).

## O que ficou em BLOQUEIOS.md
- Testar o push no iPhone (servidor já verificado).
- SMTP próprio (opcional; hoje o "Esqueci a senha" é limitado a 2 e-mails/hora).
- Ligar deploy automático Vercel ↔ GitHub (opcional).
- Renomear o projeto Supabase "Agael" para "elo" (cosmético).

## 3 próximos passos sugeridos (v1)
1. **IA para escrever os cards** de sugestão e apoio com mais naturalidade, mantendo o motor de regras como base (o porquê continua explicável).
2. **Google Places + TMDB**: rolês com lugares reais perto de casa (respeitando raio e orçamento) e filmes/séries com capa e onde assistir.
3. **Clima**: tag "chuva" automática no motor (sofá e filme em dia de chuva, parque em dia de sol).
