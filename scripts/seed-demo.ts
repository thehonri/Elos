/**
 * Casal de demonstração, separado dos dados reais.
 * Rodar: npx tsx scripts/seed-demo.ts   (recria do zero se já existir)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const anon = () => createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

export const DEMO_PASSWORD = "demo-elo-2026";
const HER = "demo-ela@elo.test";
const HIM = "demo-ele@elo.test";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) + "T12:00:00Z");
const daysAgo = (n: number) => iso(new Date(today.getTime() - n * 86400000));

async function reset() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((u) => u.email === HER || u.email === HIM)) {
    const { data: p } = await admin.from("profiles").select("couple_id").eq("user_id", u.id).maybeSingle();
    await admin.auth.admin.deleteUser(u.id);
    if (p?.couple_id) await admin.from("couples").delete().eq("id", p.couple_id);
  }
}

async function login(email: string) {
  const { error } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true });
  if (error) throw error;
  const c = anon();
  const s = await c.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (s.error) throw s.error;
  return { c, id: s.data.user!.id };
}

async function main() {
  await reset();
  const him = await login(HIM);
  const her = await login(HER);
  const couple = (await him.c.rpc("create_couple", { p_name: "Léo (demo)", p_role: "him" })).data;
  await her.c.rpc("join_couple", { p_code: couple.invite_code, p_name: "Bia (demo)" });
  const cid = couple.id as string;
  const now = new Date().toISOString();

  await her.c.from("profiles").update({ contraception: "none", avg_cycle_length: 29, onboarded_at: now }).eq("user_id", her.id);
  await him.c.from("profiles").update({ onboarded_at: now }).eq("user_id", him.id);
  await her.c.from("share_settings").update({ confirmed_at: now }).eq("user_id", her.id);

  // 3 ciclos completos + o atual
  const starts = [daysAgo(95), daysAgo(66), daysAgo(37), daysAgo(9)];
  for (const s of starts) await her.c.from("cycles").insert({ user_id: her.id, start_date: s, end_date: iso(new Date(new Date(s + "T12:00:00Z").getTime() + 4 * 86400000)) });

  // check-ins dos últimos 95 dias (dias 24-27 mais difíceis para gerar padrão pessoal)
  const herLogs = [];
  const himLogs = [];
  for (let n = 95; n >= 1; n--) {
    const date = daysAgo(n);
    const start = [...starts].reverse().find((s) => s <= date)!;
    const day = Math.round((new Date(date + "T12:00:00Z").getTime() - new Date(start + "T12:00:00Z").getTime()) / 86400000) + 1;
    const hard = day >= 24 && day <= 27;
    const mood = hard ? 2 : day <= 3 ? 3 : day >= 12 && day <= 16 ? 5 : 4;
    herLogs.push({ user_id: her.id, date, mood, energy: day <= 3 ? 2 : mood, wants: hard ? ["espaco"] : day <= 3 ? ["casa", "colo"] : [], symptoms: day <= 3 ? ["colica", "cansaco"] : hard ? ["irritacao"] : [], private_note: n === 10 ? "nota privada de teste: nunca aparece pra ele" : null });
    if (n % 2 === 0) himLogs.push({ user_id: him.id, date, mood: n % 9 === 0 ? 2 : 4, energy: 3 });
  }
  await her.c.from("daily_logs").insert(herLogs);
  await him.c.from("daily_logs").insert(himLogs);

  // 20 itens de contexto (10 de cada)
  const ctx = (by: string, preferred: string, rows: [string, string, string[], number][]) =>
    rows.map(([category, title, tags, cost_level]) => ({ couple_id: cid, created_by: by, category, title, tags, cost_level, preferred_by: preferred }));
  await her.c.from("context_items").insert(ctx(her.id, "her", [
    ["comida", "Japonês do Sushi Zen", ["energia_baixa", "quer_casa", "dia_dificil"], 2],
    ["doce", "Brigadeiro de colher", ["tpm", "dia_dificil"], 1],
    ["doce", "Sorvete de pistache", ["dia_bom", "tpm"], 1],
    ["filme", "Comédia romântica antiga", ["quer_casa", "chuva", "dia_dificil"], 1],
    ["lugar", "Parque com lago", ["energia_alta", "quer_sair"], 1],
    ["restaurante", "Bistrô francês", ["dia_bom", "ovulatoria", "quer_sair"], 3],
    ["gesto", "Banho preparado com vela", ["menstrual", "energia_baixa"], 1],
    ["presente", "Livro de poesia", ["dia_bom"], 2],
    ["linguagem_amor", "Palavras de afirmação", ["dia_dificil"], 1],
    ["irrita", "Barulho logo cedo", [], 1],
  ]));
  await him.c.from("context_items").insert(ctx(him.id, "him", [
    ["comida", "Hambúrguer artesanal", ["dia_bom", "quer_sair"], 2],
    ["doce", "Pudim", ["dia_dificil"], 1],
    ["filme", "Série de ficção científica", ["quer_casa", "energia_baixa"], 1],
    ["lugar", "Trilha leve", ["energia_alta", "quer_sair"], 1],
    ["restaurante", "Boteco do bairro", ["quer_conversar", "dia_bom"], 2],
    ["gesto", "Café na cama", ["dia_dificil", "energia_baixa"], 1],
    ["gesto", "Bilhete na mochila", ["dia_dificil", "dia_bom"], 1],
    ["presente", "Vinil de uma banda favorita", ["dia_bom"], 3],
    ["linguagem_amor", "Tempo junto sem celular", ["quer_conversar", "quer_colo"], 1],
    ["irrita", "Atraso sem aviso", [], 1],
  ]));

  // 2 gatos
  await him.c.from("pets").insert([
    { couple_id: cid, name: "Mingau", vaccine_due: daysAgo(-5), flea_due: daysAgo(-20) },
    { couple_id: cid, name: "Paçoca", dewormer_due: daysAgo(-3) },
  ]);

  // Cofre
  await him.c.from("vault_items").insert([
    { couple_id: cid, author: him.id, for_user: her.id, kind: "message", content: "Lembra do jeito que você riu naquela viagem? Você é a pessoa mais forte e engraçada que eu conheço." },
    { couple_id: cid, author: him.id, kind: "phrase", content: "Casa é onde vocês três estão." },
  ]);
  await her.c.from("vault_items").insert([
    { couple_id: cid, author: her.id, kind: "compliment", content: "Minha chefe disse que minha apresentação foi a mais clara do trimestre." },
    { couple_id: cid, author: her.id, kind: "moment", content: "Domingo de sol com os gatos na janela." },
    { couple_id: cid, author: her.id, for_user: him.id, kind: "message", content: "Você cuida de todo mundo. Hoje deixa eu cuidar de você." },
  ]);

  // um pedido aberto, um carinho e um cuidado sem reação
  await her.c.from("requests").insert({ couple_id: cid, from_user: her.id, to_user: him.id, type: "chocolate" });
  await him.c.from("touches").insert({ couple_id: cid, from_user: him.id, to_user: her.id, kind: "bom_dia" });
  await him.c.from("care_actions").insert({ couple_id: cid, by_user: him.id, for_user: her.id, date: daysAgo(0), description: "Assumi a caixa de areia" });

  console.log(`Casal demo pronto: ${HER} / ${HIM} — senha ${DEMO_PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
