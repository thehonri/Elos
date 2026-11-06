// Gera os ícones PNG do PWA a partir de um SVG próprio (Playwright pré-instalado).
import { chromium } from "playwright";
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#fbf4ee"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
<circle cx="200" cy="270" r="120" fill="none" stroke="#d0705a" stroke-width="44"/>
<circle cx="312" cy="242" r="120" fill="none" stroke="#e8a58f" stroke-width="44"/>
<path d="M256 318 C206 288 186 262 186 236 A35 35 0 0 1 256 222 A35 35 0 0 1 326 236 C326 262 306 288 256 318Z" fill="#d0705a" stroke="#fbf4ee" stroke-width="12" stroke-linejoin="round"/>
</g></svg>`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" });
const p = await b.newPage();
for (const [name, size, pad] of [["icon-192", 192, 0.92], ["icon-512", 512, 0.92], ["icon-maskable-512", 512, 0.72], ["apple-touch-icon", 180, 0.86]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0">${svg(pad).replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: false });
}
await b.close();
console.log("ok");
