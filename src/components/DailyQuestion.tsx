"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn } from "@/lib/dates";

type Q = { id: number; text: string; options: string[] };

/** Pergunta do dia: a resposta do outro só aparece depois que você responde (garantido no RLS). */
export function DailyQuestion() {
  const { me, partner } = useApp();
  const today = todayIn(me?.timezone);
  const [q, setQ] = useState<Q | null>(null);
  const [answers, setAnswers] = useState<{ user_id: string; option: string }[]>([]);

  const load = useCallback(async () => {
    const { count } = await sb().from("daily_questions").select("id", { count: "exact", head: true });
    if (!count) return;
    const dayNum = Math.floor(new Date(today + "T12:00:00Z").getTime() / 86400000);
    const { data } = await sb().from("daily_questions").select("*").order("id").range(dayNum % count, dayNum % count);
    setQ((data?.[0] as Q) ?? null);
    const a = await sb().from("question_answers").select("user_id, option").eq("date", today);
    setAnswers(a.data ?? []);
  }, [today]);
  useEffect(() => { load(); }, [load]);
  if (!me || !q) return null;

  const mine = answers.find((a) => a.user_id === me.user_id);
  const theirs = answers.find((a) => a.user_id !== me.user_id);
  async function answer(option: string) {
    await sb().from("question_answers").insert({ question_id: q!.id, couple_id: me!.couple_id, user_id: me!.user_id, date: today, option });
    load();
  }
  return (
    <section className="card p-4">
      <p className="label">Pergunta do dia</p>
      <p className="mt-1 text-lg font-bold">{q.text}</p>
      {!mine ? (
        <div className="mt-3 flex flex-wrap gap-2">{q.options.map((o) => <button key={o} className="chip" onClick={() => answer(o)}>{o}</button>)}</div>
      ) : (
        <div className="mt-3 text-sm">
          <p>Você: <b>{mine.option}</b></p>
          <p>{partner?.name || "Seu amor"}: {theirs ? <b>{theirs.option}</b> : <span className="text-[var(--muted)]">ainda não respondeu</span>}</p>
        </div>
      )}
    </section>
  );
}
