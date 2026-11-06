"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { sb, api } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn, weekStart, nowParts, fmtDay } from "@/lib/dates";
import { addDays, predict, PHASES, type Prediction } from "@/lib/cycle";
import { myLog, partnerLog, myCycles, partnerCycles, moodValue, type DailyLog, type PartnerDaily } from "@/lib/data";
import { MOOD_LABEL, MOOD_SIMPLE_LABEL, REACTIONS, TOUCHES, touchLabel, requestLabel, PARTNER_TIP } from "@/lib/content";
import { suggest, type SuggestionCard } from "@/lib/suggest";
import { sendTouch } from "@/lib/support";
import { Face, EmptyFace } from "@/components/Face";
import { Cats, catMoodFor } from "@/components/Cats";
import { IconPause, IconPlay, IconVault, IconSpark, IconCheck, IconPaw } from "@/components/Icons";
import { Section, Toast } from "@/components/ui";
import { useToast } from "@/components/useToast";
import { DailyQuestion } from "@/components/DailyQuestion";

type Req = { id: string; from_user: string; to_user: string; type: string; custom_text: string | null; status: string; created_at: string };
type Touch = { id: string; from_user: string; to_user: string; kind: string; created_at: string; seen_at: string | null };
type Care = { id: string; by_user: string; for_user: string; description: string; reaction: string | null; date: string };
type Task = { id: string; task: string; is_pet_task: boolean; can_take_over: boolean; last_done_at: string | null };

