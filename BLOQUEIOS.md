# Bloqueios (o que só o Emanuel pode fazer)

- **E-mail do Supabase limitado a 2 por hora** (SMTP padrão). Para o login por código ser confiável, configure um SMTP próprio: crie conta grátis na Resend (resend.com), gere uma API key e cole em Supabase → Authentication → Emails → SMTP Settings (host `smtp.resend.com`, porta 465, usuário `resend`, senha = API key). Sem isso, se os dois entrarem e errarem o código algumas vezes na mesma hora, o próximo e-mail só sai na hora seguinte.
