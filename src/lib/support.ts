"use client";
import { sb, api } from "./supabase";
import type { DailyLog } from "./data";

export type SupportState = "self_esteem" | "sad" | "irritated" | "tired" | "happy" | "him_low";

export function supportStateFor(log: DailyLog | null, role: "her" | "him"): SupportState | null {
  if (!log) return null;
  if (role === "him") return log.mood <= 2 ? "him_low" : null;
  if (log.self_esteem_low) return "self_esteem";
  if (log.mood <= 2) return "sad";
  if (log.symptoms.some((s) => ["irritacao", "ansiedade"].includes(s))) return "irritated";
  if ((log.energy != null && log.energy <= 2) || log.symptoms.some((s) => ["colica", "dor_cabeca", "dor_lombar", "cansaco", "insonia"].includes(s))) return "tired";
  if (log.mood >= 4) return "happy";
  return null;
}

/** Mensagem curta do banco, sem repetir na mesma semana. */
export async function pickSupportMessage(userId: string, state: string, today: string): Promise<string | null> {
  const db = sb();
  const weekAgo = new Date(new Date(today + "T12:00:00Z").getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const [{ data: msgs }, { data: shown }] = await Promise.all([
    db.from("support_messages").select("id, text").eq("state", state),
    db.from("support_shown").select("message_id").gte("shown_on", weekAgo),
  ]);
  if (!msgs?.length) return null;
  const used = new Set((shown ?? []).map((s) => s.message_id));
  const pool = msgs.filter((m) => !used.has(m.id));
  const m = (pool.length ? pool : msgs)[Math.floor(Math.random() * (pool.length || msgs.length))];
  await db.from("support_shown").upsert({ user_id: userId, message_id: m.id, shown_on: today }, { onConflict: "user_id,message_id,shown_on", ignoreDuplicates: true });
  return m.text;
}

export async function sendRequest(coupleId: string, from: string, to: string, type: string, custom?: string) {
  const { data, error } = await sb()
    .from("requests")
    .insert({ couple_id: coupleId, from_user: from, to_user: to, type, custom_text: custom ?? null })
    .select("id")
    .single();
  if (error) throw error;
  api("/api/notify", { kind: "request", id: data.id }).catch(() => {});
  return data.id as string;
}

export async function sendTouch(coupleId: string, from: string, to: string, kind: string) {
  const { data, error } = await sb().from("touches").insert({ couple_id: coupleId, from_user: from, to_user: to, kind }).select("id").single();
  if (error) throw error;
  api("/api/notify", { kind: "touch", id: data.id }).catch(() => {});
}
