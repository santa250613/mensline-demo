/* ══════ SERVICIO — el mensajero que conecta con el backend (Cloudflare Worker) ══════ */
import { API } from "../core/config.js";

export async function api(path, body) {
  const r = await fetch(API + path, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  return r.json();
}
