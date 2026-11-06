"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { enablePush, isIOS, isStandalone } from "@/lib/push-client";
import { STARTER_CONTEXT, CONTRACEPTION_LABEL } from "@/lib/content";
import { todayIn } from "@/lib/dates";
import { Cats } from "@/components/Cats";
import { ShareSettingsForm } from "@/components/ShareSettingsForm";
import { InviteBox } from "@/components/InviteBox";

type Step = "install" | "invite" | "cycle" | "share" | "cats" | "push" | "context";

export default function Onboarding() {
  const router = useRouter();
  const { ready, session, me, share, pets, refresh } = useApp();
  const steps: Step[] = useMemo(
    () => (me?.role === "her" ? ["install", "cycle", "share", "cats", "push", "context"] : ["install", "invite", "cats", "push", "context"]),
    [me?.role],
  );
  const [i, setI] = useState(0);
  const step = steps[i];

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/entrar");
    else if (!me) router.replace("/entrar");
    else if (me.onboarded_at) router.replace("/nos");
  }, [ready, session, me, router]);

  if (!me) return null;
  const next = () => setI((x) => Math.min(x + 1, steps.length - 1));
  async function finish() {
    await sb().from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("user_id", me!.user_id);
    await refresh();
    router.replace("/nos");
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10">
      <div className="mb-4 flex gap-1.5" aria-label={`Passo ${i + 1} de ${steps.length}`}>
        {steps.map((s, k) => (
          <span key={s} className="h-1.5 flex-1 rounded-full" style={{ background: k <= i ? "var(--accent)" : "var(--line)" }} />
        ))}
      </div>
      {step === "install" && <InstallStep onNext={next} />}
      {step === "invite" && <InviteStep onNext={next} />}
      {step === "cycle" && <CycleStep userId={me.user_id} onNext={next} />}
      {step === "share" && share && <ShareStep userId={me.user_id} onNext={async () => { await refresh(); next(); }} />}
      {step === "cats" && <CatsStep coupleId={me.couple_id} existing={pets.map((p) => p.name)} onNext={async () => { await refresh(); next(); }} />}
      {step === "push" && <PushStep userId={me.user_id} onNext={next} />}
      {step === "context" && <ContextStep coupleId={me.couple_id} userId={me.user_id} role={me.role} onDone={finish} />}
    </main>
  );
}

function InstallStep({ onNext }: { onNext: () => void }) {
  const [standalone, setStandalone] = useState(true);
  useEffect(() => setStandalone(isStandalone()), []);
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-extrabold">Coloque o Elo na Tela de Início</h1>
      <p className="mt-2 text-[var(--muted)]">É assim que ele vira um app de verdade e consegue te avisar das coisas.</p>
      <ol className="card mt-5 flex flex-col gap-3 p-5 text-lg">
        <li><b>1.</b> No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta pra cima).</li>
        <li><b>2.</b> Role e toque em <b>Adicionar à Tela de Início</b>.</li>
        <li><b>3.</b> Abra o Elo pelo ícone novo e entre com seu e-mail e senha.</li>
      </ol>
      {standalone && <p className="mt-4 rounded-2xl bg-[var(--chip)] p-3 text-center font-semibold">Pronto, você já está no app instalado.</p>}
      {!standalone && !isIOS() && <p className="mt-4 text-sm text-[var(--muted)]">Fora do iPhone, use “Instalar app” no menu do navegador.</p>}
      <div className="mt-auto pt-6">
        <button className="btn w-full" onClick={onNext}>{standalone ? "Continuar" : "Já instalei / fazer depois"}</button>
      </div>
    </div>
  );
}

function InviteStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-extrabold">Chame seu amor</h1>
      <p className="mt-2 text-[var(--muted)]">Mande o link. Ela cria a conta e escolhe o que compartilha antes de qualquer dado dela chegar até você.</p>
      <div className="mt-5"><InviteBox /></div>
      <div className="mt-auto pt-6"><button className="btn w-full" onClick={onNext}>Continuar</button></div>
    </div>
  );
}

