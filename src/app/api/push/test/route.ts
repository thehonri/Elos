import { json, requireUser } from "@/lib/server/admin";
import { pushTo } from "@/lib/server/push";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return json({ error: "Não autenticado" }, 401);
  const sent = await pushTo(user.id, { title: "Elo", body: "Push de teste: está tudo funcionando.", url: "/checkin" });
  return json({ sent });
}
