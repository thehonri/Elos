import { createHash } from "node:crypto";
import { adminClient, json } from "@/lib/server/admin";
import { todayIn } from "@/lib/dates";

// Atalho do iPhone: POST {"mood": 1-5} com Authorization: Bearer <token pessoal>.
export async function POST(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("elo_")) return json({ error: "Token inválido" }, 401);
  const body = await req.json().catch(() => null);
  const mood = Number(body?.mood);
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) return json({ error: "mood precisa ser 1 a 5" }, 400);

  const db = adminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: tok } = await db.from("checkin_tokens").select("user_id, revoked_at").eq("token_hash", hash).maybeSingle();
  if (!tok || tok.revoked_at) return json({ error: "Token inválido" }, 401);
  const { data: p } = await db.from("profiles").select("timezone").eq("user_id", tok.user_id).single();
  const date = todayIn(p?.timezone ?? "America/Sao_Paulo");
  const { error } = await db.from("daily_logs").upsert({ user_id: tok.user_id, date, mood }, { onConflict: "user_id,date" });
  if (error) return json({ error: "Não deu para salvar" }, 500);
  return json({ ok: true, date, mood });
}