function CycleStep({ userId, onNext }: { userId: string; onNext: () => void }) {
  const [last, setLast] = useState("");
  const [len, setLen] = useState(28);
  const [method, setMethod] = useState("none");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    await sb().from("profiles").update({ avg_cycle_length: len, contraception: method }).eq("user_id", userId);
    if (last) await sb().from("cycles").upsert({ user_id: userId, start_date: last }, { onConflict: "user_id,start_date" });
    setBusy(false);
    onNext();
  }
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Seu ciclo, do seu jeito</h1>
      <p className="text-[var(--muted)]">Isso só deixa as sugestões mais certeiras. No próximo passo você decide o que ele pode ver. Nada sai antes disso.</p>
      <label className="label" htmlFor="last">Quando começou a última menstruação?</label>
      <input id="last" className="input" type="date" max={todayIn()} value={last} onChange={(e) => setLast(e.target.value)} />
      <label className="label" htmlFor="len">Duração média do ciclo: <b>{len} dias</b></label>
      <input id="len" type="range" min={21} max={40} value={len} onChange={(e) => setLen(Number(e.target.value))} className="accent-[var(--accent)]" />
      <span className="label">Método contraceptivo</span>
      <div className="flex flex-wrap gap-2">
        {Object.entries(CONTRACEPTION_LABEL).map(([id, label]) => (
          <button key={id} type="button" className="chip" aria-pressed={method === id} onClick={() => setMethod(id)}>{label}</button>
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">O Elo não é dispositivo médico nem método contraceptivo.</p>
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button className="btn w-full" disabled={busy} onClick={save}>Continuar</button>
        <button className="btn btn-ghost w-full" onClick={onNext}>Pular por enquanto</button>
      </div>
    </div>
  );
}

function ShareStep({ userId, onNext }: { userId: string; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold">O que ele pode ver</h1>
      <p className="text-[var(--muted)]">Estes são os padrões. Mude o que quiser. Você pode pausar tudo a qualquer momento, sem dar motivo.</p>
      <ShareSettingsForm userId={userId} confirmLabel="Está bom assim" onSaved={onNext} confirmOnSave />
    </div>
  );
}

function CatsStep({ coupleId, existing, onNext }: { coupleId: string; existing: string[]; onNext: () => void }) {
  const [names, setNames] = useState<string[]>(existing.length ? existing : ["", ""]);
  const [files, setFiles] = useState<(File | null)[]>([null, null]);
  const [busy, setBusy] = useState(false);
  if (existing.length >= 2) {
    return (
      <div className="flex flex-1 flex-col">
        <h1 className="text-3xl font-extrabold">{existing.join(" e ")} já estão aqui</h1>
        <div className="my-6"><Cats mood="playing" names={[existing[0], existing[1]]} /></div>
        <div className="mt-auto"><button className="btn w-full" onClick={onNext}>Continuar</button></div>
      </div>
    );
  }
  async function save() {
    setBusy(true);
    for (let k = 0; k < 2; k++) {
      const n = names[k]?.trim();
      if (!n) continue;
      let photo_path: string | null = null;
      const f = files[k];
      if (f) {
        photo_path = `${coupleId}/pets/${crypto.randomUUID()}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
        const up = await sb().storage.from("elo").upload(photo_path, f, { contentType: f.type });
        if (up.error) photo_path = null;
      }
      await sb().from("pets").insert({ couple_id: coupleId, name: n, photo_path });
    }
    setBusy(false);
    onNext();
  }
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold">E os gatos?</h1>
      <Cats mood="idle" />
      {[0, 1].map((k) => (
        <div key={k} className="card flex flex-col gap-2 p-4">
          <label className="label" htmlFor={`cat${k}`}>Nome do {k === 0 ? "primeiro" : "segundo"} gato</label>
          <input id={`cat${k}`} className="input" value={names[k] ?? ""} onChange={(e) => setNames((a) => a.map((x, j) => (j === k ? e.target.value : x)))} />
          <label className="text-sm text-[var(--muted)]">
            Foto (opcional)
            <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(e) => setFiles((a) => a.map((x, j) => (j === k ? e.target.files?.[0] ?? null : x)))} />
          </label>
        </div>
      ))}
      <div className="mt-auto flex flex-col gap-2">
        <button className="btn w-full" disabled={busy} onClick={save}>Continuar</button>
        <button className="btn btn-ghost w-full" onClick={onNext}>Pular</button>
      </div>
    </div>
  );
}

function PushStep({ userId, onNext }: { userId: string; onNext: () => void }) {
  const [res, setRes] = useState<string | null>(null);
  async function on() {
    const r = await enablePush(userId);
    setRes(
      r === "ok" ? "Notificações ligadas." :
      r === "needs_install" ? "No iPhone, as notificações só funcionam com o Elo aberto pela Tela de Início. Ative depois em Ajustes." :
      r === "denied" ? "Tudo bem. Dá pra ligar depois em Ajustes do iPhone → Notificações → Elo." :
      "Este navegador não aceita notificações. Tudo bem, o resto funciona.",
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Avisos com carinho</h1>
      <p className="text-[var(--muted)]">Lembrete de check-in (8h30 nos dias úteis, 11h no fim de semana), pedidos e carinhos do seu amor. Dá pra mudar os horários depois.</p>
      <button className="btn w-full" onClick={on}>Ativar notificações</button>
      {res && <p role="status" className="rounded-2xl bg-[var(--chip)] p-3 text-center">{res}</p>}
      <div className="mt-auto"><button className="btn btn-ghost w-full" onClick={onNext}>{res ? "Continuar" : "Agora não"}</button></div>
    </div>
  );
}

function ContextStep({ coupleId, userId, role, onDone }: { coupleId: string; userId: string; role: "her" | "him"; onDone: () => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const rows = picked.map((k) => ({ ...STARTER_CONTEXT[k], couple_id: coupleId, created_by: userId, preferred_by: role }));
    if (rows.length) await sb().from("context_items").insert(rows);
    setBusy(false);
    onDone();
  }
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Do que você gosta?</h1>
      <p className="text-[var(--muted)]">Toque em pelo menos 10. É isso que vira sugestão pro seu amor. <b>{picked.length}/10</b></p>
      <div className="flex flex-wrap gap-2">
        {STARTER_CONTEXT.map((c, k) => (
          <button key={c.title} className="chip" aria-pressed={picked.includes(k)} onClick={() => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}>
            {c.category === "irrita" ? `me irrita: ${c.title.toLowerCase()}` : c.title}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button className="btn w-full" disabled={busy} onClick={save}>{picked.length >= 10 ? "Pronto!" : "Continuar (dá pra completar depois)"}</button>
      </div>
    </div>
  );
}
