"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn } from "@/lib/dates";
import { Header, Section } from "@/components/ui";
import { VaultCard, type VaultItem } from "@/components/VaultCard";

export default function Retro() {
  const { me, partner } = useApp();
  const today = todayIn(me?.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState<{ myGood: number; theirGood: number; touches: number; care: number; moment: VaultItem | null } | null>(null);

  useEffect(() => {
    if (!me) return;
    const from = month + "-01";
    const d = new Date(from + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + 1);
    const to = d.toISOString().slice(0, 10);
    (async () => {
      const [mine, theirs, touches, care, vault] = await Promise.all([
        sb().from("daily_logs").select("mood").gte("date", from).lt("date", to),
        sb().from("partner_view_daily").select("mood, mood_simple").gte("date", from).lt("date", to),
        sb().from("touches").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to),
        sb().from("care_actions").select("id", { count: "exact", head: true }).gte("date", from).lt("date", to),
        sb().from("vault_items").select("*").neq("kind", "message").gte("created_at", from).lt("created_at", to).limit(30),
      ]);
      const v = (vault.data as VaultItem[]) ?? [];
      setData({
        myGood: (mine.data ?? []).filter((x) => x.mood >= 4).length,
        theirGood: (theirs.data ?? []).filter((x) => (x.mood ?? 0) >= 4 || x.mood_simple === "bem").length,
        touches: touches.count ?? 0,
        care: care.count ?? 0,
        moment: v.length ? v[Math.floor(Math.random() * v.length)] : null,
      });
    })();
  }, [me, month]);

  const label = new Date(month + "-01T12:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const shift = (n: number) => { const d = new Date(month + "-01T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); };

  return (
    <main className="flex flex-col gap-4">
      <Header title="Retrospectiva" back="/nos" />
      <div className="flex flex-col gap-5 px-6">
        <div className="flex items-center justify-between">
          <button className="chip" onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
          <p className="text-lg font-bold capitalize">{label}</p>
          <button className="chip" onClick={() => shift(1)} aria-label="Próximo mês">›</button>
        </div>
        {data && (
          <>
            <Section title="Dias bons">
              <p>Você: <b>{data.myGood}</b>{partner ? <> · {partner.name || "seu amor"}: <b>{data.theirGood}</b></> : null}</p>
            </Section>
            <Section title="Carinhos e cuidados">
              <p><b>{data.touches}</b> carinhos trocados e <b>{data.care}</b> cuidados anotados, entre vocês dois.</p>
            </Section>
            {data.moment && <Section title="Um momento do Cofre"><VaultCard item={data.moment} /></Section>}
            <p className="text-center text-xs text-[var(--muted)]">Sem placar. Só um jeito de lembrar o mês.</p>
          </>
        )}
      </div>
    </main>
  );
}
