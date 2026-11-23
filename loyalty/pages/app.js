/* ══════ PÁGINA — TypeScript (lógica del cliente): estado, render y ciclo en vivo ══════ */
import { $, GOAL } from "../core/config.js";
import { api } from "../services/api.js";
import { saveWallet } from "../services/wallet.js";
import { DM, drawLadder, popIndex } from "../components/diamonds.js";
import { renderVcard } from "../components/vcard.js";

function statusText(c) {
  if (c.rewardPending) return "CICLO COMPLETO 💎";
  return `${c.stamps} de ${GOAL} diamantes`;
}

function render(c) {
  $("regView").classList.add("hidden");
  $("stView").classList.remove("hidden");
  renderVcard(c);
  $("hello").textContent = `Hola, ${c.name} · Membresía #${String(c.phone).slice(-4)}`;
  $("statusMsg").style.color = "#b39b78";
  if (c.rewardPending) {
    $("dmRow").innerHTML = Array.from({ length: GOAL }, () => DM(true)).join("");
    $("prog").textContent = statusText(c);
    $("barFill").style.width = "100%";
    $("rewardBox").classList.remove("hidden");
    $("rewardCode").textContent = c.rewardCode;
    if (!sessionStorage.getItem("ml_rw")) {
      sessionStorage.setItem("ml_rw", "1");
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("💎 ¡Recompensa lista!", { body: "Código: " + c.rewardCode });
    }
  } else {
    $("rewardBox").classList.add("hidden");
    $("dmRow").innerHTML = Array.from({ length: GOAL }, (_, i) => DM(i < c.stamps)).join("");
    $("prog").textContent = statusText(c);
    $("barFill").style.width = (c.stamps / GOAL * 100) + "%";
  }
  drawLadder(c.rewardPending ? GOAL : c.stamps);
}

/* ══ EN VIVO: el carnet del cliente se actualiza solo (cada 4 s) cuando el staff
   suma diamantes, entrega la recompensa o reinicia el ciclo desde el panel ══ */
let ME = null, lastSig = "";
const sig = c => [c.stamps, c.rewardPending ? 1 : 0, c.rewardCode || ""].join("|");

async function live() {
  if (!ME) return;
  const s = await api("/status?phone=" + ME.phone);
  if (!s.ok || !s.client) return;
  const c = s.client;
  if (sig(c) !== lastSig) {
    const prev = ME.stamps;
    ME = c; lastSig = sig(c);
    render(c);
    if (c.rewardPending && c.stamps === prev && prev === GOAL) {
      // el staff entregó la recompensa → ciclo nuevo, celebrar el reinicio
      $("statusMsg").style.color = "#8fd48f";
      $("statusMsg").textContent = "🎁 Recompensa entregada. ¡A ganar diamantes otra vez!";
      popIndex(0);
    } else if (c.stamps > prev) {
      popIndex(c.stamps - 1);
      $("statusMsg").style.color = "#8fd48f";
      $("statusMsg").textContent = "✨ Diamante " + c.stamps + "/" + GOAL + " registrado por tu visita de hoy";
    } else if (c.stamps < prev && !c.rewardPending) {
      $("statusMsg").style.color = "#b39b78";
      $("statusMsg").textContent = "El staff reinició tu ciclo. Empieza de nuevo 💎";
    }
  }
}
setInterval(live, 4000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) live(); });

/* ⬇️ AUTO: abrir la app (tocar la tarjeta NFC) = +1 diamante, MÁXIMO 1 POR DÍA — lo decide el servidor */
async function autoVisit(c) {
  if (c.rewardPending) return;
  const v = await api("/visit", { phone: c.phone });
  if (!v.ok) return;
  try { Notification.requestPermission(); } catch (_) {}
  render(v.client);
  if (v.added) {
    if (v.reward) {
      popIndex(GOAL - 1);
    } else {
      popIndex(v.client.stamps - 1);
      $("statusMsg").style.color = "#8fd48f";
      $("statusMsg").textContent = "✨ Diamante " + v.client.stamps + "/" + GOAL + " registrado por tu visita de hoy";
    }
  } else if (!v.waiting) {
    $("statusMsg").textContent = "✨ Ya registramos tu visita de hoy. ¡Nos vemos mañana!";
  }
}

async function boot() {
  drawLadder(0); // la escalera se ve desde un inicio, con o sin carnet
  const ph = localStorage.getItem("ml_self");
  if (!ph) { $("regView").classList.remove("hidden"); return; }
  const s = await api("/status?phone=" + ph);
  if (s.ok && s.client) { ME = s.client; lastSig = sig(s.client); render(s.client); autoVisit(s.client); }
  else localStorage.removeItem("ml_self");
}

$("regBtn").onclick = async () => {
  const name = $("regName").value.trim();
  const phone = $("regPhone").value.replace(/\D/g, "");
  if (!name || phone.length < 7) { $("regMsg").textContent = "Completa nombre y celular"; return; }
  $("regBtn").disabled = true;
  const r = await api("/register", { name, phone });
  $("regBtn").disabled = false;
  if (!r.ok) { $("regMsg").textContent = r.err || "Error, intenta de nuevo"; return; }
  localStorage.setItem("ml_self", r.client.phone);
  ME = r.client; lastSig = sig(r.client);
  $("regMsg").textContent = "¡Listo, " + name + "! Ya eres del Diamond Club 💎";
  render(r.client);
  autoVisit(r.client);   // el registro cuenta como la primera visita
};

/* botón de Wallet de la vcard (antes inline; ahora ligado aquí) */
$("vcWallet").addEventListener("click", function () { saveWallet(ME ? ME.phone : "", this); });

boot();
