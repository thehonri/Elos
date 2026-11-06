import { adminClient, json, requireUser } from "@/lib/server/admin";

// Apaga a conta e tudo o que é da pessoa (cascata no banco). Se o casal ficar vazio, apaga o casal e as fotos.
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return json({ error: "Não autenticado" }, 401);
  const db = adminClient();
  const { data: p } = await db.from("profiles").select("couple_id").eq("user_id", user.id).maybeSingle();
  // fotos que a pessoa subiu
  const { data: own } = await db.from("vault_items").select("storage_path").eq("author", user.id).not("storage_path", "is", null);
  const paths = (own ?? []).map((x) => x.storage_path as string);
  if (paths.length) await db.storage.from("elo").remove(paths);

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Não deu para apagar agora" }, 500);

  if (p?.couple_id) {
    const { count } = await db.from("profiles").select("user_id", { count: "exact", head: true }).eq("couple_id", p.couple_id);
    if (!count) {
      const { data: files } = await db.storage.from("elo").list(p.couple_id, { limit: 1000 });
      const all: string[] = [];
      for (const f of files ?? []) {
        if (f.id) all.push(`${p.couple_id}/${f.name}`);
        else {
          const { data: sub } = await db.storage.from("elo").list(`${p.couple_id}/${f.name}`, { limit: 1000 });
          for (const s of sub ?? []) all.push(`${p.couple_id}/${f.name}/${s.name}`);
        }
      }
      if (all.length) await db.storage.from("elo").remove(all);
      await db.from("couples").delete().eq("id", p.couple_id);
    }
  }
  return json({ ok: true });
}
