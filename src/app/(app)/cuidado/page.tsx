"use client";
import { useCallback, useEffect, useState } from "react";
import { sb, api } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn, fmtDay } from "@/lib/dates";
import { REACTIONS } from "@/lib/content";
import type { SuggestionCard } from "@/lib/suggest";
import { Header, Section, Toast } from "@/components/ui";
import { useToast } from "@/components/useToast";

type Care = { id: string; by_user: string; for_user: string; date: string; description: string; reaction: string | null };

export default function Cuidado() {
  const { me, partner } = useApp();
  const today = todayIn(me?.timezone);
  const [list, setList] = useState<Care[]>([]);
  const [options, setOptions] = useState<{ title: string; context_item_id?: string; household_id?: string }[]>([]);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!me) return;
    const [c, s, h] = await Promise.all([
      sb().from("care_actions").select("*").order("created_at", { ascending: false }).limit(40),
      sb().from("suggestions").select("items").eq("for_user", me.user_id).eq("date", today).limit(1),
      sb().from("household").select("id, task").order("created_at"),
    ]);
    setList((c.data as Care[]) ?? []);
    const sug = ((s.data?.[0]?.items as SuggestionCard[]) ?? []).map((x) => ({ title: x.title, context_item_id: x.context_item_id }));
    const tasks = (h.data ?? []).map((t) => ({ title: t.task, household_id: t.id }));
    setOptions([...sug, ...tasks]);
  }, [me, today]);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  async function add(o: { title: string; context_item_id?: string; household_id?: string }) {
    if (!partner) return;
    const { data } = await sb().from("care_actions").insert({ couple_id: me!.couple_id, by_user: me!.user_id, for_user: partner.user_id, date: today, description: o.title, context_item_id: o.context_item_id ?? null, household_id: o.household_id ?? null }).select("id").single();
    if (o.household_id) await sb().from("household").update({ last_done_at: new Date().toISOString(), last_done_by: me!.user_id }).eq("id", o.household_id);
    if (data) api("/api/notify", { kind: "care", id: data.id }).catch(() => {});
    toast.show("Anotado");
    load();
  }
  async function react(c: Care, reaction: string) {
    await sb().from("care_actions").update({ reaction }).eq("id", c.id);
    load();
  }

  return (
    <main className="flex flex-col gap-4">
      <Header title="Diário de cuidado" back="/nos" />
      <div className="flex flex-col gap-5 px-6">
        <Section title={`O que eu fiz por ${partner?.name || "você"} hoje`}>
          <div className="flex flex-wrap gap-2">{options.map((o, k) => <button key={k} className="chip tap-pop" onClick={() => add(o)}>{o.title}</button>)}</div>
        </Section>
        <ul className="flex flex-col gap-2">
          {list.map((c) => (
            <li key={c.id} className="card p-4">
              <p className="text-xs text-[var(--muted)]">{fmtDay(c.date)} · {c.by_user === me.user_id ? "você fez" : `${partner?.name || "seu amor"} fez por você`}</p>
              <p className="font-bold">{c.description}</p>
              {c.for_user === me.user_id && !c.reaction && (
                <div className="mt-2 flex flex-wrap gap-2">{REACTIONS.map((r) => <button key={r.id} className="chip min-h-[36px] text-sm" onClick={() => react(c, r.id)}>{r.label}</button>)}</div>
              )}
              {c.reaction && <p className="mt-1 text-sm text-[var(--muted)]">{REACTIONS.find((r) => r.id === c.reaction)?.label}</p>}
            </li>
          ))}
        </ul>
      </div>
      <Toast text={toast.text} />
    </main>
  );
}
