// Motor de sugestões por regras (sem IA). Roda a cada check-in, nos dois sentidos:
// gera ideias do que EU posso fazer pelo OUTRO, a partir do estado dele(a) hoje.
import type { Phase } from "./cycle";
import type { Role } from "./content";

export type PartnerState = {
  mood: number | null; // 1-5 (null se oculto)
  moodSimple: string | null; // dificil | mais_ou_menos | bem
  energy: number | null;
  wants: string[];
  symptoms: string[];
  selfEsteemLow: boolean;
};
export type ContextItem = {
  id: string;
  category: string;
  title: string;
  tags: string[];
  cost_level: number;
  preferred_by: "her" | "him" | "both";
};
export type HouseTask = { id: string; task: string; can_take_over: boolean; is_pet_task: boolean };
export type PastReaction = { context_item_id: string | null; reaction: "loved" | "thanks" | "next_time" | null };
export type Constraints = { monthly_budget: number; radius_km: number; free_slots: Record<string, boolean> };

export type SuggestionCard = {
  slot: "casa" | "gesto" | "fora";
  title: string;
  why: string;
  context_item_id?: string;
  household_id?: string;
  category?: string;
};

export type MotorInput = {
  forRole: Role; // quem vai fazer
  partnerRole: Role;
  partnerName: string;
  partner: PartnerState | null;
  phase: Phase | null;
  phaseWeight: number;
  items: ContextItem[];
  tasks: HouseTask[];
  reactions: PastReaction[];
  usedThisWeek: string[]; // context_item_ids já sugeridos na semana
  constraints: Constraints;
  weekday: number;
};

const SLOT_CATEGORIES: Record<SuggestionCard["slot"], string[]> = {
  casa: ["comida", "doce", "filme"],
  gesto: ["gesto", "presente", "linguagem_amor", "doce"],
  fora: ["restaurante", "lugar"],
};

const PHASE_TAGS: Partial<Record<Phase, string[]>> = {
  menstrual: ["menstrual", "energia_baixa"],
  pausa: ["menstrual", "energia_baixa"],
  folicular: ["energia_alta"],
  ovulatoria: ["ovulatoria", "energia_alta", "quer_sair"],
  lutea_inicial: ["quer_casa"],
  lutea_final: ["tpm", "quer_casa"],
};

/** Tags que descrevem o estado do outro hoje. */
export function stateTags(p: PartnerState | null): string[] {
  if (!p) return [];
  const t = new Set<string>();
  const hard = (p.mood != null && p.mood <= 2) || p.moodSimple === "dificil" || p.selfEsteemLow;
  const good = (p.mood != null && p.mood >= 4) || p.moodSimple === "bem";
  if (hard) t.add("dia_dificil");
  if (good) t.add("dia_bom");
  if (p.energy != null && p.energy <= 2) t.add("energia_baixa");
  if (p.energy != null && p.energy >= 4) t.add("energia_alta");
  for (const w of p.wants) t.add("quer_" + w);
  if (p.symptoms.some((s) => ["colica", "dor", "cansaco", "dor_lombar"].includes(s))) t.add("energia_baixa");
  return [...t];
}

function maxCost(budget: number) {
  return budget < 150 ? 1 : budget < 400 ? 2 : 3;
}

export function scoreItem(it: ContextItem, input: MotorInput, sTags: string[]): number {
  const fitState = it.tags.filter((t) => sTags.includes(t)).length;
  const phaseTags = input.phase ? PHASE_TAGS[input.phase] ?? [] : [];
  const fitPhase = it.tags.filter((t) => phaseTags.includes(t)).length * input.phaseWeight;
  const r = input.reactions.filter((x) => x.context_item_id === it.id);
  const react = r.reduce((a, x) => a + (x.reaction === "loved" ? 1 : x.reaction === "thanks" ? 0.4 : x.reaction === "next_time" ? -1 : 0), 0);
  const repeat = input.usedThisWeek.includes(it.id) ? 3 : 0;
  // contradições fortes derrubam o item
  const contra = (sTags.includes("quer_casa") || sTags.includes("energia_baixa")) && ["restaurante", "lugar"].includes(it.category) ? 2 : 0;
  return 3 * fitState + 2 * react + 1 * fitPhase - repeat - contra + (it.preferred_by === input.partnerRole ? 0.5 : 0);
}

