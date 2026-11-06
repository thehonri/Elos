"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import type { Share } from "@/lib/app-context";

const ROWS = {
  share_phase: { label: "Fase atual e previsão", opts: [{ v: true, l: "compartilhar" }, { v: false, l: "ocultar" }] },
  share_mood: { label: "Humor e energia", opts: [{ v: "full", l: "completo" }, { v: "simple", l: "só bem / mais ou menos / difícil" }, { v: "off", l: "ocultar" }] },
  share_symptoms: { label: "Sintomas", opts: [{ v: "category", l: "só a categoria" }, { v: "detailed", l: "detalhado" }, { v: "off", l: "ocultar" }] },
} as const;

export function ShareSettingsForm({ userId, onSaved, confirmLabel = "Salvar", confirmOnSave = false }: { userId: string; onSaved?: () => void; confirmLabel?: string; confirmOnSave?: boolean }) {
  const [s, setS] = useState<Share | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    sb().from("share_settings").select("*").eq("user_id", userId).single().then(({ data }) => setS(data as Share));
  }, [userId]);
  if (!s) return null;
  async function save() {
    setBusy(true);
    await sb()
      .from("share_settings")
      .update({ share_phase: s!.share_phase, share_mood: s!.share_mood, share_symptoms: s!.share_symptoms, ...(confirmOnSave ? { confirmed_at: new Date().toISOString() } : {}) })
      .eq("user_id", userId);
    setBusy(false);
    onSaved?.();
  }
  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(ROWS) as (keyof typeof ROWS)[]).map((k) => (
        <div key={k} className="card p-4">
          <p className="mb-2 font-bold">{ROWS[k].label}</p>
          <div className="flex flex-wrap gap-2">
            {ROWS[k].opts.map((o) => (
              <button key={String(o.v)} type="button" className="chip" aria-pressed={s[k] === o.v} onClick={() => setS({ ...s, [k]: o.v } as Share)}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="card p-4 text-sm text-[var(--muted)]">
        <p><b>Pedidos</b>: sempre compartilhados (são feitos pra ele ver).</p>
        <p className="mt-1"><b>Notas privadas</b>: nunca saem do seu celular para ele.</p>
        <p className="mt-1"><b>Atividade sexual e sangramento detalhado</b>: o Elo não coleta.</p>
      </div>
      <button className="btn w-full" disabled={busy} onClick={save}>{confirmLabel}</button>
    </div>
  );
}
