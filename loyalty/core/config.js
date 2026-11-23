/* ══════ CORE / CONFIG — el "cerebro" compartido de MensLine Diamond Club ══════ */

/* SERVIDOR REAL (Cloudflare) — PC y celulares comparten la misma base */
export const API = "https://mensline-diamond-club.santa250613.workers.dev";
export const GOAL = 5;
export const $ = id => document.getElementById(id);

/* Cada diamante = una recompensa (el dueño las ajusta en el Excel del Drive) */
export const REWARDS = [
  { n: 1, t: "Corte gratis" },
  { n: 2, t: "Masaje" },
  { n: 3, t: "Uñas y pies" },
  { n: 4, t: "Descarga muscular" },
  { n: 5, t: "Combo completo" }
];
