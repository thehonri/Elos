import { adminClient, json, requireUser } from "@/lib/server/admin";
import { pushTo } from "@/lib/server/push";
import { requestLabel, touchLabel } from "@/lib/content";

// O cliente avisa que criou algo; o servidor confere que foi mesmo ele e manda o push pro outro.
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return json({ error: "Não autenticado" }, 401);
  const { kind, id } = (await req.json().catch(() => ({}))) as { kind?: string; id?: string };
  if (!kind || !id) return json({ error: "Pedido inválido" }, 400);
  const db = adminClient();
  const { data: me } = await db.from("profiles").select("name, role").eq("user_id", user.id).single();
  if (!me) return json({ error: "Sem perfil" }, 403);
  const name = me.name || (me.role === "her" ? "Ela" : "Ele");

  if (kind === "request") {
    const { data: r } = await db.from("requests").select("*").eq("id", id).eq("from_user", user.id).single();
    if (!r) return json({ error: "Não encontrado" }, 404);
    const body = r.type === "espaco" ? `Hoje ${me.role === "her" ? "ela" : "ele"} pediu espaço.` : requestLabel(r.type, me.role, r.custom_text);
    return json({ sent: await pushTo(r.to_user, { title: r.type === "espaco" ? "Elo" : `${name} pediu`, body, url: "/pedidos", tag: "req-" + r.id }) });
  }
  if (kind === "request_done") {
    const { data: r } = await db.from("requests").select("*").eq("id", id).eq("to_user", user.id).single();
    if (!r) return json({ error: "Não encontrado" }, 404);
    return json({ sent: await pushTo(r.from_user, { title: "Feito", body: `${name} fez: ${requestLabel(r.type, me.role === "her" ? "him" : "her", r.custom_text)}`, url: "/pedidos" }) });
  }
  if (kind === "touch") {
    const { data: t } = await db.from("touches").select("*").eq("id", id).eq("from_user", user.id).single();
    if (!t) return json({ error: "Não encontrado" }, 404);
    return json({ sent: await pushTo(t.to_user, { title: name, body: touchLabel(t.kind), url: "/nos", tag: "touch" }) });
  }
  if (kind === "care") {
    const { data: c } = await db.from("care_actions").select("*").eq("id", id).eq("by_user", user.id).single();
    if (!c) return json({ error: "Não encontrado" }, 404);
    return json({ sent: await pushTo(c.for_user, { title: `${name} fez algo por você`, body: c.description, url: "/nos" }) });
  }
  return json({ error: "Tipo inválido" }, 400);
}
