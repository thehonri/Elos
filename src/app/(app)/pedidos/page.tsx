"use client";
import { useCallback, useEffect, useState } from "react";
import { sb, api } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { quickRequests, requestLabel, REACTIONS, TOUCHES } from "@/lib/content";
import { sendRequest, sendTouch } from "@/lib/support";
import { Header, Section, Toast } from "@/components/ui";
import { useToast } from "@/components/useToast";
import { IconCheck } from "@/components/Icons";

type Req = { id: string; from_user: string; to_user: string; type: string; custom_text: string | null; status: string; reaction: string | null; created_at: string; done_at: string | null };

export default function Pedidos() {
  const { me, partner } = useApp();
  const [list, setList] = useState<Req[]>([]);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const { data } = await sb().from("requests").select("*").order("created_at", { ascending: false }).limit(40);
    setList((data as Req[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = sb().channel("pedidos").on("postgres_changes", { event: "*", schema: "public", table: "requests" }, load).subscribe();
    return () => { sb().removeChannel(ch); };
  }, [load]);

  if (!me) return null;
  const who = partner?.name || "seu amor";

  async function ask(type: string, text?: string) {
    if (!partner) { toast.show("Seu amor ainda não entrou no Elo"); return; }
    await sendRequest(me!.couple_id, me!.user_id, partner.user_id, type, text);
    toast.show(`Pedido enviado pra ${who}`);
    setCustom(""); setShowCustom(false);
    load();
  }
  async function done(r: Req) {
    await sb().from("requests").update({ status: "done", done_at: new Date().toISOString() }).eq("id", r.id);
    api("/api/notify", { kind: "request_done", id: r.id }).catch(() => {});
    load();
  }
  async function react(r: Req, reaction: string) {
    await sb().from("requests").update({ reaction }).eq("id", r.id);
    load();
  }
  async function touch(kind: string) {
    if (!partner) return;
    await sendTouch(me!.couple_id, me!.user_id, partner.user_id, kind);
    toast.show("Carinho enviado");
  }

  const open = list.filter((r) => r.status === "open");
  const done_ = list.filter((r) => r.status === "done").slice(0, 10);

  return (
    <main className="flex flex-col gap-4">
      <Header title="Pedidos e carinhos" />
      <div className="flex flex-col gap-4 px-5">
        <Section title={`Pedir pra ${who}`}>
          <div className="grid grid-cols-2 gap-2">
            {quickRequests(me.role).map((q) => (
              <button key={q.id} className="tap-pop min-h-[64px] rounded-2xl bg-[var(--chip)] px-3 text-left font-bold" onClick={() => ask(q.id)} data-testid={`ask-${q.id}`}>{q.label}</button>
            ))}
          </div>
          {!showCustom ? (
            <button className="mt-3 text-sm underline" onClick={() => setShowCustom(true)}>outro pedido</button>
          ) : (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) ask("custom", custom.trim()); }}>
              <input className="input" maxLength={280} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Escreva o pedido" aria-label="Pedido personalizado" />
              <button className="btn">Pedir</button>
            </form>
          )}
        </Section>

        <Section title="Carinho de 1 toque">
          <div className="flex flex-wrap gap-2">
            {TOUCHES.map((t) => <button key={t.id} className="chip tap-pop" onClick={() => touch(t.id)}>{t.label}</button>)}
          </div>
        </Section>

        <Section title="Abertos">
          {open.length === 0 && <p className="text-sm text-[var(--muted)]">Nada aberto agora.</p>}
          <ul className="flex flex-col gap-2">
            {open.map((r) => {
              const mine = r.to_user === me.user_id;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--chip)] p-3" data-testid="request-item">
                  <span>
                    <b>{requestLabel(r.type, r.from_user === me.user_id ? me.role : partner?.role ?? "her", r.custom_text)}</b>
                    <br /><span className="text-xs text-[var(--muted)]">{mine ? `de ${who}` : `você pediu pra ${who}`}</span>
                  </span>
                  {mine && <button className="btn min-h-[44px] px-4" onClick={() => done(r)} data-testid="request-done"><IconCheck size={20} /> feito</button>}
                </li>
              );
            })}
          </ul>
        </Section>

        {done_.length > 0 && (
          <Section title="Feitos">
            <ul className="flex flex-col gap-2">
              {done_.map((r) => (
                <li key={r.id} className="rounded-2xl border border-[var(--line)] p-3 text-sm">
                  <b>{requestLabel(r.type, r.from_user === me.user_id ? me.role : partner?.role ?? "her", r.custom_text)}</b>
                  {r.from_user === me.user_id && !r.reaction && (
                    <div className="mt-2 flex flex-wrap gap-2">{REACTIONS.map((x) => <button key={x.id} className="chip min-h-[36px] text-sm" onClick={() => react(r, x.id)}>{x.label}</button>)}</div>
                  )}
                  {r.reaction && <span className="ml-2 text-[var(--muted)]">· {REACTIONS.find((x) => x.id === r.reaction)?.label}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
      <Toast text={toast.text} />
    </main>
  );
}
