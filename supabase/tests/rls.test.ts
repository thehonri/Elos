/**
 * Portão 1 — testes de RLS com usuários reais (criados e apagados aqui).
 * Rodar: npm run test:rls
 * Dois casais: A (ela+ele) e B (ela+ele). Prova que:
 *  - parceiro nunca lê private_note
 *  - compartilhamento desligado/pausado/não confirmado => nada
 *  - ninguém edita registros do outro
 *  - um casal não vê nada do outro
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const PW = "Rls-" + run + "-x9!";

let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) { passes++; console.log("  ✓", name); }
  else { failures++; console.log("  ✗", name, extra ?? ""); }
}

async function user(tag: string) {
  const email = `rls-${tag}-${run}@elo.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw error;
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password: PW });
  if (s.error) throw s.error;
  return { id: data.user.id, c };
}

const today = new Date().toISOString().slice(0, 10);

async function main() {
  const ids: string[] = [];
  try {
    const herA = await user("herA"), himA = await user("himA"), herB = await user("herB"), himB = await user("himB");
    ids.push(herA.id, himA.id, herB.id, himB.id);

    // casais
    const ca = await himA.c.rpc("create_couple", { p_name: "Ele A", p_role: "him" });
    if (ca.error) throw ca.error;
    const j1 = await herA.c.rpc("join_couple", { p_code: ca.data.invite_code, p_name: "Ela A" });
    if (j1.error) throw j1.error;
    const cb = await herB.c.rpc("create_couple", { p_name: "Ela B", p_role: "her" });
    if (cb.error) throw cb.error;
    const j2 = await himB.c.rpc("join_couple", { p_code: cb.data.invite_code, p_name: "Ele B" });
    if (j2.error) throw j2.error;

    console.log("Convite");
    const intruder = await user("intruder"); ids.push(intruder.id);
    const j3 = await intruder.c.rpc("join_couple", { p_code: ca.data.invite_code, p_name: "X" });
    check("terceira pessoa não entra num casal cheio", !!j3.error);

    // dados dela
    await herA.c.from("daily_logs").insert({
      user_id: herA.id, date: today, mood: 2, energy: 2, wants: ["colo"],
      symptoms: ["colica", "acne"], self_esteem_low: true, private_note: "segredo da A",
    });
    await herA.c.from("cycles").insert({ user_id: herA.id, start_date: today });

    console.log("Antes de ela confirmar a tela de compartilhamento");
    let v = await himA.c.from("partner_view_daily").select("*");
    check("ele não vê nada antes da confirmação", v.data?.length === 0, v);
    let cy = await himA.c.from("partner_view_cycles").select("*");
    check("ele não vê ciclo antes da confirmação", cy.data?.length === 0, cy);

    await herA.c.from("share_settings").update({ confirmed_at: new Date().toISOString() }).eq("user_id", herA.id);

    console.log("Padrões (fase on, humor full, sintomas por categoria)");
    v = await himA.c.from("partner_view_daily").select("*");
    const row = v.data?.[0];
    check("ele vê o humor dela", row?.mood === 2, v);
    check("private_note não existe na view", row && !("private_note" in row), row);
    check("sintomas aparecem só como categoria", JSON.stringify([...(row?.symptoms ?? [])].sort()) === JSON.stringify(["dor", "pele"]), row?.symptoms);
    cy = await himA.c.from("partner_view_cycles").select("*");
    check("ele vê o ciclo", cy.data?.length === 1, cy);

    console.log("Leitura direta das tabelas");
    const direct = await himA.c.from("daily_logs").select("*").eq("user_id", herA.id);
    check("ele não lê daily_logs dela direto", direct.data?.length === 0, direct);
    const directNote = await himA.c.from("daily_logs").select("private_note");
    check("nenhuma private_note dela acessível", !(directNote.data ?? []).some((r) => r.private_note), directNote);
    const dc = await himA.c.from("cycles").select("*").eq("user_id", herA.id);
    check("ele não lê cycles dela direto", dc.data?.length === 0);
    const ds = await himA.c.from("share_settings").select("*").eq("user_id", herA.id);
    check("ele não lê share_settings dela", ds.data?.length === 0);
    const dp = await himA.c.from("profiles").select("*").eq("user_id", herA.id);
    check("ele não lê o profile dela direto (só partner_profile)", dp.data?.length === 0);

    console.log("Modo simple / off");
    await herA.c.from("share_settings").update({ share_mood: "simple", share_symptoms: "off" }).eq("user_id", herA.id);
    v = await himA.c.from("partner_view_daily").select("*");
    check("simple: sem nota numérica", v.data?.[0]?.mood === null && v.data?.[0]?.mood_simple === "dificil", v.data);
    check("simple: energia oculta", v.data?.[0]?.energy === null);
    check("sintomas off: ocultos", v.data?.[0]?.symptoms === null);
    await herA.c.from("share_settings").update({ share_mood: "off", share_symptoms: "off", share_phase: false }).eq("user_id", herA.id);
    v = await himA.c.from("partner_view_daily").select("*");
    check("tudo off: nenhuma linha", v.data?.length === 0, v.data);
    cy = await himA.c.from("partner_view_cycles").select("*");
    check("fase off: ciclo oculto", cy.data?.length === 0);
    const pp = await himA.c.from("partner_profile").select("*").single();
    check("fase off: método contraceptivo oculto", pp.data?.contraception === null, pp.data);

    console.log("Pausar");
    await herA.c.from("share_settings").update({ share_mood: "full", share_symptoms: "detailed", share_phase: true, paused_at: new Date().toISOString() }).eq("user_id", herA.id);
    v = await himA.c.from("partner_view_daily").select("*");
    check("pausado: nada do diário", v.data?.length === 0);
    cy = await himA.c.from("partner_view_cycles").select("*");
    check("pausado: nada do ciclo", cy.data?.length === 0);
    const pp2 = await himA.c.from("partner_profile").select("is_paused").single();
    check("ele sabe que está pausado (sem motivo)", pp2.data?.is_paused === true);
    await herA.c.from("share_settings").update({ paused_at: null }).eq("user_id", herA.id);
    v = await himA.c.from("partner_view_daily").select("*");
    check("despausado: volta a ver", v.data?.length === 1);

    console.log("Ninguém edita registros do outro");
    const up = await himA.c.from("daily_logs").update({ mood: 5 }).eq("user_id", herA.id).select();
    check("ele não altera o check-in dela", (up.data?.length ?? 0) === 0);
    const ins = await himA.c.from("daily_logs").insert({ user_id: herA.id, date: "2020-01-01", mood: 5 });
    check("ele não cria check-in em nome dela", !!ins.error);
    const shareHack = await himA.c.from("share_settings").update({ share_mood: "full", paused_at: null }).eq("user_id", herA.id).select();
    check("ele não muda o compartilhamento dela", (shareHack.data?.length ?? 0) === 0);
    const cyc = await himA.c.from("cycles").delete().eq("user_id", herA.id).select();
    check("ele não apaga ciclo dela", (cyc.data?.length ?? 0) === 0);
    const prof = await himA.c.from("profiles").update({ name: "hack" }).eq("user_id", herA.id).select();
    check("ele não altera o perfil dela", (prof.data?.length ?? 0) === 0);
    const coupleHack = await himA.c.from("profiles").update({ couple_id: cb.data.id } as never).eq("user_id", himA.id);
    check("ninguém troca o próprio couple_id", !!coupleHack.error);

    // contexto e pedidos
    const ctx = await herA.c.from("context_items").insert({ couple_id: ca.data.id, created_by: herA.id, category: "doce", title: "Brigadeiro" }).select().single();
    const ctxHack = await himA.c.from("context_items").update({ title: "hack" }).eq("id", ctx.data!.id).select();
    check("ele lê mas não edita item de contexto dela", (ctxHack.data?.length ?? 0) === 0);
    const req = await herA.c.from("requests").insert({ couple_id: ca.data.id, from_user: herA.id, to_user: himA.id, type: "colo" }).select().single();
    check("ela faz pedido pra ele", !req.error, req.error);
    const done = await himA.c.from("requests").update({ status: "done", done_at: new Date().toISOString() }).eq("id", req.data!.id).select();
    check("ele marca o pedido como feito", done.data?.length === 1, done.error);
    const reqHack = await himA.c.from("requests").update({ type: "outro" } as never).eq("id", req.data!.id);
    check("ele não reescreve o pedido dela", !!reqHack.error);
    const fake = await himA.c.from("requests").insert({ couple_id: ca.data.id, from_user: herA.id, to_user: himA.id, type: "x" });
    check("ele não cria pedido em nome dela", !!fake.error);

    // cofre: mensagem antecipada escondida até ser entregue
    await himA.c.from("vault_items").insert({ couple_id: ca.data.id, author: himA.id, for_user: herA.id, kind: "message", content: "Você é incrível" });
    let vault = await herA.c.from("vault_items").select("*").eq("kind", "message");
    check("mensagem antecipada fica guardada até o dia ruim", vault.data?.length === 0);
    const pick = await herA.c.rpc("vault_pick");
    check("vault_pick entrega a mensagem", pick.data?.[0]?.content === "Você é incrível", pick);
    vault = await herA.c.from("vault_items").select("*").eq("kind", "message");
    check("depois de entregue ela pode reler", vault.data?.length === 1);

    console.log("Etapa B");
    const qd = "2030-01-01";
    await herA.c.from("question_answers").insert({ question_id: 1, couple_id: ca.data.id, user_id: herA.id, date: qd, option: "praia" });
    let qa = await himA.c.from("question_answers").select("*").eq("date", qd);
    check("ele não vê a resposta dela antes de responder", qa.data?.length === 0, qa.data);
    await himA.c.from("question_answers").insert({ question_id: 1, couple_id: ca.data.id, user_id: himA.id, date: qd, option: "montanha" });
    qa = await himA.c.from("question_answers").select("*").eq("date", qd);
    check("depois de responder, ele vê as duas", qa.data?.length === 2, qa.data);
    const out = await himA.c.from("outings").insert({ couple_id: ca.data.id, week: qd, title: "Piquenique" }).select().single();
    await himA.c.from("outing_swipes").insert({ outing_id: out.data!.id, user_id: himA.id, yes: true });
    let m = await herA.c.from("outing_matches").select("*").eq("week", qd);
    check("sem match com um só sim", m.data?.length === 0);
    const swHack = await herA.c.from("outing_swipes").select("*").eq("user_id", himA.id);
    check("ela não vê o swipe dele", swHack.data?.length === 0);
    await herA.c.from("outing_swipes").insert({ outing_id: out.data!.id, user_id: herA.id, yes: true });
    m = await herA.c.from("outing_matches").select("*").eq("week", qd);
    check("match quando os dois dizem sim", m.data?.length === 1);
    const fakeSwipe = await himA.c.from("outing_swipes").insert({ outing_id: out.data!.id, user_id: herA.id, yes: false });
    check("ninguém vota pelo outro", !!fakeSwipe.error);

    console.log("Isolamento entre casais");
    await herB.c.from("share_settings").update({ confirmed_at: new Date().toISOString() }).eq("user_id", herB.id);
    await herB.c.from("daily_logs").insert({ user_id: herB.id, date: today, mood: 4, private_note: "segredo B" });
    for (const [name, u] of [["ele A", himA], ["ela A", herA]] as const) {
      const a = await u.c.from("partner_view_daily").select("*").eq("user_id", herB.id);
      const b = await u.c.from("context_items").select("*").eq("couple_id", cb.data.id);
      const c = await u.c.from("couples").select("*").eq("id", cb.data.id);
      const d = await u.c.from("household").select("*").eq("couple_id", cb.data.id);
      const e = await u.c.from("partner_profile").select("*").eq("couple_id", cb.data.id);
      check(`${name} não vê nada do casal B`, [a, b, c, d, e].every((r) => (r.data?.length ?? 0) === 0));
    }
    const crossReq = await himA.c.from("requests").insert({ couple_id: cb.data.id, from_user: himA.id, to_user: herB.id, type: "x" });
    check("não cria pedido para outro casal", !!crossReq.error);
    const crossTouch = await himA.c.from("touches").insert({ couple_id: ca.data.id, from_user: himA.id, to_user: herB.id, kind: "saudade" });
    check("não manda carinho para quem não é parceiro", !!crossTouch.error);

    console.log("Anônimo");
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const an = await Promise.all(["daily_logs", "partner_view_daily", "profiles", "requests", "vault_items"].map((t) => anon.from(t).select("*")));
    check("anônimo não lê nada", an.every((r) => !!r.error || (r.data?.length ?? 0) === 0), an.map((r) => r.error?.message));

    console.log("Storage");
    const own = await himA.c.storage.from("elo").upload(`${ca.data.id}/t-${run}.txt`, new Blob(["oi"]), { contentType: "text/plain" });
    check("sobe arquivo na pasta do casal", !own.error, own.error);
    const other = await himA.c.storage.from("elo").upload(`${cb.data.id}/t-${run}.txt`, new Blob(["oi"]), { contentType: "text/plain" });
    check("não sobe arquivo na pasta de outro casal", !!other.error);
    const readOther = await herB.c.storage.from("elo").download(`${ca.data.id}/t-${run}.txt`);
    check("outro casal não baixa o arquivo", !!readOther.error);
    await admin.storage.from("elo").remove([`${ca.data.id}/t-${run}.txt`]);

    // limpeza dos casais
    await admin.from("couples").delete().in("id", [ca.data.id, cb.data.id]);
  } finally {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
  console.log(`\n${passes} ok, ${failures} falhas`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
