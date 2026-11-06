export const TZ = "America/Sao_Paulo";

/** Data local (YYYY-MM-DD) num fuso. */
export function todayIn(tz = TZ, d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
/** Hora local em minutos desde meia-noite e dia da semana (0 = domingo). */
export function nowParts(tz = TZ, d = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const h = Number(get("hour")) % 24;
  return { weekday: wd, minutes: h * 60 + Number(get("minute")), date: todayIn(tz, d) };
}
export function weekStart(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  const wd = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((wd + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function fmtDay(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("pt-BR", { ...opts, timeZone: "UTC" });
}
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
