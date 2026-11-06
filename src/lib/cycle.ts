// Ciclo e previsão. Tudo calculado a partir de "desceu" (start_date) e "acabou" (end_date).
// Tendências populacionais; o check-in do dia SEMPRE pesa mais que a fase.

export type Contraception = "none" | "hormonal_pill" | "iud_hormonal" | "other";
export type CycleRow = { start_date: string; end_date: string | null; length_days: number | null };
export type Phase =
  | "menstrual"
  | "folicular"
  | "ovulatoria"
  | "lutea_inicial"
  | "lutea_final"
  | "cartela_ativa"
  | "pausa";

export const DAY = 86400000;
export const toDate = (s: string) => new Date(s + "T12:00:00Z");
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * DAY));
export const diffDays = (a: string, b: string) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY);

export type CycleStats = { length: number; sd: number; irregular: boolean; completed: number };

/** Média ponderada dos últimos 6 ciclos completos (mais peso aos recentes) e desvio padrão. */
export function cycleStats(cycles: CycleRow[], fallbackLength = 28): CycleStats {
  const lengths = [...cycles]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .filter((c) => c.length_days && c.length_days >= 15 && c.length_days <= 60)
    .map((c) => c.length_days as number)
    .slice(-6);
  if (lengths.length === 0) return { length: fallbackLength, sd: 2, irregular: false, completed: 0 };
  let wsum = 0;
  let total = 0;
  lengths.forEach((l, i) => {
    const w = i + 1;
    wsum += w;
    total += l * w;
  });
  const length = Math.round(total / wsum);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd =
    lengths.length < 2 ? 2 : Math.sqrt(lengths.reduce((a, l) => a + (l - mean) ** 2, 0) / (lengths.length - 1));
  return { length, sd: Math.max(1, Math.round(sd * 10) / 10), irregular: sd > 7, completed: lengths.length };
}

export function phaseFor(day: number, length: number, contraception: Contraception, bleeding = false): Phase {
  if (contraception === "hormonal_pill") return day <= 21 ? "cartela_ativa" : "pausa";
  if (bleeding || day <= 5) return "menstrual";
  const ov = Math.max(10, length - 14);
  if (day < ov - 2) return "folicular";
  if (day <= ov + 2) return "ovulatoria";
  if (day <= length - 6) return "lutea_inicial";
  return "lutea_final";
}

export type Prediction = {
  currentStart: string;
  day: number;
  phase: Phase;
  stats: CycleStats;
  nextStart: string;
  nextRange: [string, string];
  ovulation: string | null;
  irregular: boolean;
  late: boolean;
  /** 0-1: quanto a fase deve pesar nas sugestões */
  phaseWeight: number;
  bleeding: boolean;
};

export function predict(cycles: CycleRow[], contraception: Contraception, avgLength: number, today: string): Prediction | null {
  if (!cycles.length) return null;
  const sorted = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const current = [...sorted].reverse().find((c) => c.start_date <= today);
  if (!current) return null;
  const stats = cycleStats(sorted, avgLength);
  const day = diffDays(today, current.start_date) + 1;
  const bleeding = !current.end_date && day <= 8;
  const nextStart = addDays(current.start_date, stats.length);
  const spread = Math.max(1, Math.round(stats.sd));
  const pill = contraception === "hormonal_pill";
  return {
    currentStart: current.start_date,
    day,
    phase: phaseFor(day, stats.length, contraception, bleeding),
    stats,
    nextStart,
    nextRange: [addDays(nextStart, -spread), addDays(nextStart, spread)],
    ovulation: pill ? null : addDays(nextStart, -14),
    irregular: stats.irregular,
    late: today > addDays(nextStart, spread),
    phaseWeight: pill ? 0 : stats.irregular ? 0.3 : contraception === "none" ? 1 : 0.6,
    bleeding,
  };
}