export default function Nos() {
  const { me, partner, share, pets, refresh } = useApp();
  const today = todayIn(me?.timezone);
  const [mine, setMine] = useState<DailyLog | null>(null);
  const [theirs, setTheirs] = useState<PartnerDaily | null>(null);
  const [herPred, setHerPred] = useState<Prediction | null>(null);
  const [lastTouch, setLastTouch] = useState<Touch | null>(null);
  const [incoming, setIncoming] = useState<Touch | null>(null);
  const [openReqs, setOpenReqs] = useState<Req[]>([]);
  const [cards, setCards] = useState<SuggestionCard[]>([]);
  const [pendingReact, setPendingReact] = useState<Care[]>([]);
  const [petTasks, setPetTasks] = useState<Task[]>([]);
  const [plan, setPlan] = useState<{ id: string; title: string }[]>([]);
  const toast = useToast();
  const herName = me?.role === "her" ? "você" : partner?.name || "ela";

  const load = useCallback(async () => {
    if (!me) return;
    const db = sb();
    const [m, t, touches, reqs, care, tasks, matches] = await Promise.all([
      myLog(today),
      partner ? partnerLog(today) : Promise.resolve(null),
      db.from("touches").select("*").eq("to_user", me.user_id).order("created_at", { ascending: false }).limit(1),
      db.from("requests").select("*").eq("status", "open").order("created_at", { ascending: false }),
      db.from("care_actions").select("*").eq("for_user", me.user_id).is("reaction", null).order("created_at", { ascending: false }).limit(3),
      db.from("household").select("id, task, is_pet_task, can_take_over, last_done_at").order("created_at"),
      db.from("outing_matches").select("id, title").eq("week", weekStart(today)),
    ]);
    setMine(m);
    setTheirs(t);
    setLastTouch((touches.data?.[0] as Touch) ?? null);
    setOpenReqs((reqs.data as Req[]) ?? []);
    setPendingReact((care.data as Care[]) ?? []);
    setPetTasks(((tasks.data as Task[]) ?? []).filter((x) => x.is_pet_task));
    setPlan(matches.data ?? []);

    // ciclo (dela: próprio; dele: só se ela compartilhar)
    let pred: Prediction | null = null;
    if (me.role === "her") pred = predict(await myCycles(), me.contraception, me.avg_cycle_length, today);
    else if (partner?.contraception) pred = predict(await partnerCycles(), partner.contraception, partner.avg_cycle_length ?? 28, today);
    setHerPred(pred);

    // sugestões: do que EU posso fazer pelo outro (nos dois sentidos)
    if (partner) {
      const [items, reactions, used, cons] = await Promise.all([
        db.from("context_items").select("id, category, title, tags, cost_level, preferred_by"),
        db.from("care_actions").select("context_item_id, reaction").eq("by_user", me.user_id).not("reaction", "is", null).limit(200),
        db.from("suggestions").select("items").eq("for_user", me.user_id).gte("date", weekStart(today)),
        db.from("constraints").select("*").eq("user_id", me.user_id).maybeSingle(),
      ]);
      const usedIds = (used.data ?? []).flatMap((s) => (s.items as SuggestionCard[]).map((c) => c.context_item_id).filter(Boolean)) as string[];
      const partnerPred = me.role === "him" ? pred : null;
      const input = {
        forRole: me.role,
        partnerRole: partner.role,
        partnerName: partner.name,
        partner: t ? { mood: t.mood, moodSimple: t.mood_simple, energy: t.energy, wants: t.wants ?? [], symptoms: t.symptoms ?? [], selfEsteemLow: !!t.self_esteem_low } : null,
        phase: partnerPred?.phase ?? null,
        phaseWeight: partnerPred?.phaseWeight ?? 0,
        items: items.data ?? [],
        tasks: (tasks.data as Task[]) ?? [],
        reactions: reactions.data ?? [],
        usedThisWeek: [],
        constraints: cons.data ?? { monthly_budget: 300, radius_km: 10, free_slots: {} },
        weekday: nowParts(me.timezone).weekday,
      };
      const existing = await db.from("suggestions").select("id, items, inputs_snapshot").eq("for_user", me.user_id).eq("date", today).order("created_at", { ascending: false }).limit(1);
      const snapshot = { partner: input.partner, phase: input.phase };
      const prev = existing.data?.[0];
      if (prev && JSON.stringify(prev.inputs_snapshot) === JSON.stringify(snapshot)) {
        setCards(prev.items as SuggestionCard[]);
      } else {
        const out = suggest({ ...input, usedThisWeek: usedIds });
        setCards(out);
        await db.from("suggestions").insert({ couple_id: me.couple_id, for_user: me.user_id, date: today, items: out, inputs_snapshot: snapshot });
      }
    }
  }, [me, partner, today]);

  useEffect(() => { load(); }, [load]);

  // carinhos e pedidos em tempo real
  useEffect(() => {
    if (!me) return;
    const ch = sb()
      .channel("nos-" + me.user_id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "touches", filter: `to_user=eq.${me.user_id}` }, (payload) => {
        const t = payload.new as Touch;
        setIncoming(t);
        setLastTouch(t);
        setTimeout(() => setIncoming(null), 2600);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => load())
      .subscribe();
    return () => { sb().removeChannel(ch); };
  }, [me, load]);

  if (!me) return null;

  async function togglePause() {
    await sb().from("share_settings").update({ paused_at: share?.paused_at ? null : new Date().toISOString() }).eq("user_id", me!.user_id);
    await refresh();
    toast.show(share?.paused_at ? "Compartilhamento retomado" : "Compartilhamento pausado");
  }
  async function touch(kind: string) {
    if (!partner) { toast.show("Seu amor ainda não entrou no Elo"); return; }
    await sendTouch(me!.couple_id, me!.user_id, partner.user_id, kind);
    toast.show("Carinho enviado");
  }
  async function done(r: Req) {
    await sb().from("requests").update({ status: "done", done_at: new Date().toISOString() }).eq("id", r.id);
    api("/api/notify", { kind: "request_done", id: r.id }).catch(() => {});
    load();
  }
  async function didIt(c: SuggestionCard) {
    if (!partner) return;
    const { data } = await sb()
      .from("care_actions")
      .insert({ couple_id: me!.couple_id, by_user: me!.user_id, for_user: partner.user_id, date: today, description: c.title, context_item_id: c.context_item_id ?? null, household_id: c.household_id ?? null })
      .select("id")
      .single();
    if (c.household_id) await sb().from("household").update({ last_done_at: new Date().toISOString(), last_done_by: me!.user_id }).eq("id", c.household_id);
    if (data) api("/api/notify", { kind: "care", id: data.id }).catch(() => {});
    toast.show("Anotado no diário de cuidado");
  }
  async function react(c: Care, reaction: string) {
    await sb().from("care_actions").update({ reaction }).eq("id", c.id);
    setPendingReact((p) => p.filter((x) => x.id !== c.id));
    toast.show("Reação enviada");
  }
  async function petDone(t: Task) {
    await sb().from("household").update({ last_done_at: new Date().toISOString(), last_done_by: me!.user_id }).eq("id", t.id);
    setPetTasks((p) => p.map((x) => (x.id === t.id ? { ...x, last_done_at: new Date().toISOString() } : x)));
  }

  const myMood = mine?.mood ?? null;
  const theirMood = moodValue(theirs);
  const toMe = openReqs.filter((r) => r.to_user === me.user_id);
  const fromMe = openReqs.filter((r) => r.from_user === me.user_id);
  const doneToday = (t: Task) => t.last_done_at && todayIn(me.timezone, new Date(t.last_done_at)) === today;
  const petAlerts = pets.flatMap((p) =>
    ([["vaccine_due", "vacina"], ["dewormer_due", "vermífugo"], ["flea_due", "antipulgas"]] as const)
      .filter(([k]) => p[k] && p[k]! <= addDays(today, 7))
      .map(([k, l]) => `${p.name}: ${l} ${p[k]! < today ? "atrasado" : "em " + fmtDay(p[k]!)}`),
  );
  const partnerHard = theirMood != null && theirMood <= 2;
  const showPhase = herPred && (me.role === "her" || (partner?.role === "her" && partner?.contraception));

  return (
    <main className="flex flex-col gap-4 px-5">
      <header className="safe-top flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{fmtDay(today, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-3xl font-extrabold">Nós</h1>
        </div>
        <button onClick={togglePause} className={`btn ${share?.paused_at ? "" : "btn-ghost"} min-h-[44px] px-4 text-sm`} data-testid="pause-toggle" aria-pressed={!!share?.paused_at}>
          {share?.paused_at ? <><IconPlay size={20} /> retomar</> : <><IconPause size={20} /> pausar</>}
        </button>
      </header>
      {share?.paused_at && <p className="rounded-2xl bg-[var(--chip)] p-3 text-center text-sm">Seu compartilhamento está pausado. {partner?.name || "Seu amor"} não vê seu humor nem seu ciclo.</p>}

      {/* rostos do dia */}
      <section className="card grid grid-cols-2 gap-2 p-4 text-center">
        <Link href="/checkin" className="flex flex-col items-center gap-1" data-testid="my-face">
          {myMood ? <Face mood={myMood} size={84} /> : <EmptyFace size={84} />}
          <span className="font-bold">Você</span>
          <span className="text-sm text-[var(--muted)]">{myMood ? MOOD_LABEL[myMood] : "fazer check-in"}</span>
        </Link>
        <div className="flex flex-col items-center gap-1" data-testid="partner-face">
          {!partner ? <EmptyFace size={84} /> : theirMood ? <Face mood={theirMood} size={84} /> : <EmptyFace size={84} />}
          <span className="font-bold">{partner?.name || "Seu amor"}</span>
          <span className="text-sm text-[var(--muted)]">
            {!partner ? "ainda não entrou" : partner.is_paused ? "compartilhamento pausado" : theirs?.mood ? MOOD_LABEL[theirs.mood] : theirs?.mood_simple ? MOOD_SIMPLE_LABEL[theirs.mood_simple] : "sem check-in hoje"}
          </span>
        </div>
        {theirs?.wants?.length ? <p className="col-span-2 text-sm">hoje {partner?.role === "her" ? "ela" : "ele"} quer: <b>{theirs.wants.map((w) => (w === "casa" ? "ficar em casa" : w === "espaco" ? "espaço" : w)).join(", ")}</b></p> : null}
        {showPhase && herPred && (
          <p className="col-span-2 text-xs text-[var(--muted)]" data-testid="phase">
            {me.role === "her" ? "seu ciclo" : `ciclo de ${herName}`}: dia {herPred.day} · {PHASES[herPred.phase].label.toLowerCase()}
          </p>
        )}
      </section>

      {incoming && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center" aria-live="assertive">
          <div className="heart-burst rounded-[32px] bg-[var(--accent)] px-8 py-6 text-center text-[var(--accent-ink)] shadow-2xl">
            <svg width="56" height="56" viewBox="0 0 24 24" className="mx-auto" fill="currentColor" aria-hidden><path d="M12 21s-7.5-4.6-9.5-9.3C1 7.9 3.4 4.5 7 4.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3.6 0 6 3.4 4.5 7.2C19.5 16.4 12 21 12 21z" /></svg>
            <p className="mt-2 text-xl font-extrabold">{touchLabel(incoming.kind)}</p>
          </div>
        </div>
      )}

      <Cats mood={catMoodFor(myMood, theirMood)} names={[pets[0]?.name, pets[1]?.name]} />

      {/* carinhos */}
      <Section title="Mandar um carinho">
        <div className="flex flex-wrap gap-2">
          {TOUCHES.map((t) => (
            <button key={t.id} className="chip tap-pop" onClick={() => touch(t.id)} data-testid={`touch-${t.id}`}>{t.label}</button>
          ))}
        </div>
        {lastTouch && <p className="mt-3 text-sm text-[var(--muted)]" data-testid="last-touch">Último carinho recebido: <b>{touchLabel(lastTouch.kind)}</b> · {new Date(lastTouch.created_at).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>}
      </Section>

      {/* pedidos abertos */}
      {(toMe.length > 0 || fromMe.length > 0) && (
        <Section title="Pedidos abertos" action={<Link href="/pedidos" className="text-sm underline">ver todos</Link>}>
          <ul className="flex flex-col gap-2">
            {toMe.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--chip)] p-3" data-testid="open-request">
                <span><b>{requestLabel(r.type, partner?.role ?? "her", r.custom_text)}</b><br /><span className="text-xs text-[var(--muted)]">{r.type === "espaco" ? `hoje ${partner?.role === "her" ? "ela" : "ele"} pediu espaço` : `de ${partner?.name || "seu amor"}`}</span></span>
                <button className="btn min-h-[44px] px-4" onClick={() => done(r)} data-testid="request-done"><IconCheck size={20} /> feito</button>
              </li>
            ))}
            {fromMe.map((r) => (
              <li key={r.id} className="rounded-2xl border border-[var(--line)] p-3 text-sm">Você pediu: <b>{requestLabel(r.type, me.role, r.custom_text)}</b></li>
            ))}
          </ul>
        </Section>
      )}

      {/* reações */}
      {pendingReact.map((c) => (
        <Section key={c.id} title={`${partner?.name || "Seu amor"} fez por você`}>
          <p className="mb-3">{c.description}</p>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map((r) => <button key={r.id} className="chip" onClick={() => react(c, r.id)}>{r.label}</button>)}
          </div>
        </Section>
      ))}

      {/* sugestões */}
      {partner && cards.length > 0 && (
        <Section title={`Ideias pra ${partner.name || (partner.role === "her" ? "ela" : "ele")}`}>
          {partnerHard && <p className="mb-3 text-sm text-[var(--muted)]">{partner.role === "her" ? PARTNER_TIP.sad : PARTNER_TIP.him_low}</p>}
          {theirs?.self_esteem_low && <p className="mb-3 text-sm font-semibold">{PARTNER_TIP.self_esteem}</p>}
          <ul className="flex flex-col gap-3">
            {cards.map((c, k) => (
              <li key={k} className="rounded-2xl bg-[var(--chip)] p-3" data-testid="suggestion">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{c.slot === "casa" ? "em casa" : c.slot === "gesto" ? "gesto pequeno" : "programa fora"}</p>
                <p className="mt-0.5 font-bold">{c.title}</p>
                {c.why && <p className="text-sm text-[var(--muted)]">porque {c.why}</p>}
                <button className="mt-2 text-sm font-bold text-[var(--accent)]" onClick={() => didIt(c)}>fiz isso</button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* plano da semana */}
      <Section title="Plano da semana" action={<Link href="/roles" className="text-sm underline">rolês</Link>}>
        {plan.length ? <ul className="list-disc pl-5">{plan.map((p) => <li key={p.id}>{p.title}</li>)}</ul> : <p className="text-sm text-[var(--muted)]">Na quinta à noite chegam ideias de rolê pro fim de semana. O que os dois aprovarem aparece aqui.</p>}
      </Section>

      <DailyQuestion />

      {/* gatos */}
      {(petTasks.length > 0 || petAlerts.length > 0) && (
        <Section title="Os gatos">
          {petAlerts.map((a) => <p key={a} className="mb-2 rounded-2xl bg-[var(--blush)] p-3 text-sm font-semibold">{a}</p>)}
          <div className="flex flex-wrap gap-2">
            {petTasks.map((t) => (
              <button key={t.id} className="chip" aria-pressed={!!doneToday(t)} onClick={() => petDone(t)}>
                <IconPaw size={18} className="mr-1" /> {t.task}{doneToday(t) ? " · feito" : ""}
              </button>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/cofre" className="btn btn-soft" data-testid="open-vault"><IconVault size={22} /> Cofre</Link>
        <Link href="/cuidado" className="btn btn-soft"><IconSpark size={22} /> Diário</Link>
      </div>
      <Link href="/retrospectiva" className="pb-2 text-center text-sm text-[var(--muted)] underline">Retrospectiva do mês</Link>
      <Toast text={toast.text} />
    </main>
  );
}
