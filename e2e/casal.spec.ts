/**
 * Portão 3 — fluxos do casal em viewport de iPhone (390x844), contra o Supabase real.
 * Cria contas de teste e apaga tudo no fim.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const HIM = "e2e-him@elo.test";
const HER = `e2e-her-${Date.now().toString(36)}@elo.test`;
const PW = "E2e-senha-123!";

async function cleanup() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((u) => u.email?.startsWith("e2e-"))) {
    const { data: p } = await admin.from("profiles").select("couple_id").eq("user_id", u.id).maybeSingle();
    await admin.auth.admin.deleteUser(u.id);
    if (p?.couple_id) await admin.from("couples").delete().eq("id", p.couple_id);
  }
}

test.describe.configure({ mode: "serial" });
let him: Page, her: Page, ctxHim: BrowserContext, ctxHer: BrowserContext;
let inviteUrl = "";
let herId = "";

test.beforeAll(async ({ browser }) => {
  await cleanup();
  ctxHim = await browser.newContext();
  ctxHer = await browser.newContext();
  him = await ctxHim.newPage();
  her = await ctxHer.newPage();
});
test.afterAll(async () => {
  await ctxHim?.close();
  await ctxHer?.close();
  await cleanup();
});

async function finishOnboarding(p: Page, role: "him" | "her") {
  await p.getByRole("button", { name: /Já instalei|Continuar/ }).first().click();
  if (role === "him") {
    await expect(p.getByTestId("invite-url")).toBeVisible();
    inviteUrl = (await p.getByTestId("invite-url").textContent())!.trim();
    await p.getByRole("button", { name: "Continuar" }).click();
  } else {
    await p.getByRole("button", { name: "Pular por enquanto" }).click();
    await expect(p.getByRole("heading", { name: "O que ele pode ver" })).toBeVisible();
    await p.getByRole("button", { name: "Está bom assim" }).click();
  }
  // gatos
  if (role === "him") {
    await p.getByLabel("Nome do primeiro gato").fill("Mingau");
    await p.getByLabel("Nome do segundo gato").fill("Paçoca");
  }
  await p.getByRole("button", { name: "Continuar" }).click();
  // push
  await p.getByRole("button", { name: "Agora não" }).click();
  // contexto: toca 10
  const chips = p.locator("button.chip");
  for (let i = 0; i < 10; i++) await chips.nth(i).click();
  await p.getByRole("button", { name: "Pronto!" }).click();
  await expect(p.getByRole("heading", { name: "Nós" })).toBeVisible();
}

test("ele cria o casal e gera o convite", async () => {
  await him.goto("/entrar");
  await him.getByRole("button", { name: "Criar o casal (primeira vez)" }).click();
  await him.getByLabel("Seu nome").fill("Emanuel");
  await him.getByLabel("E-mail").fill(HIM);
  await him.getByLabel("Senha").fill(PW);
  await him.getByRole("button", { name: "Criar nosso casal" }).click();
  await finishOnboarding(him, "him");
  expect(inviteUrl).toContain("/convite/");
});

test("convite e entrada dela (compartilhamento antes de qualquer dado)", async () => {
  await her.goto(new URL(inviteUrl).pathname);
  await expect(her.getByRole("heading", { name: /Emanuel te chamou/ })).toBeVisible();
  await her.getByLabel("Seu nome").fill("Ana");
  await her.getByLabel("E-mail").fill(HER);
  await her.getByLabel("Crie uma senha").fill(PW);
  await her.getByRole("button", { name: "Entrar no Elo" }).click();
  await expect(her.getByRole("heading", { name: /Tela de Início/ })).toBeVisible();
  // antes de confirmar o compartilhamento, nada dela é visível para ele
  const { data: u } = await admin.from("profiles").select("user_id").eq("name", "Ana").order("created_at", { ascending: false }).limit(1).single();
  herId = u!.user_id;
  const { data: ss } = await admin.from("share_settings").select("confirmed_at").eq("user_id", herId).single();
  expect(ss!.confirmed_at).toBeNull();
  await finishOnboarding(her, "her");
  const { data: ss2 } = await admin.from("share_settings").select("confirmed_at").eq("user_id", herId).single();
  expect(ss2!.confirmed_at).not.toBeNull();
});

test("check-in em 2 toques", async () => {
  await her.goto("/checkin");
  await her.getByTestId("face-4").click(); // toque 1: salvou
  await her.getByTestId("skip").click(); // toque 2: pular
  await her.waitForURL(/\/(apoio|nos)/);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const { data } = await admin.from("daily_logs").select("mood").eq("user_id", herId).eq("date", today).single();
  expect(data!.mood).toBe(4);
  // ele vê o rosto dela
  await him.goto("/nos");
  await expect(him.getByTestId("partner-face")).toContainText("bem");
});

test("igual ontem", async () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const y = new Date(new Date(today + "T12:00:00Z").getTime() - 86400000).toISOString().slice(0, 10);
  const { data: hp } = await admin.from("profiles").select("user_id").eq("name", "Emanuel").order("created_at", { ascending: false }).limit(1).single();
  await admin.from("daily_logs").insert({ user_id: hp!.user_id, date: y, mood: 2, energy: 2, wants: ["casa"] });
  await him.goto("/checkin");
  await him.getByTestId("same-as-yesterday").click();
  await him.waitForURL(/\/(apoio|nos)/);
  const { data } = await admin.from("daily_logs").select("mood, energy, wants").eq("user_id", hp!.user_id).eq("date", today).single();
  expect(data).toEqual({ mood: 2, energy: 2, wants: ["casa"] });
});

test("pedido chega ao outro e é marcado feito", async () => {
  await her.goto("/pedidos");
  await her.getByTestId("ask-chocolate").click();
  await expect(her.getByText("Pedido enviado")).toBeVisible();
  await him.goto("/nos");
  const req = him.getByTestId("open-request").filter({ hasText: "Traz um chocolate" });
  await expect(req).toBeVisible();
  await req.getByTestId("request-done").click();
  await expect(req).toHaveCount(0);
});

test("carinho chega com animação", async () => {
  await her.goto("/nos");
  await expect(her.getByRole("heading", { name: "Nós" })).toBeVisible();
  await her.waitForTimeout(1500); // realtime conectar
  await him.goto("/nos");
  await him.getByTestId("touch-saudade").click();
  await expect(her.getByTestId("incoming-touch")).toContainText("Saudade");
  await her.reload();
  await expect(her.getByTestId("last-touch")).toContainText("Saudade");
});

test("pausar compartilhamento corta o acesso dele na hora", async () => {
  await her.goto("/nos");
  await her.getByTestId("pause-toggle").click();
  await expect(her.getByText(/compartilhamento está pausado/)).toBeVisible();
  await him.goto("/nos");
  await expect(him.getByTestId("partner-face")).toContainText("compartilhamento pausado");
  await her.getByTestId("pause-toggle").click();
  await him.reload();
  await expect(him.getByTestId("partner-face")).toContainText("bem");
});

test("rota do Atalho: token válido e inválido", async ({ request }) => {
  await her.goto("/ajustes");
  await her.getByRole("button", { name: "Gerar token pessoal" }).click();
  const token = (await her.getByTestId("new-token").textContent())!.trim();
  const ok = await request.post("/api/checkin/quick", { headers: { Authorization: `Bearer ${token}` }, data: { mood: 5 } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).mood).toBe(5);
  const bad = await request.post("/api/checkin/quick", { headers: { Authorization: "Bearer elo_invalido" }, data: { mood: 3 } });
  expect(bad.status()).toBe(401);
  const none = await request.post("/api/checkin/quick", { data: { mood: 3 } });
  expect(none.status()).toBe(401);
  const badMood = await request.post("/api/checkin/quick", { headers: { Authorization: `Bearer ${token}` }, data: { mood: 9 } });
  expect(badMood.status()).toBe(400);
  // revogado deixa de funcionar
  await her.getByRole("button", { name: "revogar" }).first().click();
  await expect(her.getByText("revogado")).toBeVisible();
  const revoked = await request.post("/api/checkin/quick", { headers: { Authorization: `Bearer ${token}` }, data: { mood: 3 } });
  expect(revoked.status()).toBe(401);
});
