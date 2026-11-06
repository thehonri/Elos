"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn } from "@/lib/dates";
import { myLog, myLogs, myCycles, type DailyLog } from "@/lib/data";
import { CARE_TIPS, PARTNER_TIP } from "@/lib/content";
import { heavyDaysInCycle, predict, PHASES } from "@/lib/cycle";
import { pickSupportMessage, sendRequest, supportStateFor, type SupportState } from "@/lib/support";
import { VaultCard, type VaultItem } from "@/components/VaultCard";
import { Breathing } from "@/components/Breathing";
import { useToast } from "@/components/useToast";
import { Toast } from "@/components/ui";

export default function Apoio() {
  const router = useRouter();
  const { me, partner } = useApp();
  const today = todayIn(me?.timezone);
  const [log, setLog] = useState<DailyLog | null | undefined>(undefined);
  const [state, setState] = useState<SupportState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultItem[]>([]);
  const [context, setContext] = useState<string | null>(null);
  const [safety, setSafety] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!me) return;
    (async () => {
      const l = await myLog(today);
      setLog(l);
      const st = supportStateFor(l, me.role);
      if (!st) { router.replace("/nos"); return; }
      setState(st);
      setMsg(await pickSupportMessage(me.user_id, st, today));
      if (["self_esteem", "sad", "him_low"].includes(st)) {
        const items: VaultItem[] = [];
        const a = await sb().rpc("vault_pick");
        if (a.data?.[0]) items.push(a.data[0]);
        if (st === "self_esteem") {
          const b = await sb().from("vault_items").select("*").eq("author", me.user_id).in("kind", ["moment", "photo", "compliment"]).limit(20);
          const pick = (b.data ?? []).filter((x) => x.id !== items[0]?.id);
          if (pick.length) items.push(pick[Math.floor(Math.random() * pick.length)]);
        }
        setVault(items);
      }
      if (me.role === "her") {
        const cycles = await myCycles();
        const p = predict(cycles, me.contraception, me.avg_cycle_length, today);
        if (p && p.phaseWeight > 0 && ["lutea_final", "menstrual"].includes(p.phase) && (st === "sad" || st === "irritated" || st === "tired")) {
          setContext(`Você está no dia ${p.day} do ciclo (${PHASES[p.phase].label.toLowerCase()}). Se pesar, lembra: não é você, é o padrão dos últimos ciclos.`);
        }
        // rede de segurança: 10+ dias difíceis no ciclo, ou padrão pesado em 2 ciclos seguidos; 1x por ciclo
        if (p && (st === "sad" || st === "self_esteem")) {
          const logs = await myLogs(cycles.length >= 2 ? cycles[cycles.length - 2].start_date : p.currentStart);
          const cur = heavyDaysInCycle(logs, p.currentStart);
          const prev = cycles.length >= 2 ? heavyDaysInCycle(logs, cycles[cycles.length - 2].start_date, p.currentStart) : 0;
          if (cur >= 10 || (cur >= 7 && prev >= 7)) {
            const shown = await sb().from("safety_net_shown").select("cycle_start").eq("cycle_start", p.currentStart).maybeSingle();
            if (!shown.data) {
              setSafety(true);
              await sb().from("safety_net_shown").insert({ user_id: me.user_id, cycle_start: p.currentStart });
            }
          }
        }
      }
    })();
  }, [me, today, router]);

  if (!me || log === undefined || !state) return <main className="p-8 text-center text-[var(--muted)]">…</main>;

  async function ask(type: string, label: string) {
    if (!partner) { toast.show("Seu amor ainda não entrou no Elo"); return; }
    await sendRequest(me!.couple_id, me!.user_id, partner.user_id, type);
    setSent(label);
  }
  async function saveMoment() {
    await sb().from("vault_items").insert({ couple_id: me!.couple_id, author: me!.user_id, kind: "moment", content: `Um dia ${log?.mood === 5 ? "muito bom" : "bom"}: ${new Date(today + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" })}` });
    toast.show("Guardado no Cofre");
  }

  const tip = CARE_TIPS[state];
  return (
    <main className="safe-top flex flex-col gap-4 px-5 pb-8">
      <div className="float-in card p-5">
        <p className="text-xl font-bold leading-snug">{msg ?? "Obrigado por contar como você está."}</p>
        {context && <p className="mt-3 text-sm text-[var(--muted)]">{context}</p>}
      </div>

      {(state === "sad" || state === "irritated") && (
        <div className="card p-5">
          {!breathing ? (
            <button className="btn btn-soft w-full" onClick={() => setBreathing(true)}>{state === "sad" ? "Respirar junto por 1 minuto" : "Exercício de 60 segundos"}</button>
          ) : (
            <Breathing seconds={60} onDone={() => setBreathing(false)} />
          )}
        </div>
      )}

      {state === "sad" && (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn" onClick={() => ask("companhia", "quero companhia")}>Quero companhia</button>
          <button className="btn btn-soft" onClick={() => ask("quieto", "quero ficar quieta")}>Quero ficar quieta</button>
        </div>
      )}
      {state === "irritated" && (
        <button className="btn w-full" onClick={() => ask("espaco", "preciso de espaço")}>Avisar que preciso de espaço</button>
      )}
      {sent && <p role="status" className="text-center text-sm text-[var(--muted)]">Pronto. {partner?.name || "Seu amor"} recebeu: “{sent}”.</p>}

      {vault.map((v) => <VaultCard key={v.id} item={v} />)}

      {tip && (
        <div className="card p-5">
          <p className="font-bold">{tip.title}</p>
          <ul className="mt-2 list-disc pl-5 text-[var(--muted)]">{tip.items.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      {state === "happy" && <button className="btn w-full" onClick={saveMoment}>Guardar este momento no Cofre</button>}

      {state === "him_low" && partner && (
        <p className="card p-4 text-sm text-[var(--muted)]">Se quiser, peça algo pra {partner.name || "ela"} na aba Pedidos. Um carinho pequeno dela também chega aqui.</p>
      )}

      {safety && (
        <div className="card border-[var(--accent)] p-5">
          <p className="font-bold">Um cuidado com você</p>
          <p className="mt-2 text-sm leading-relaxed">
            Notamos muitos dias difíceis neste ciclo. Pode valer conversar com sua ginecologista. Existe o TDPM (transtorno disfórico pré-menstrual), que é tratável. O Elo não diagnostica nada; é só um convite para se cuidar.
          </p>
        </div>
      )}

      <Link href="/nos" className="btn btn-ghost w-full">Ir para Nós</Link>
      <p className="text-center text-xs text-[var(--muted)]">{partner ? `O que ${partner.name || "seu amor"} recebe: ${PARTNER_TIP[state]}` : ""}</p>
      <Toast text={toast.text} />
    </main>
  );
}
