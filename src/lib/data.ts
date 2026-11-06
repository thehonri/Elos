"use client";
// Leituras comuns no cliente (sempre via RLS / views de privacidade).
import { sb } from "./supabase";
import type { CycleRow } from "./cycle";

export type DailyLog = {
  user_id: string;
  date: string;
  mood: number;
  energy: number | null;
  wants: string[];
  symptoms: string[];
  self_esteem_low: boolean;
  private_note?: string | null;
};
export type PartnerDaily = {
  user_id: string;
  date: string;
  mood: number | null;
  mood_simple: string | null;
  energy: number | null;
  wants: string[] | null;
  symptoms: string[] | null;
  self_esteem_low: boolean | null;
};

export async function myLog(date: string) {
  const { data } = await sb().from("daily_logs").select("*").eq("date", date).maybeSingle();
  return data as DailyLog | null;
}
export async function myLogs(since: string) {
  const { data } = await sb().from("daily_logs").select("*").gte("date", since).order("date");
  return (data ?? []) as DailyLog[];
}
export async function partnerLog(date: string) {
  const { data } = await sb().from("partner_view_daily").select("*").eq("date", date).maybeSingle();
  return data as PartnerDaily | null;
}
export async function partnerLogs(since: string) {
  const { data } = await sb().from("partner_view_daily").select("*").gte("date", since).order("date");
  return (data ?? []) as PartnerDaily[];
}
export async function myCycles() {
  const { data } = await sb().from("cycles").select("id, start_date, end_date, length_days").order("start_date");
  return (data ?? []) as (CycleRow & { id: string })[];
}
export async function partnerCycles() {
  const { data } = await sb().from("partner_view_cycles").select("start_date, end_date, length_days").order("start_date");
  return (data ?? []) as CycleRow[];
}
/** valor de humor comparável (1-5) a partir do que o parceiro compartilha */
export function moodValue(p: PartnerDaily | null): number | null {
  if (!p) return null;
  if (p.mood != null) return p.mood;
  if (p.mood_simple === "dificil") return 2;
  if (p.mood_simple === "mais_ou_menos") return 3;
  if (p.mood_simple === "bem") return 4;
  return null;
}
