import { adminClient, json } from "@/lib/server/admin";

// Cadastro público fica DESLIGADO no Supabase. Contas só nascem aqui:
//  - mode "create": e-mail precisa estar em ELO_CREATOR_EMAILS (quem cria o casal)
//  - mode "join": precisa de um convite válido e de um casal com vaga
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const mode = body?.mode;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido" }, 400);
  if (password.length < 8) return json({ error: "A senha precisa de pelo menos 8 caracteres" }, 400);

  const db = adminClient();
  if (mode === "create") {
    const allowed = (process.env.ELO_CREATOR_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(email)) return json({ error: "Este e-mail não está autorizado a criar um casal. Peça um convite." }, 403);
  } else if (mode === "join") {
    const code = String(body?.code ?? "");
    const { data: couple } = await db.from("couples").select("id").eq("invite_code", code).maybeSingle();
    if (!couple) return json({ error: "Convite inválido" }, 400);
    const { count } = await db.from("profiles").select("user_id", { count: "exact", head: true }).eq("couple_id", couple.id);
    if ((count ?? 0) >= 2) return json({ error: "Esse convite já foi usado" }, 400);
  } else {
    return json({ error: "Modo inválido" }, 400);
  }

  const { error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return json({ error: exists ? "Já existe uma conta com esse e-mail. Use Entrar." : "Não deu para criar a conta agora." }, exists ? 409 : 500);
  }
  return json({ ok: true });
}
