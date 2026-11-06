# Bloqueios (o que só o Emanuel pode fazer)

1. **Testar o push no iPhone** — o servidor envia corretamente (verificado em produção: criptografia + VAPID + entrega = `sent: 1`), mas o recebimento só dá pra confirmar num iPhone real com o Elo instalado na Tela de Início. Passo: Ajustes → Notificações → **Ativar** → **Enviar teste**.

2. **SMTP próprio (recomendado, não obrigatório)** — o Supabase grátis manda no máximo **2 e-mails por hora** e não deixa trocar o texto do e-mail. Só afeta o "Esqueci a senha". Para resolver: crie conta grátis na Resend (resend.com), gere uma API key e cole em Supabase → Authentication → Emails → SMTP Settings (host `smtp.resend.com`, porta 465, usuário `resend`, senha = API key). Com SMTP configurado, dá para ativar login por código de 6 dígitos.

3. **Deploy automático a cada push (opcional)** — hoje o deploy é feito pela CLI. Para a Vercel publicar sozinha a cada commit: Vercel → projeto `elo` → Settings → Git → Connect → `thehonri/Elos` (precisa autorizar o app da Vercel no GitHub).

4. **Nome do projeto Supabase** — está usando o projeto **Agael** (região us-west-2). Se quiser, renomeie para "elo" em Supabase → Project Settings → General. Nada no código depende do nome.
