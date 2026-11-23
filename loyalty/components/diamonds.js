/* ══════ COMPONENTE — diamantes: sello grande, gemas de la escalera y pop ══════ */
import { $, REWARDS } from "../core/config.js";

export const DM = earned => `<svg class="dm ${earned ? 'earned' : ''}" viewBox="0 0 64 66">
 <defs>
  <linearGradient id="dmG" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stop-color="#fdf0c8"/><stop offset=".28" stop-color="#f0cf80"/>
   <stop offset=".55" stop-color="#d9a94e"/><stop offset=".8" stop-color="#a97e2c"/>
   <stop offset="1" stop-color="#8a6420"/>
  </linearGradient>
  <linearGradient id="dmL" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#fffbe9" stop-opacity=".95"/><stop offset="1" stop-color="#f6d993" stop-opacity=".25"/>
  </linearGradient>
  <radialGradient id="dmS" cx=".38" cy=".25" r=".55">
   <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
 </defs>
 ${earned
    ? `<path d="M20 10 H44 L55 24 L32 58 L9 24 Z" fill="url(#dmG)" stroke="#ffe9ae" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M9 24 H55 M20 10 L26 24 L32 58 L38 24 L44 10 M26 24 L32 10 L38 24" fill="none" stroke="#8a6420" stroke-width=".8" opacity=".6" stroke-linejoin="round"/>
      <path d="M20 10 L26 24 L32 10" fill="#fff3cf" opacity=".75"/>
      <ellipse cx="24" cy="19" rx="10" ry="6" fill="url(#dmS)"/>
      <path d="M50 6 l1.6 3.6 L55 11 l-3.4 1.4 L50 16 l-1.6-3.6 L45 11 l3.4-1.4 Z" fill="#fff8dd" opacity=".95"/>
      <circle cx="14" cy="6" r="1.4" fill="#fff8dd" opacity=".85"/>`
    : `<path d="M20 10 H44 L55 24 L32 58 L9 24 Z" fill="rgba(232,184,86,.05)" stroke="rgba(170,128,58,.65)" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M9 24 H55 M20 10 L26 24 L32 58 L38 24 L44 10 M26 24 L32 10 L38 24" fill="none" stroke="rgba(170,128,58,.4)" stroke-width=".9" stroke-linejoin="round"/>`}
</svg>`;

/* diamante de marca line-art: .o = silueta, .f = facetas */
export const GEM = `<svg class="gem" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gmG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fdf0c8"/><stop offset=".3" stop-color="#f0cf80"/>
      <stop offset=".6" stop-color="#d9a94e"/><stop offset="1" stop-color="#9a7326"/>
    </linearGradient>
  </defs>
  <path class="o" d="M20 11H44L55 25L32 56L9 25Z"/>
  <path class="f" d="M9 25H55M20 11L26 25L32 56L38 25L44 11M26 25L32 11L38 25"/>
  <path class="h" d="M20 11L26 25L32 11Z"/>
  <path class="s" d="M50 4.5l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3Z"/>
</svg>`;

/* Escalera: qué recompensa toca en cada diamante */
export function drawLadder(stamps) {
  const el = $("ladder"); if (!el) return;
  el.innerHTML = REWARDS.map(r => {
    const done = r.n <= stamps, here = r.n === stamps + 1;
    return `<div class="step ${here ? 'here' : ''} ${done ? 'done' : ''}">
      ${GEM}
      <div><div class="n"><span class="k">${r.n}</span>${r.t}</div>
      <div class="s2">${done ? "Recompensa disponible" : here ? "Tu próximo diamante" : "Por referir a " + r.n + (r.n === 1 ? " amigo" : " amigos")}</div></div>
    </div>`;
  }).join("");
}

export function popIndex(i) {
  const el = document.querySelectorAll("#dmRow svg")[i]; if (el) el.classList.add("pop");
}
