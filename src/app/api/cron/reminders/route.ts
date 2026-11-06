import { timingSafeEqual } from "node:crypto";
import { adminClient, json } from "@/lib/server/admin";
import { pushTo } from "@/lib/server/push";
import { addDays } from "@/lib/cycle";
import { nowParts, weekStart } from "@/lib/dates";

// Chamado pelo pg_cron + pg_net a cada 5 min. Protegido por CRON_SECRET.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const WINDOW = 60; // se o cron atrasar, ainda manda dentro de 1h

const OUTING_FALLBACK = [
  "Piquenique no parque", "Cinema com pipoca grande", "Feira de rua no domingo", "Café da manhã fora",
  "Trilha leve", "Museu ou exposição", "Jantar num lugar novo", "Sorvete no fim da tarde", "Noite de jogos em casa", "Cozinhar algo juntos",
];

export async function POST(req: Request) {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  const db = adminClient();
  const now = new Date();
  const log: string[] = [];

  const { data: profiles } = await db.from("profiles").select("user_id, couple_id, role, name, timezone");
  const { data: rems } = await db.from("reminder_settings").select("*").eq("enabled", true);

  for (const p of profiles ?? []) {
    const local = nowParts(p.timezone, now);
    for (const r of (rems ?? []).filter((x) => x.user_id === p.user_id && x.weekday === local.weekday)) {
      const start = toMin(r.time);
      if (r.last_sent_on === local.date || local.minutes < start || local.minutes >= start + WINDOW) continue;
      await db.from("reminder_settings").update({ last_sent_on: local.date }).eq("user_id", p.user_id).eq("kind", r.kind).eq("weekday", r.weekday);
      if (r.kind === "checkin") {
        const { data: done } = await db.from("daily_logs").select("date").eq("user_id", p.user_id).eq("date", local.date).maybeSingle();
        if (!done) {
          await pushTo(p.user_id, { title: "Como você está hoje?", body: "Um toque e pronto.", url: "/checkin", tag: "checkin" });
          log.push(`checkin:${p.user_id}`);
        }
      } else {
        const since = addDays(local.date, -1);
        const [{ count: care }, { count: reqs }] = await Promise.all([
          db.from("care_actions").select("id", { count: "exact", head: true }).eq("for_user", p.user_id).is("reaction", null).gte("date", since),
          db.from("requests").select("id", { count: "exact", head: true }).eq("from_user", p.user_id).eq("status", "done").is("reaction", null).gte("done_at", since),
        ]);
        if ((care ?? 0) + (reqs ?? 0) > 0) {
          await pushTo(p.user_id, { title: "Fizeram algo por você hoje", body: "Que tal uma reação de um toque?", url: "/nos", tag: "reaction" });
          log.push(`reaction:${p.user_id}`);
        }
      }
    }
  }

  // por casal: saúde dos gatos e rolês de quinta
  const couples = new Map<string, { members: string[]; tz: string }>();
  type Pick = { couple_id: string; week: string; title: string; context_item_id: string | null; details: string | null };
  for (const p of profiles ?? []) {
    const c = couples.get(p.couple_id) ?? { members: [] as string[], tz: p.timezone };
    c.members.push(p.user_id);
    couples.set(p.couple_id, c);
  }
  for (const [coupleId, c] of couples) {
    const local = nowParts(c.tz, now);
    if (local.minutes >= 9 * 60) {
      const { data: pets } = await db.from("pets").select("*").eq("couple_id", coupleId);
      for (const pet of pets ?? []) {
        if (pet.last_alert_on === local.date) continue;
        const due = ([["vaccine_due", "vacina"], ["dewormer_due", "vermífugo"], ["flea_due", "antipulgas"]] as const)
          .filter(([k]) => pet[k] === local.date || pet[k] === addDays(local.date, 3))
          .map(([k, l]) => `${l} ${pet[k] === local.date ? "hoje" : "em 3 dias"}`);
        if (!due.length) continue;
        await db.from("pets").update({ last_alert_on: local.date }).eq("id", pet.id);
        for (const m of c.members) await pushTo(m, { title: pet.name, body: due.join(", "), url: "/contexto" });
        log.push(`pet:${pet.id}`);
      }
    }
    // quinta 19h+: 6-10 rolês para o fim de semana
    const week = weekStart(local.date);
    if (local.weekday === 4 && local.minutes >= 19 * 60 && c.members.length === 2) {
      const { data: couple } = await db.from("couples").select("outings_week").eq("id", coupleId).single();
      if (couple?.outings_week !== week) {
        const { data: items } = await db.from("context_items").select("id, title, category, cost_level").eq("couple_id", coupleId).in("category", ["restaurante", "lugar", "filme", "comida"]);
        const picks = [...(items ?? [])].sort(() => Math.random() - 0.5).slice(0, 7).map((i): Pick => ({ couple_id: coupleId, week, title: i.title, context_item_id: i.id, details: i.category === "filme" ? "em casa" : null }));
        for (const f of OUTING_FALLBACK.sort(() => Math.random() - 0.5)) {
          if (picks.length >= 8) break;
          if (!picks.some((x) => x.title === f)) picks.push({ couple_id: coupleId, week, title: f, context_item_id: null, details: null });
        }
        await db.from("outings").upsert(picks, { onConflict: "couple_id,week,title", ignoreDuplicates: true });
        await db.from("couples").update({ outings_week: week }).eq("id", coupleId);
        for (const m of c.members) await pushTo(m, { title: "Rolês do fim de semana", body: "Diga sim ou não. Só o que os dois quiserem vira plano.", url: "/roles" });
        log.push(`outings:${coupleId}`);
      }
    }
  }

  return json({ ok: true, at: now.toISOString(), sent: log });
}
