"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn } from "@/lib/dates";
import { addDays } from "@/lib/cycle";
import { MOOD_LABEL, SYMPTOMS, WANTS } from "@/lib/content";
import { Face } from "@/components/Face";
import { Chips, toggle } from "@/components/ui";
import type { DailyLog } from "@/lib/data";

export default function Checkin() {
  const router = useRouter();
  const { me } = useApp();
  const today = todayIn(me?.timezone);
  const [step, setStep] = useState<1 | 2>(1);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [wants, setWants] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selfLow, setSelfLow] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [yesterday, setYesterday] = useState<DailyLog | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    sb().from("daily_logs").select("*").eq("user_id", me.user_id).eq("date", addDays(today, -1)).maybeSingle().then(({ data }) => setYesterday(data as DailyLog | null));
    sb().from("daily_logs").select("*").eq("user_id", me.user_id).eq("date", today).maybeSingle().then(({ data }) => {
      if (!data) return;
      setEnergy(data.energy); setWants(data.wants ?? []); setSymptoms(data.symptoms ?? []); setSelfLow(!!data.self_esteem_low); setNote(data.private_note ?? "");
    });
  }, [me, today]);

  if (!me) return null;

  async function pickMood(m: number) {
    setMood(m);
    setBusy(true);
    await sb().from("daily_logs").upsert({ user_id: me!.user_id, date: today, mood: m }, { onConflict: "user_id,date" });
    setBusy(false);
    setStep(2);
  }

  async function sameAsYesterday() {
    if (!yesterday) return;
    setBusy(true);
    await sb().from("daily_logs").upsert(
      { user_id: me!.user_id, date: today, mood: yesterday.mood, energy: yesterday.energy, wants: yesterday.wants, symptoms: yesterday.symptoms, self_esteem_low: yesterday.self_esteem_low },
      { onConflict: "user_id,date" },
    );
    router.replace("/apoio");
  }

  async function saveDetails() {
    setBusy(true);
    await sb()
      .from("daily_logs")
      .update({ energy, wants, symptoms, self_esteem_low: me!.role === "her" ? selfLow : false, private_note: note.trim() || null })
      .eq("user_id", me!.user_id)
      .eq("date", today);
    router.replace("/apoio");
  }

  if (step === 1) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col px-5">
        <div className="flex items-center justify-between">
          <button className="h-11 px-1 text-[var(--muted)]" onClick={() => router.replace("/nos")}>fechar</button>
        </div>
        <h1 className="mt-4 text-center text-3xl font-extrabold">Como você está?</h1>
        <div className="flex flex-1 flex-col justify-center gap-3" role="group" aria-label="Escolha um rosto">
          {[5, 4, 3, 2, 1].map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => pickMood(m)}
              className="tap-pop card flex items-center gap-4 px-5 py-3 text-left text-xl font-bold"
              aria-label={`${m} - ${MOOD_LABEL[m]}`}
              data-testid={`face-${m}`}
            >
              <Face mood={m} size={60} />
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
        {yesterday && (
          <button className="btn btn-soft mb-4 w-full" disabled={busy} onClick={sameAsYesterday} data-testid="same-as-yesterday">
            Igual ontem
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col gap-5 px-5 pb-6">
      <div className="flex items-center gap-3 pt-2">
        {mood && <Face mood={mood} size={44} />}
        <p className="font-bold">Salvo. Quer contar mais?</p>
      </div>
      <button className="btn btn-soft w-full text-lg" onClick={() => router.replace("/apoio")} data-testid="skip">Pular</button>

      <section>
        <p className="label mb-2">Energia</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((e) => (
            <button key={e} className="chip flex-1 justify-center" aria-pressed={energy === e} onClick={() => setEnergy(energy === e ? null : e)}>{e}</button>
          ))}
        </div>
      </section>
      <section>
        <p className="label mb-2">Hoje eu quero</p>
        <Chips options={WANTS} value={wants} onToggle={(id) => setWants((w) => toggle(w, id))} />
      </section>
      {me.role === "her" && (
        <section>
          <button className="chip" aria-pressed={selfLow} onClick={() => setSelfLow((v) => !v)}>me sentindo mal comigo</button>
        </section>
      )}
      <section>
        <p className="label mb-2">Sintomas (opcional)</p>
        <Chips options={SYMPTOMS} value={symptoms} onToggle={(id) => setSymptoms((s) => toggle(s, id))} />
      </section>
      <section>
        {!showNote ? (
          <button className="text-sm text-[var(--muted)] underline" onClick={() => setShowNote(true)}>escrever algo</button>
        ) : (
          <>
            <label className="label" htmlFor="note">Só pra você (nunca é compartilhado)</label>
            <textarea id="note" className="input mt-1" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </>
        )}
      </section>
      <button className="btn mt-auto w-full" disabled={busy} onClick={saveDetails} data-testid="save-details">Salvar</button>
    </main>
  );
}
