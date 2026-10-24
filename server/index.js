/**
 * MensLine Diamond Club — Worker API v2 (fase 2, servidor real)
 * Cloudflare Workers + KV namespace bound as LOY_KV.
 * Secret/Var: ADMIN_PIN (solo dígitos).
 *
 * API:
 *  POST /register {name, phone}        → {ok, client, existing}
 *  POST /visit    {phone}              → +1 diamante AUTO, máx 1/día  → {ok, added, client}
 *  GET  /status?phone=                 → {ok, client}
 *  POST /stamp    {pin, phone}         → sumar extra (staff)          → {ok, stamps, reward?, code?}
 *  POST /redeem   {pin, phone|code}    → entregar recompensa, ciclo 0 → {ok, client}
 *  POST /reset    {pin, phone}         → reiniciar ciclo sin entregar → {ok, client}
 *  POST /list     {pin}                → {ok, clients[]}
 *  POST /wipe     {pin}                → borrar TODOS los clientes (demo)
 */
const GOAL = 5;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const J = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });
const clean = p => String(p || "").replace(/\D/g, "").slice(-12);
const today = () => new Date().toLocaleDateString("sv", { timeZone: "America/Bogota" });
const pub = c => ({ name: c.name, phone: c.phone, stamps: c.stamps, lastVisit: c.lastVisit || null,
                    rewardPending: !!c.rewardPending, rewardCode: c.rewardCode || null, cycles: c.cycles || 0 });

async function readStaff(env, req) {
  let body = {};
  try { body = await req.json(); } catch (_) {}
  if (String(body.pin) !== String(env.ADMIN_PIN)) return null;
  return body;
}
async function getClient(env, p) {
  return JSON.parse((await env.LOY_KV.get("client:" + p)) || "null");
}
async function setReward(env, c) {
  c.rewardPending = true;
  c.rewardCode = String(Math.floor(100000 + Math.random() * 900000));
  await env.LOY_KV.put("code:" + c.rewardCode, JSON.stringify({ phone: c.phone, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 }));
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    if (url.pathname === "/register" && req.method === "POST") {
      const { name, phone } = await req.json();
      const p = clean(phone);
      if (!name || p.length < 7) return J({ ok: false, err: "Datos incompletos" });
      const cur = await getClient(env, p);
      if (cur) { cur.name = String(name).slice(0, 30); await env.LOY_KV.put("client:" + p, JSON.stringify(cur)); return J({ ok: true, client: pub(cur), existing: true }); }
      const c = { phone: p, name: String(name).slice(0, 30), stamps: 0, cycles: 0, rewardPending: false, rewardCode: null, lastVisit: "", created: Date.now() };
      await env.LOY_KV.put("client:" + p, JSON.stringify(c));
      return J({ ok: true, client: pub(c) });
    }

    if (url.pathname === "/visit" && req.method === "POST") {
      const { phone } = await req.json();
      const p = clean(phone);
      const c = await getClient(env, p);
      if (!c) return J({ ok: false, err: "not_registered" });
      if (c.rewardPending) return J({ ok: true, added: false, waiting: true, client: pub(c) }); // 5/5 congela
      if (c.lastVisit === today()) return J({ ok: true, added: false, client: pub(c) });        // ya visitó hoy
      c.stamps++;
      if (c.stamps >= GOAL) {
        await setReward(env, c);
        c.lastVisit = today();
        await env.LOY_KV.put("client:" + p, JSON.stringify(c));
        return J({ ok: true, added: true, reward: true, client: pub(c) });
      }
      c.lastVisit = today();
      await env.LOY_KV.put("client:" + p, JSON.stringify(c));
      return J({ ok: true, added: true, client: pub(c) });
    }

    if (url.pathname === "/status" && req.method === "GET") {
      const p = clean(url.searchParams.get("phone"));
      const c = p ? await getClient(env, p) : null;
      return c ? J({ ok: true, client: pub(c) }) : J({ ok: false });
    }

    if (url.pathname === "/stamp" && req.method === "POST") {
      const body = await readStaff(env, req);
      if (!body) return J({ ok: false, err: "PIN incorrecto" }, 403);
      const p = clean(body.phone);
      const c = await getClient(env, p);
      if (!c) return J({ ok: false, err: "Cliente no registrado" });
      if (c.rewardPending) return J({ ok: false, err: "Ya tiene recompensa sin canjear (código " + c.rewardCode + ")" });
      c.stamps++;
      let reward = false;
      if (c.stamps >= GOAL) { await setReward(env, c); reward = true; }
      else c.lastVisit = today();
      await env.LOY_KV.put("client:" + p, JSON.stringify(c));
      return J({ ok: true, stamps: c.stamps, reward, client: pub(c) });
    }

    if (url.pathname === "/redeem" && req.method === "POST") {
      const body = await readStaff(env, req);
      if (!body) return J({ ok: false, err: "PIN incorrecto" }, 403);
      let p = clean(body.phone);
      if (!p && body.code) {
        const rec = JSON.parse((await env.LOY_KV.get("code:" + String(body.code).replace(/\D/g, ""))) || "null");
        p = rec ? clean(rec.phone) : "";
      }
      const c = await getClient(env, p);
      if (!c || !c.rewardPending) return J({ ok: false, err: "Sin recompensa pendiente" });
      await env.LOY_KV.delete("code:" + c.rewardCode);
      c.rewardPending = false; c.rewardCode = null; c.stamps = 0; c.lastVisit = "";
      c.cycles = (c.cycles || 0) + 1;
      await env.LOY_KV.put("client:" + p, JSON.stringify(c));
      return J({ ok: true, client: pub(c) });
    }

    if (url.pathname === "/reset" && req.method === "POST") {
      const body = await readStaff(env, req);
      if (!body) return J({ ok: false, err: "PIN incorrecto" }, 403);
      const p = clean(body.phone);
      const c = await getClient(env, p);
      if (!c) return J({ ok: false, err: "Cliente no registrado" });
      if (c.rewardCode) await env.LOY_KV.delete("code:" + c.rewardCode);
      c.stamps = 0; c.rewardPending = false; c.rewardCode = null; c.lastVisit = "";
      await env.LOY_KV.put("client:" + p, JSON.stringify(c));
      return J({ ok: true, client: pub(c) });
    }

    if (url.pathname === "/list" && req.method === "POST") {
      const body = await readStaff(env, req);
      if (!body) return J({ ok: false, err: "PIN incorrecto" }, 403);
      const page = await env.LOY_KV.list({ prefix: "client:" });
      const clients = [];
      for (const k of page.keys) {
        const c = JSON.parse(await env.LOY_KV.get(k.name));
        if (c) clients.push(pub(c));
      }
      clients.sort((a, b) => b.stamps - a.stamps);
      return J({ ok: true, clients });
    }

    if (url.pathname === "/wipe" && req.method === "POST") {
      const body = await readStaff(env, req);
      if (!body) return J({ ok: false, err: "PIN incorrecto" }, 403);
      const page = await env.LOY_KV.list({ prefix: "" });
      for (const k of page.keys) await env.LOY_KV.delete(k.name);
      return J({ ok: true, wiped: page.keys.length });
    }

    return J({ ok: false, err: "Ruta desconocida" }, 404);
  },
};