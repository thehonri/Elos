"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp, type Pet } from "@/lib/app-context";
import { todayIn, WEEKDAYS } from "@/lib/dates";
import { CONTEXT_CATEGORIES, CONTEXT_TAGS, STARTER_CONTEXT } from "@/lib/content";
import { Chips, Header, Section, Toast, toggle } from "@/components/ui";
import { useToast } from "@/components/useToast";
import { IconCheck, IconPlus } from "@/components/Icons";

type Item = { id: string; created_by: string; category: string; title: string; tags: string[]; cost_level: number; preferred_by: string };
type Task = { id: string; task: string; default_owner: string; frequency: string; can_take_over: boolean; is_pet_task: boolean; last_done_at: string | null };
type Cons = { monthly_budget: number; radius_km: number; free_slots: Record<string, boolean> };

export default function Contexto() {
  const { me, pets, refresh } = useApp();
  const [tab, setTab] = useState<"itens" | "casa" | "limites">("itens");
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cons, setCons] = useState<Cons | null>(null);
  const [form, setForm] = useState<{ category: string; title: string; tags: string[]; cost_level: number; preferred_by: string } | null>(null);
  const [newTask, setNewTask] = useState("");
  const toast = useToast();
  const today = todayIn(me?.timezone);

  const load = useCallback(async () => {
    if (!me) return;
    const [i, t, c] = await Promise.all([
      sb().from("context_items").select("*").order("created_at", { ascending: false }),
      sb().from("household").select("*").order("is_pet_task", { ascending: false }).order("created_at"),
      sb().from("constraints").select("*").eq("user_id", me.user_id).maybeSingle(),
    ]);
    setItems((i.data as Item[]) ?? []);
    setTasks((t.data as Task[]) ?? []);
    setCons((c.data as Cons) ?? null);
  }, [me]);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form?.title.trim()) return;
    await sb().from("context_items").insert({ ...form, title: form.title.trim(), couple_id: me!.couple_id, created_by: me!.user_id });
    setForm(null);
    toast.show("Guardado");
    load();
  }
  async function addStarter(k: number) {
    await sb().from("context_items").insert({ ...STARTER_CONTEXT[k], couple_id: me!.couple_id, created_by: me!.user_id, preferred_by: me!.role });
    load();
  }
  async function removeItem(id: string) {
    await sb().from("context_items").delete().eq("id", id);
    load();
  }
  async function taskDone(t: Task) {
    await sb().from("household").update({ last_done_at: new Date().toISOString(), last_done_by: me!.user_id }).eq("id", t.id);
    toast.show("Feito");
    load();
  }
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    await sb().from("household").insert({ couple_id: me!.couple_id, task: newTask.trim() });
    setNewTask("");
    load();
  }
  async function updateTask(t: Task, patch: Partial<Task>) {
    await sb().from("household").update(patch).eq("id", t.id);
    load();
  }
  async function saveCons(patch: Partial<Cons>) {
    const next = { ...cons!, ...patch };
    setCons(next);
    await sb().from("constraints").update(patch).eq("user_id", me!.user_id);
  }
  async function savePet(p: Pet, patch: Partial<Pet>) {
    await sb().from("pets").update(patch).eq("id", p.id);
    await refresh();
  }

  const titles = new Set(items.map((i) => i.title));
  const doneToday = (t: Task) => t.last_done_at && todayIn(me.timezone, new Date(t.last_done_at)) === today;

  return (
    <main className="flex flex-col gap-4">
      <Header title="Contexto" />
      <div className="mx-5 grid grid-cols-3 gap-1 rounded-full bg-[var(--chip)] p-1" role="tablist">
        {([["itens", "Gostos"], ["casa", "Casa e gatos"], ["limites", "Limites"]] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`min-h-[44px] rounded-full text-sm font-bold ${tab === id ? "bg-[var(--card)] shadow" : ""}`} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-5">
        {tab === "itens" && (
          <>
            <Section title={`Banco de contexto (${items.length})`} action={<button className="chip min-h-[40px]" onClick={() => setForm({ category: "comida", title: "", tags: [], cost_level: 1, preferred_by: me.role })}><IconPlus size={18} /> novo</button>}>
              {form && (
                <form onSubmit={saveItem} className="mb-4 flex flex-col gap-3 rounded-2xl bg-[var(--chip)] p-3">
                  <div className="flex flex-wrap gap-2">
                    {CONTEXT_CATEGORIES.map((c) => <button type="button" key={c.id} className="chip bg-[var(--card)]" aria-pressed={form.category === c.id} onClick={() => setForm({ ...form, category: c.id })}>{c.label}</button>)}
                  </div>
                  <input className="input" placeholder={CONTEXT_CATEGORIES.find((c) => c.id === form.category)?.hint} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} aria-label="Título" required />
                  <p className="label">Quando funciona</p>
                  <Chips options={CONTEXT_TAGS} value={form.tags} onToggle={(id) => setForm({ ...form, tags: toggle(form.tags, id) })} />
                  <p className="label">Custo</p>
                  <div className="flex gap-2">{[1, 2, 3].map((c) => <button type="button" key={c} className="chip flex-1 justify-center" aria-pressed={form.cost_level === c} onClick={() => setForm({ ...form, cost_level: c })}>{"$".repeat(c)}</button>)}</div>
                  <p className="label">Quem prefere</p>
                  <div className="flex gap-2">{([["her", "ela"], ["him", "ele"], ["both", "os dois"]] as const).map(([v, l]) => <button type="button" key={v} className="chip flex-1 justify-center" aria-pressed={form.preferred_by === v} onClick={() => setForm({ ...form, preferred_by: v })}>{l}</button>)}</div>
                  <div className="flex gap-2"><button className="btn flex-1">Guardar</button><button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>cancelar</button></div>
                </form>
              )}
              {CONTEXT_CATEGORIES.map((cat) => {
                const list = items.filter((i) => i.category === cat.id);
                if (!list.length) return null;
                return (
                  <div key={cat.id} className="mb-3">
                    <p className="label mb-1">{cat.label}</p>
                    <ul className="flex flex-wrap gap-2">
                      {list.map((i) => (
                        <li key={i.id} className="chip gap-2">
                          {i.title} <span className="text-xs text-[var(--muted)]">{i.preferred_by === "both" ? "" : i.preferred_by === "her" ? "· ela" : "· ele"}</span>
                          {i.created_by === me.user_id && <button className="text-[var(--muted)]" aria-label={`Remover ${i.title}`} onClick={() => removeItem(i.id)}>×</button>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </Section>
            <Section title="Sugestões prontas (toque para adicionar)">
              <div className="flex flex-wrap gap-2">
                {STARTER_CONTEXT.map((c, k) => !titles.has(c.title) && <button key={c.title} className="chip" onClick={() => addStarter(k)}>{c.category === "irrita" ? `me irrita: ${c.title.toLowerCase()}` : c.title}</button>)}
              </div>
            </Section>
          </>
        )}

        {tab === "casa" && (
          <>
            <Section title="Tarefas">
              <ul className="flex flex-col gap-2">
                {tasks.map((t) => (
                  <li key={t.id} className="rounded-2xl bg-[var(--chip)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{t.task}</span>
                      <button className="btn min-h-[44px] px-4" aria-pressed={!!doneToday(t)} onClick={() => taskDone(t)}><IconCheck size={18} /> {doneToday(t) ? "feito hoje" : "feito"}</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {([["her", "ela"], ["him", "ele"], ["both", "os dois"]] as const).map(([v, l]) => (
                        <button key={v} className="chip min-h-[32px] px-3 text-xs" aria-pressed={t.default_owner === v} onClick={() => updateTask(t, { default_owner: v })}>{l}</button>
                      ))}
                      <button className="chip min-h-[32px] px-3 text-xs" aria-pressed={t.can_take_over} onClick={() => updateTask(t, { can_take_over: !t.can_take_over })}>posso assumir em dia difícil</button>
                    </div>
                  </li>
                ))}
              </ul>
              <form onSubmit={addTask} className="mt-3 flex gap-2">
                <input className="input" placeholder="Nova tarefa" value={newTask} onChange={(e) => setNewTask(e.target.value)} aria-label="Nova tarefa" />
                <button className="btn">Adicionar</button>
              </form>
            </Section>
            <Section title="Saúde dos gatos">
              {pets.length === 0 && <p className="text-sm text-[var(--muted)]">Nenhum gato cadastrado ainda.</p>}
              {pets.map((p) => (
                <div key={p.id} className="mb-3 rounded-2xl bg-[var(--chip)] p-3">
                  <p className="font-bold">{p.name}</p>
                  {([["vaccine_due", "Vacina"], ["dewormer_due", "Vermífugo"], ["flea_due", "Antipulgas"]] as const).map(([k, l]) => (
                    <label key={k} className="mt-2 flex items-center justify-between gap-2 text-sm">
                      {l}
                      <input type="date" className="input max-w-[170px] min-h-[44px]" value={p[k] ?? ""} onChange={(e) => savePet(p, { [k]: e.target.value || null })} />
                    </label>
                  ))}
                </div>
              ))}
              <p className="text-xs text-[var(--muted)]">Os dois recebem aviso 3 dias antes e no dia.</p>
            </Section>
          </>
        )}

        {tab === "limites" && cons && (
          <Section title="Minhas restrições">
            <label className="label" htmlFor="budget">Orçamento mensal para programas: <b>R$ {cons.monthly_budget}</b></label>
            <input id="budget" type="range" min={0} max={1500} step={50} value={cons.monthly_budget} onChange={(e) => saveCons({ monthly_budget: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
            <label className="label mt-3 block" htmlFor="radius">Até onde topo ir: <b>{cons.radius_km} km</b></label>
            <input id="radius" type="range" min={1} max={100} value={cons.radius_km} onChange={(e) => saveCons({ radius_km: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
            <p className="label mt-3">Dias livres para programas fora</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {WEEKDAYS.map((d, k) => (
                <button key={d} className="chip" aria-pressed={cons.free_slots?.[String(k)] !== false} onClick={() => saveCons({ free_slots: { ...cons.free_slots, [String(k)]: cons.free_slots?.[String(k)] === false } })}>{d.slice(0, 3)}</button>
              ))}
            </div>
          </Section>
        )}
      </div>
      <Toast text={toast.text} />
    </main>
  );
}
