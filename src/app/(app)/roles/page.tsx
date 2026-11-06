"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn, weekStart } from "@/lib/dates";
import { Header, Section } from "@/components/ui";

type Outing = { id: string; title: string; details: string | null };

export default function Roles() {
  const { me } = useApp();
  const week = weekStart(todayIn(me?.timezone));
  const [outings, setOutings] = useState<Outing[]>([]);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [matches, setMatches] = useState<Outing[]>([]);

  const load = useCallback(async () => {
    const [o, s, m] = await Promise.all([
      sb().from("outings").select("id, title, details").eq("week", week).order("created_at"),
      sb().from("outing_swipes").select("outing_id, yes"),
      sb().from("outing_matches").select("id, title, details").eq("week", week),
    ]);
    setOutings(o.data ?? []);
    setMine(Object.fromEntries((s.data ?? []).map((x) => [x.outing_id, x.yes])));
    setMatches(m.data ?? []);
  }, [week]);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  async function swipe(o: Outing, yes: boolean) {
    await sb().from("outing_swipes").upsert({ outing_id: o.id, user_id: me!.user_id, yes }, { onConflict: "outing_id,user_id" });
    load();
  }
  const pending = outings.filter((o) => !(o.id in mine));
  const current = pending[0];

  return (
    <main className="flex flex-col gap-4">
      <Header title="Match de rolês" back="/nos" />
      <div className="flex flex-col gap-5 px-6">
        {!outings.length && <p className="card p-5 text-[var(--muted)]">Na quinta à noite chegam de 6 a 10 ideias pro fim de semana. Cada um decide sozinho; só o que os dois aprovarem vira plano.</p>}
        {current && (
          <div className="float-in card p-6 text-center" key={current.id}>
            <p className="label">{outings.length - pending.length + 1} de {outings.length}</p>
            <p className="mt-2 text-2xl font-extrabold">{current.title}</p>
            {current.details && <p className="mt-1 text-[var(--muted)]">{current.details}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="btn btn-soft" onClick={() => swipe(current, false)}>Não</button>
              <button className="btn" onClick={() => swipe(current, true)}>Sim</button>
            </div>
          </div>
        )}
        {outings.length > 0 && !current && <p className="card p-5 text-center">Você já respondeu tudo. Os matches aparecem quando os dois responderem.</p>}
        <Section title="Matches da semana">
          {matches.length ? <ul className="list-disc pl-5">{matches.map((m) => <li key={m.id}>{m.title}</li>)}</ul> : <p className="text-sm text-[var(--muted)]">Ainda nenhum.</p>}
        </Section>
      </div>
    </main>
  );
}
