import "server-only";
import webpush from "web-push";
import { adminClient } from "./admin";

let configured = false;
function setup() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:elo@example.com", pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Envia para todas as inscrições do usuário; remove as expiradas. Retorna quantas aceitaram. */
export async function pushTo(userId: string, payload: PushPayload): Promise<number> {
  if (!setup()) return 0;
  const db = adminClient();
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", userId);
  let ok = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return ok;
}
