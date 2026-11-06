// Portão 4: abre a produção e confirma login, manifest, service worker e push de teste.
import { chromium } from "playwright";
const BASE = process.argv[2] ?? "https://elo-eta-pied.vercel.app";
const OUT = process.argv[3] ?? ".";
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" });
const results = {};
async function login(email, shot) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  await ctx.grantPermissions(["notifications"], { origin: BASE });
  const p = await ctx.newPage();
  await p.goto(BASE + "/entrar");
  await p.getByLabel("E-mail").fill(email);
  await p.getByLabel("Senha").fill("demo-elo-2026");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.getByRole("heading", { name: "Nós" }).waitFor({ timeout: 30000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/${shot}-nos.png`, fullPage: true });
  return { ctx, p };
}
const { p } = await login("demo-ele@elo.test", "ele");
results.login = true;
results.manifest = await p.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); if (!l) return null; const r = await fetch(l.href); return r.ok && (await r.json()).display; });
results.sw = await p.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 15000))]); return r ? r.scope : null; });
results.push = await p.evaluate(async () => {
  try {
    const { enable } = { enable: null };
    const reg = await navigator.serviceWorker.ready;
    const key = document.documentElement.dataset.vapid;
    return { permission: Notification.permission, hasPushManager: !!reg.pushManager, key: !!key };
  } catch (e) { return String(e); }
});
// ativa via UI de Ajustes e manda o push de teste
await p.goto(BASE + "/ajustes");
await p.getByRole("button", { name: "Ativar" }).click();
await p.waitForTimeout(4000);
results.pushStatus = await p.locator("text=Neste aparelho").textContent();
await p.getByRole("button", { name: "Enviar teste" }).click();
await p.waitForTimeout(3000);
results.pushToast = await p.locator('[role="status"]').last().textContent().catch(() => null);
await p.screenshot({ path: `${OUT}/ele-ajustes.png`, fullPage: false });
const her = await login("demo-ela@elo.test", "ela");
await her.p.goto(BASE + "/calendario");
await her.p.waitForTimeout(2500);
await her.p.screenshot({ path: `${OUT}/ela-calendario.png`, fullPage: true });
await her.p.goto(BASE + "/checkin");
await her.p.waitForTimeout(1500);
await her.p.screenshot({ path: `${OUT}/ela-checkin.png` });
console.log(JSON.stringify(results, null, 1));
await b.close();