export const PHASES: Record<Phase, { label: string; trend: string; forHim: string; tips: string[] }> = {
  menstrual: {
    label: "Menstrual",
    trend: "energia mais baixa, pode ter cólica",
    forHim: "conforto, casa, assumir tarefas",
    tips: ["Deixe a bolsa térmica à mão", "Assuma a louça e os gatos", "Tenha um chá ou chocolate em casa"],
  },
  folicular: {
    label: "Folicular",
    trend: "energia subindo",
    forHim: "aventura leve, algo novo",
    tips: ["Proponha algo novo e leve", "Bom momento pra planejar um passeio"],
  },
  ovulatoria: {
    label: "Ovulatória",
    trend: "pico de energia",
    forHim: "sair, encontro",
    tips: ["Marque um encontro", "Programa fora de casa costuma cair bem"],
  },
  lutea_inicial: {
    label: "Lútea inicial",
    trend: "estável, mais introspecção",
    forHim: "tranquilo, cinema, jantar em casa",
    tips: ["Jantar em casa com calma", "Um filme que ela queira ver"],
  },
  lutea_final: {
    label: "Lútea final / TPM",
    trend: "pode ter irritabilidade e desejos",
    forHim: "paciência, doce, espaço se ela pedir",
    tips: ["Tenha o doce favorito dela em casa", "Paciência extra; espaço se ela pedir", "Evite marcar coisas cansativas"],
  },
  cartela_ativa: {
    label: "Cartela ativa",
    trend: "sem fase ovulatória; vale o check-in do dia",
    forHim: "olhar o check-in dela",
    tips: ["Siga o que ela marcou no check-in"],
  },
  pausa: {
    label: "Pausa da cartela",
    trend: "pode descer nesses dias",
    forHim: "conforto e tarefas da casa",
    tips: ["Bolsa térmica e chá à mão", "Assuma as tarefas da casa"],
  },
};

export type RadarDay = { date: string; day: number; phase: Phase; note?: string };

/** Radar de 7 dias (para ele): o que vem pela frente. */
export function radar(p: Prediction, contraception: Contraception, from: string, days = 7): RadarDay[] {
  const out: RadarDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    let day = diffDays(date, p.currentStart) + 1;
    if (day > p.stats.length) day = day - p.stats.length;
    const phase = phaseFor(day, p.stats.length, contraception, false);
    let note: string | undefined;
    if (date >= p.nextRange[0] && date <= p.nextRange[1]) note = "pode descer";
    out.push({ date, day, phase, note });
  }
  return out;
}

export type LogLite = { date: string; mood: number | null; energy?: number | null };

/** Depois de 3 ciclos: janela de 4 dias com humor médio mais baixo. */
export function personalPattern(logs: LogLite[], cycles: CycleRow[]): { from: number; to: number; avg: number } | null {
  const completed = [...cycles].filter((c) => c.length_days).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (completed.length < 3) return null;
  const byDay = new Map<number, number[]>();
  for (const l of logs) {
    if (l.mood == null) continue;
    const c = [...completed].reverse().find((c) => c.start_date <= l.date && diffDays(l.date, c.start_date) < (c.length_days ?? 99));
    if (!c) continue;
    const d = diffDays(l.date, c.start_date) + 1;
    byDay.set(d, [...(byDay.get(d) ?? []), l.mood]);
  }
  let best: { from: number; to: number; avg: number } | null = null;
  for (let s = 1; s <= 32; s++) {
    const vals: number[] = [];
    for (let d = s; d < s + 4; d++) vals.push(...(byDay.get(d) ?? []));
    if (vals.length < 6) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (!best || avg < best.avg) best = { from: s, to: s + 3, avg };
  }
  return best && best.avg < 3.2 ? best : null;
}

/** Rede de segurança: 10+ dias com rosto 1-2 no ciclo atual. */
export function heavyDaysInCycle(logs: LogLite[], start: string, end?: string) {
  return logs.filter((l) => l.date >= start && (!end || l.date < end) && (l.mood ?? 5) <= 2).length;
}
