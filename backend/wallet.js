/* ═══════════════════════════════════════════════════════════════════
 * MensLine Diamond Club — Google Wallet (tarjeta real en la billetera)
 * ───────────────────────────────────────────────────────────────────
 * Activación: 3 variables/secretos del Worker (se ponen con wrangler secret put):
 *   WALLET_ISSUER    → ID de Issuer de Google Business Console (solo dígitos)
 *   WALLET_SA_EMAIL  → email de la service account que firmó el JSON
 *   WALLET_SA_KEY    → clave PRIVADA (PEM completo, una línea con \n sin
 *                      escapes: se guarda como secreto, nunca por chat)
 * Mientras no existan → /wallet/save responde {ok:false, why:"off"}
 * y la app funciona igual (la tarjeta de la página queda de fallback).
 *
 * Flujo:
 *   saveUrl(env, client)  → URL "Guardar en Google Wallet" (JWT firmado RS256)
 *   sync(env, client)     → PATCH/PUT del Objeto → los sellos se actualizan al
 *                           instante en la pantalla de bloqueo del cliente.
 * Se llama con ctx.waitUntil desde /register /visit /redeem → no congela el NFC.
 * ═══════════════════════════════════════════════════════════════════ */
const CLASS_ID = "mensline_diamond";
const HERO = "https://santa250613.github.io/mensline-demo/assets/web/foto4.jpg";
const LOGO = "https://santa250613.github.io/mensline-demo/loyalty/logo_diamante.png";
const SCOPE = "https://www.googleapis.com/auth/walletobjects.loyalty";
const API = "https://walletobjects.googleapis.com/walletobjects/v1/loyalty";

const on = env => !!(env.WALLET_ISSUER && env.WALLET_SA_EMAIL && env.WALLET_SA_KEY);
const b64u = s => {
  const u = typeof s === "string" ? new TextEncoder().encode(s) : new Uint8Array(s);
  let b = ""; for (const c of u) b += String.fromCharCode(c);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const pem = s => String(s).replace(/\\n/g, "\n");

async function key(env) {
  const body = pem(env.WALLET_SA_KEY).replace(/-----(BEGIN|END) PRIVATE KEY-----|\s+/g, "");
  const raw = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

function classDef(env) {
  return {
    id: `${env.WALLET_ISSUER}.${CLASS_ID}`,
    issuerName: "MensLine Studio",
    programName: "Diamond Club",
    loyaltyProgram: { fieldName: "Diamantes" },
    reviewStatus: "UNDER_REVIEW",
    programLogo: { sourceUri: { uri: LOGO } },
    heroImage: { sourceUri: { uri: HERO } },
    hexBackgroundColor: "#170d05",
    linksModuleData: {
      uris: [
        { uri: "https://santa250613.github.io/mensline-demo/frontend/loyalty/", description: "Abrir mi carnet", id: "carnet" }
      ]
    }
  };
}

function objectDef(env, c) {
  const full = c.rewardPending;
  return {
    id: `${env.WALLET_ISSUER}.${CLASS_ID}_${c.phone}`,
    classId: `${env.WALLET_ISSUER}.${CLASS_ID}`,
    state: "ACTIVE",
    accountId: String(c.phone),
    accountName: c.name,
    loyaltyPoints: full
      ? { label: "Recompensa lista 💎", balance: { string: "5 de 5 · preséntate" } }
      : { label: "Diamantes", balance: { string: `${c.stamps} de 5` } }
  };
}

async function fetchJSON(url, opt) { const r = await fetch(url, opt); return r; }

/* ── Access token (para PATCH/PUT del objeto) ────────────────────── */
let tokCache = { t: "", exp: 0 };
async function token(env) {
  if (Date.now() < tokCache.exp - 60) return tokCache.t;
  const iat = Math.floor(Date.now() / 1e3);
  const j = b64u(JSON.stringify({ iss: env.WALLET_SA_EMAIL, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", exp: iat + 3600, iat }));
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const sig = b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await key(env), new TextEncoder().encode(h + "." + j)));
  const r = await fetchJSON("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${h}.${j}.${sig}`
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("oauth: " + (d.error || "sin token"));
  tokCache = { t: d.access_token, exp: Date.now() + (d.expires_in || 3500) * 1e3 };
  return tokCache.t;
}

/* ── Clase (plantilla compartida) — la subimos/actualizamos una vez ── */
async function classUpsert(env, tok) {
  const id = `/${env.WALLET_ISSUER}/${CLASS_ID}`;
  let r = await fetchJSON(API + id, { headers: { Authorization: `Bearer ${tok}` } });
  const body = classDef(env);
  if (r.ok) {
    const cur = await r.json();
    await fetchJSON(API + id, { method: "PATCH", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } else {
    await fetchJSON(API, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
}

/* ── Objeto del cliente — create si falta / PATCH si está ─────────── */
async function objUpsert(env, tok, c) {
  const o = objectDef(env, c);
  const id = `/${env.WALLET_ISSUER}/${CLASS_ID}_${c.phone}`;
  let r = await fetchJSON(API + id, { headers: { Authorization: `Bearer ${tok}` } });
  if (r.ok) {
    await fetchJSON(API + id, { method: "PATCH", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify({ loyaltyPoints: o.loyaltyPoints }) });
  } else {
    await fetchJSON(API, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify(o) });
  }
}

async function sync(env, c) {
  if (!on(env)) return;
  const tok = await token(env);
  await classUpsert(env, tok);
  await objUpsert(env, tok, c);
}

/* ── Save URL: JWT firmado RS256 → https://pay.google.com/gp/v/save/ ─ */
async function saveUrl(env, c) {
  if (!on(env)) return null;
  const tok = await token(env);
  await classUpsert(env, tok);
  await objUpsert(env, tok, c);
  const iat = Math.floor(Date.now() / 1e3);
  const claims = {
    iss: env.WALLET_SA_EMAIL, aud: "loyalty", typ: "savetowallet",
    iat, exp: iat + 1800, origins: ["santa250613.github.io"],
    payload: { loyaltyClasses: [classDef(env)], loyaltyClasses_removed: undefined, loyaltyObjects: [objectDef(env, c)] }
  };
  const h = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(claims));
  const sig = b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await key(env), new TextEncoder().encode(h + "." + p)));
  return `https://pay.google.com/gp/v/save/${h}.${p}.${sig}`;
}

export default { on, sync, saveUrl };
