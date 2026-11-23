/* ══════ COMPONENTE — tarjeta virtual del miembro (look passebook) ══════ */
import { $, GOAL } from "../core/config.js";
import { walletCheck } from "../services/wallet.js";

export function renderVcard(c) {
  const v = $("vcard");
  $("vname").textContent = c.name;
  $("vmeta").textContent = "MEMBRESÍA Nº " + String(c.phone).slice(-4);
  $("vcyc").textContent = "CICLO " + ((Number(c.cycles) || 0) + 1);
  const dots = Array.from({ length: GOAL }, (_, i) => `<i class="${(c.rewardPending ? GOAL : c.stamps) > i ? 'on' : ''}"></i>`).join("");
  if ($("vdots").innerHTML !== dots) $("vdots").innerHTML = dots;
  $("vcount").textContent = (c.rewardPending ? GOAL : c.stamps) + " / " + GOAL;
  v.classList.remove("hidden");
  walletCheck(c);
}
