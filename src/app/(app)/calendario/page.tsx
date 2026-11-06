"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn, fmtDay } from "@/lib/dates";
import { addDays, diffDays, personalPattern, predict, radar, PHASES, type CycleRow } from "@/lib/cycle";
import { myCycles, myLogs, partnerCycles, partnerLogs, moodValue } from "@/lib/data";
import { Face } from "@/components/Face";
import { Header, Section, Toast } from "@/components/ui";
import { useToast } from "@/components/useToast";

type Cyc = CycleRow & { id?: string };

export default function Calendario() {
  const { me, partner } = useApp();
  const today = todayIn(me?.timezone);
  const isHer = me?.role === "her";
  const [cycles, setCycles] = useState<Cyc[]>([]);
  const [moods, setMoods] = useState<Record<string, number>>({});
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sel, setSel] = useState<string | null>(null);
  const [mirror, setMirror] = useState(false);
  const toast = useToast();
  const contraception = isHer ? me!.contraception : partner?.contraception ?? null;
  const avg = isHer ? me!.avg_cycle_length : partner?.avg_cycle_length ?? 28;

  const load = useCallback(async () => {
    if (!me) return;
    const since = addDays(today, -400);
    if (isHer) {
      const [c, l] = await Promise.all([myCycles(), myLogs(since)]);
      setCycles(c);
      setMoods(Object.fromEntries(l.map((x) => [x.date, x.mood])));
    } else if (partner) {
      const [c, l] = await Promise.all([partnerCycles(), partnerLogs(since)]);
      setCycles(c);
      setMoods(Object.fromEntries(l.map((x) => [x.date, moodValue(x)]).filter(([, v]) => v != null)));
    }
  }, [me, partner, isHer, today]);
  useEffect(() => { load(); }, [load]);

  const pred = useMemo(() => (contraception ? predict(cycles, contraception, avg, today) : null), [cycles, contraception, avg, today]);
  const pattern = useMemo(
    () => personalPattern(Object.entries(moods).map(([date, mood]) => ({ date, mood })), cycles),
    [moods, cycles],
  );

  if (!me) return null;
  const herLabel = isHer ? "Seu ciclo" : `Ciclo de ${partner?.name || "ela"}`;

  if (!isHer && (!partner || partner.role !== "her" || !partner.contraception)) {
    return (
      <main>
        <Header title="Calendário" />
        <p className="card mx-6 p-5 text-[var(--muted)]">{partner?.is_paused ? "Ela pausou o compartilhamento por agora." : "O ciclo dela não está compartilhado. Tudo bem: o check-in do dia continua sendo o melhor guia."}</p>
      </main>
    );
  }

  async function started(date: string) {
    const { error } = await sb().from("cycles").upsert({ user_id: me!.user_id, start_date: date }, { onConflict: "user_id,start_date" });
    toast.show(error ? "Não deu pra salvar" : "Anotado: desceu");
    setSel(null);
    load();
  }
  async function ended(date: string) {
    const cur = [...cycles].reverse().find((c) => c.start_date <= date);
    if (!cur?.id) { toast.show("Marque primeiro quando desceu"); return; }
    await sb().from("cycles").update({ end_date: date }).eq("id", cur.id);
    toast.show("Anotado: acabou");
    setSel(null);
    load();
  }
  async function removeCycle(id: string) {
    await sb().from("cycles").delete().eq("id", id);
    setSel(null);
    load();
  }

  // grade do mês
  const first = month + "-01";
  const startWd = new Date(first + "T12:00:00Z").getUTCDay();
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(startWd).fill(null), ...Array.from({ length: daysInMonth }, (_, k) => addDays(first, k))];
  const isPeriod = (d: string) =>
    cycles.some((c) => d >= c.start_date && d <= (c.end_date ?? addDays(c.start_date, c.start_date === pred?.currentStart && !c.end_date ? Math.min(diffDays(today, c.start_date), 6) : 4)));
  const isPredicted = (d: string) => pred && contraception !== "hormonal_pill" && d >= pred.nextRange[0] && d <= pred.nextRange[1];
  const shiftMonth = (n: number) => {
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const selCycle = sel ? cycles.find((c) => c.start_date === sel) : undefined;
  const goodDays = pred ? Object.entries(moods).filter(([d, m]) => d >= pred.currentStart && m >= 4).length : 0;

  return (
    <main className="flex flex-col gap-4">
      <Header title="Calendário" />
      <div className="flex flex-col gap-5 px-6">
        {pred && (
          <Section title={herLabel}>
            <p className="text-lg"><b>Dia {pred.day}</b> · {PHASES[pred.phase].label}</p>
            <p className="text-sm text-[var(--muted)]">{PHASES[pred.phase].trend}</p>
            {contraception === "hormonal_pill" ? (
              <p className="mt-2 text-sm">Com pílula não há fase ovulatória. O check-in do dia é o melhor guia.</p>
            ) : (
              <p className="mt-2 text-sm">
                Próxima menstruação: {pred.irregular ? "entre " : ""}<b>{fmtDay(pred.nextRange[0])}</b> e <b>{fmtDay(pred.nextRange[1])}</b>
                {pred.irregular && " (ciclo irregular, previsão mais solta)"}
                {pred.ovulation && <><br />Ovulação estimada: {fmtDay(pred.ovulation)}</>}
              </p>
            )}
            {pred.late && <p className="mt-2 text-sm text-[var(--muted)]">Passou da faixa prevista. Ciclos variam; se te preocupar, vale falar com a ginecologista.</p>}
            {pattern && <p className="mt-2 inner rounded-2xl bg-[var(--chip)] p-3 text-sm">Nos últimos ciclos, os dias {pattern.from}-{pattern.to} foram os mais difíceis.</p>}
            {isHer && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="btn" onClick={() => started(today)} data-testid="period-start">Desceu</button>
                <button className="btn btn-soft" onClick={() => ended(today)}>Acabou</button>
              </div>
            )}
          </Section>
        )}
        {!pred && isHer && (
          <Section title="Seu ciclo">
            <p className="text-sm text-[var(--muted)]">Toque em “Desceu” no dia em que começar. O resto o Elo calcula.</p>
            <button className="btn mt-3 w-full" onClick={() => started(today)}>Desceu hoje</button>
          </Section>
        )}

        {!isHer && pred && contraception && (
          <Section title="Radar de 7 dias">
            <ul className="flex flex-col gap-2">
              {radar(pred, contraception, today).map((r) => (
                <li key={r.date} className="flex items-start justify-between gap-2 inner rounded-2xl bg-[var(--chip)] p-3 text-sm">
                  <span className="font-bold">{fmtDay(r.date, { weekday: "short", day: "numeric" })}</span>
                  <span className="flex-1 text-right">{PHASES[r.phase].label}{r.note ? ` · ${r.note}` : ""}<br /><span className="text-[var(--muted)]">{PHASES[r.phase].tips[0]}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--muted)]">Tendências gerais. O check-in dela hoje sempre vale mais.</p>
          </Section>
        )}

        <Section title={new Date(first + "T12:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}
          action={<div className="flex gap-1"><button className="chip min-h-[36px]" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">‹</button><button className="chip min-h-[36px]" onClick={() => shiftMonth(1)} aria-label="Próximo mês">›</button></div>}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted)]">{["D", "S", "T", "Q", "Q", "S", "S"].map((d, k) => <span key={k}>{d}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, k) =>
              d ? (
                <button key={d} disabled={!isHer} onClick={() => setSel(d)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm ${d === today ? "ring-2 ring-[var(--accent)]" : ""}`}
                  style={{ background: isPeriod(d) ? "var(--blush)" : isPredicted(d) ? "repeating-linear-gradient(45deg,var(--chip),var(--chip) 4px,transparent 4px,transparent 8px)" : "transparent" }}>
                  {moods[d] ? <Face mood={moods[d]} size={22} /> : <span>{Number(d.slice(8))}</span>}
                </button>
              ) : <span key={k} />,
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">rosa: menstruação · listrado: previsão</p>
          {isHer && sel && (
            <div className="mt-3 flex flex-col gap-2 inner rounded-2xl bg-[var(--chip)] p-3">
              <p className="font-bold">{fmtDay(sel, { weekday: "long", day: "numeric", month: "long" })}</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn min-h-[44px]" onClick={() => started(sel)}>Desceu neste dia</button>
                <button className="btn btn-soft min-h-[44px]" onClick={() => ended(sel)}>Acabou neste dia</button>
              </div>
              {selCycle?.id && <button className="text-sm underline" onClick={() => removeCycle(selCycle.id!)}>Apagar este início</button>}
            </div>
          )}
        </Section>

        {isHer && pred && (
          <Section title="Espelho do ciclo" action={<button className="chip min-h-[36px] text-sm" aria-pressed={mirror} onClick={() => setMirror((m) => !m)}>{mirror ? "esconder" : "mostrar"}</button>}>
            {mirror ? (
              <p>Neste ciclo você teve <b>{goodDays} {goodDays === 1 ? "dia bom" : "dias bons"}</b>.{pattern ? ` Seu padrão: os dias ${pattern.from}-${pattern.to} costumam pesar mais.` : " Depois de 3 ciclos, o Elo mostra seu padrão pessoal."}</p>
            ) : <p className="text-sm text-[var(--muted)]">Opcional, só para você.</p>}
          </Section>
        )}
        <p className="pb-2 text-center text-xs text-[var(--muted)]">O Elo não é dispositivo médico nem método contraceptivo.</p>
      </div>
      <Toast text={toast.text} />
    </main>
  );
}
