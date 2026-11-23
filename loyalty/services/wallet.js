/* ══════ SERVICIO — pase real en Google Wallet (se consulta una vez por cliente) ══════ */
import { $, API } from "../core/config.js";

const walletState = {};

export async function walletCheck(c) {
  if (walletState[c.phone] !== undefined) { $("vcWallet").style.display = walletState[c.phone] ? "block" : "none"; return; }
  walletState[c.phone] = false;
  try {
    const r = await (await fetch(API + "/wallet/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: c.phone }) })).json();
    walletState[c.phone] = !!r.ok && !!r.url;
  } catch (e) {}
  $("vcWallet").style.display = walletState[c.phone] ? "block" : "none";
}

export async function saveWallet(phone, btn) {
  btn.disabled = true;
  try {
    const r = await (await fetch(API + "/wallet/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) })).json();
    if (r.ok && r.url) { location.href = r.url; return; }
    btn.textContent = "WALLET AÚN NO CONFIGURADO ⚙";
  } catch (e) { btn.textContent = "ERROR, INTENTA DE NUEVO"; }
  setTimeout(() => { btn.disabled = false; btn.textContent = "⬇ GUARDAR EN GOOGLE WALLET"; }, 2500);
}