const FALLBACK: Record<SuggestionCard["slot"], string[]> = {
  casa: ["Pedir a comida favorita", "Filme no sofá com coberta", "Fazer um chá"],
  gesto: ["Um bilhete com algo específico que você admira", "Um abraço demorado", "Café do jeito que gosta"],
  fora: ["Caminhada curta no fim da tarde", "Um café num lugar novo", "Sorvete na esquina"],
};

function why(input: MotorInput, sTags: string[]): string {
  const p = input.partner;
  const ela = input.partnerRole === "her" ? "ela" : "ele";
  const bits: string[] = [];
  if (p?.energy != null) bits.push(`${ela} marcou energia ${p.energy}`);
  else if (p?.mood != null) bits.push(`${ela} marcou rosto ${p.mood}`);
  else if (p?.moodSimple) bits.push(`${ela} está num dia ${p.moodSimple === "dificil" ? "difícil" : p.moodSimple === "bem" ? "bom" : "mais ou menos"}`);
  if (p?.wants.length) bits.push(`quer ${p.wants.map((w) => (w === "casa" ? "ficar em casa" : w === "espaco" ? "espaço" : w)).join(" e ")}`);
  if (!bits.length && input.phase && input.phaseWeight > 0.5) bits.push(`fase ${input.phase.replace("_", " ")}`);
  if (!bits.length && sTags.length === 0) bits.push(`${ela} ainda não fez check-in hoje`);
  return bits.join(", ");
}

/** Monta 3 cards de categorias diferentes: em casa, gesto pequeno, programa fora (ou casa de novo). */
export function suggest(input: MotorInput): SuggestionCard[] {
  const sTags = stateTags(input.partner);
  const cap = maxCost(input.constraints.monthly_budget);
  const freeToday = input.constraints.free_slots?.[String(input.weekday)] !== false;
  const wantsHome = sTags.includes("quer_casa") || sTags.includes("energia_baixa") || sTags.includes("dia_dificil");
  const wantsSpace = sTags.includes("quer_espaco");
  const hard = sTags.includes("dia_dificil") || sTags.includes("energia_baixa");

  const pool = input.items
    .filter((i) => i.category !== "irrita")
    .filter((i) => i.cost_level <= cap)
    .filter((i) => i.preferred_by === "both" || i.preferred_by === input.partnerRole)
    .map((i) => ({ i, s: scoreItem(i, input, sTags) }))
    .sort((a, b) => b.s - a.s);

  const slots: SuggestionCard["slot"][] = ["casa", "gesto", !freeToday || wantsHome || wantsSpace ? "casa" : "fora"];
  const usedCats = new Set<string>();
  const usedIds = new Set<string>();
  const base = why(input, sTags);
  const avoid = input.items.find((i) => i.category === "irrita");
  const takeover = hard ? input.tasks.find((t) => t.can_take_over && !t.is_pet_task) : undefined;
  const petTask = hard ? input.tasks.find((t) => t.can_take_over && t.is_pet_task) : undefined;

  const cards: SuggestionCard[] = slots.map((slot, idx) => {
    const pick = pool.find((x) => SLOT_CATEGORIES[slot].includes(x.i.category) && !usedCats.has(x.i.category) && !usedIds.has(x.i.id));
    let card: SuggestionCard;
    if (pick) {
      usedCats.add(pick.i.category);
      usedIds.add(pick.i.id);
      card = { slot, title: pick.i.title, why: base, context_item_id: pick.i.id, category: pick.i.category };
    } else {
      const f = FALLBACK[slot][idx % FALLBACK[slot].length];
      card = { slot, title: f, why: base };
    }
    if (slot === "casa" && idx === 0 && takeover) {
      card.title = `${card.title} + assumir ${takeover.task.toLowerCase()}`;
      card.household_id = takeover.id;
    }
    return card;
  });

  if (wantsSpace) {
    cards[1] = {
      slot: "gesto",
      title: "Dar espaço sem perguntar e deixar algo gostoso por perto",
      why: `${input.partnerRole === "her" ? "ela" : "ele"} pediu espaço hoje`,
    };
  }
  if (petTask) {
    cards[2] = { ...cards[2], title: `${cards[2].title} · e cuidar de: ${petTask.task.toLowerCase()}`, household_id: cards[2].household_id ?? petTask.id };
  }
  if (avoid && hard) cards[0].why += ` · evite: ${avoid.title.toLowerCase()}`;
  return cards;
}
