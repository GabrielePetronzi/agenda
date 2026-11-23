/* Ponte fra l'agenda e il calendario iCloud, nei due sensi.

   Gira come Cloudflare Worker ogni pochi minuti (Cron Trigger). Legge dal
   gist dell'agenda calendario.json (gli eventi che l'app vuole nel
   calendario e le modifiche che ha gia' letto), legge il calendario iCloud
   via CalDAV, e:
   - scrive nel calendario i blocchi nuovi o cambiati nell'app, e toglie
     quelli che nell'app non ci sono piu';
   - quello che cambi nel calendario (sposti, accorci, cancelli, aggiungi un
     evento) lo lascia all'app in ponte.json: e' l'app ad applicarlo, perche'
     solo lei sa cos'e' un blocco. Finche' l'app non l'ha letto, l'evento
     cambiato resta com'e'.
   Dal calendario non passa mai una spunta: le regole stanno nell'app
   (calApplica in index.html).

   Variabili da impostare nel Worker (Settings → Variables, come Secret):
     GITHUB_TOKEN       lo stesso token col permesso gist che usa l'app
     GIST_ID            l'id del gist (in "Sincronizza dispositivi")
     ICLOUD_UTENTE      l'Apple ID (email)
     ICLOUD_PASSWORD    una password per app, da account.apple.com
     PONTE_CHIAVE       una parola a caso: serve per lanciarlo a mano
   Facoltative: CALENDARIO (nome, di base "Agenda studio"), FUSO (di base
   "Europe/Rome"). Istruzioni passo per passo in ponte/LEGGIMI.md. */

const CAL_NOME = "Agenda studio";
const FUSO = "Europe/Rome";
/* Il piano gratuito di Cloudflare concede 50 richieste per giro: le
   scritture nel calendario stanno sotto, il resto arriva al giro dopo. */
const MAX_SCRITTURE = 35;
const NOSTRO = /^agenda-/;            /* gli uid degli eventi che scrive l'app */
const RISCRIVI_STATO_OGNI = 3600e3;   /* il "sono vivo" anche senza cambiamenti */

export default {
  async scheduled(evento, env, ctx) { ctx.waitUntil(giro(env)); },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!env.PONTE_CHIAVE || u.searchParams.get("chiave") !== env.PONTE_CHIAVE)
      return new Response("Niente qui.", { status: 404 });
    const log = await giro(env);
    return new Response(JSON.stringify(log, null, 2),
      { headers: { "content-type": "application/json; charset=utf-8" } });
  }
};

/* ---------------- un giro ---------------- */
async function giro(env) {
  const log = { inizio: new Date().toISOString(), scritti: 0, rimandati: 0, riporti: 0, note: [] };
  let stato = null, primaStato = "";
  try {
    for (const k of ["GITHUB_TOKEN", "GIST_ID", "ICLOUD_UTENTE", "ICLOUD_PASSWORD"])
      if (!env[k]) throw new Error("manca la variabile " + k);
    const gist = await gh(env, "GET", "/gists/" + env.GIST_ID);
    const exp = await leggiFile(gist, "calendario.json");
    if (!exp) { log.note.push("nel gist manca calendario.json: apri l'agenda e sincronizza"); return log; }
    stato = (await leggiFile(gist, "ponte.json")) || {};
    primaStato = JSON.stringify(senzaGiro(stato));
    const dav = new Dav(env.ICLOUD_UTENTE, env.ICLOUD_PASSWORD);
    const calHref = await trovaCalendario(dav, stato, env.CALENDARIO || CAL_NOME);
    const dalMs = daGiorno(exp.dal);
    const eventi = await dav.eventi(calHref, dalMs, env.FUSO || FUSO);
    const piano = decidi(exp, stato, eventi, dalMs);
    stato = piano.stato;
    log.riporti = stato.riporti.length;
    for (const op of piano.ops) {
      if (log.scritti >= MAX_SCRITTURE) { log.rimandati++; continue; }
      log.scritti++;
      try { await esegui(dav, calHref, op, stato.base); }
      catch (e) { log.note.push(op.tipo + " " + op.uid + ": " + (e.message || e)); }
    }
  } catch (e) {
    log.errore = String(e.message || e);
  }
  /* lo stato si riscrive quando cambia, o una volta l'ora per dire all'app
     che il ponte e' vivo: a ogni giro sarebbero trecento revisioni al giorno */
  try {
    stato = stato || {};
    const vecchio = stato.giro || {};
    const giroNuovo = { ts: Date.now(), scritti: log.scritti, rimandati: log.rimandati,
      errore: log.errore || null, note: log.note.slice(0, 5) };
    const cambiato = JSON.stringify(senzaGiro(stato)) !== primaStato ||
      (vecchio.errore || null) !== giroNuovo.errore;
    if (cambiato || !vecchio.ts || Date.now() - vecchio.ts > RISCRIVI_STATO_OGNI) {
      stato.giro = giroNuovo;
      await gh(env, "PATCH", "/gists/" + env.GIST_ID,
        { files: { "ponte.json": { content: JSON.stringify(stato) } } });
      log.statoScritto = true;
    }
  } catch (e) {
    log.errore = (log.errore ? log.errore + " · " : "") + "scrittura gist: " + (e.message || e);
  }
  return log;
}
function senzaGiro(s) { const o = Object.assign({}, s); delete o.giro; return o; }

/* ---------------- la decisione (pura, provata in test/ponte.js) ----------------
   exp: calendario.json dell'app {dal, eventi:[{uid,s,e,t,d}], letti:{id:preso}}
   stato: ponte.json {base:{uid:{s,e,t,d,href,etag}}, riporti:[], ignorati:{}, cal}
   cal: gli eventi letti da iCloud [{uid,s,e,t,href,etag,tuttoGiorno,ripetuto}]
   base e' l'ultima versione di ogni evento che il ponte ha scritto o visto:
   un evento diverso da base l'hai cambiato tu nel calendario, un evento
   dell'app diverso da base l'hai cambiato nell'agenda. */
function decidi(exp, stato, cal, dalMs) {
  const base = Object.assign({}, stato.base || {});
  const ignorati = {};
  const letti = exp.letti || {};
  const E = {}; (exp.eventi || []).forEach(x => { E[x.uid] = x; });
  const C = {}; cal.forEach(x => { if (x.uid) C[x.uid] = x; });
  const ops = [], forza = {}, gestiti = {};
  Object.keys(stato.ignorati || {}).forEach(u => { if (C[u]) ignorati[u] = 1; });

  /* niente calendario ma tanti eventi attesi: piuttosto che credere che tu
     abbia cancellato tutto, si ferma */
  const attesi = Object.keys(base).filter(u => base[u].e >= dalMs).length;
  if (!cal.length && attesi > 5) throw new Error("il calendario risulta vuoto: non tocco niente");

  /* 1. le modifiche che l'app ha letto */
  let riporti = [];
  (stato.riporti || []).forEach(r => {
    if (!(r.id in letti)) { riporti.push(r); return; }
    const preso = letti[r.id];
    if (r.tipo === "nuovo") {
      /* l'app ha fatto il suo blocco: l'evento scritto a mano lascia il
         posto a quello dell'app, che arriva con questo stesso giro */
      if (preso && C[r.uid]) ops.push({ tipo: "cancella", uid: r.uid, href: C[r.uid].href, etag: C[r.uid].etag });
      else if (!preso && C[r.uid]) ignorati[r.uid] = 1;
      gestiti[r.uid] = 1;
    } else if (!preso) forza[r.uid] = 1;    /* l'app non l'ha presa: torna com'e' nell'app */
  });

  /* 2. quelle ancora da leggere seguono il calendario, se l'hai cambiato ancora */
  const attesa = {};
  riporti = riporti.map(r => {
    const c = C[r.uid];
    if (r.tipo === "nuovo") {
      if (!c) return null;
      if (c.s !== r.s || c.e !== r.e || c.t !== r.t) r = riporto("nuovo", r.uid, c);
    } else if (r.tipo === "sposta") {
      if (!c) r = riporto("via", r.uid);
      else if (c.s !== r.s || c.e !== r.e) r = riporto("sposta", r.uid, c);
    } else if (r.tipo === "via") {
      if (c) {
        const b = base[r.uid];
        if (b && (c.s !== b.s || c.e !== b.e)) r = riporto("sposta", r.uid, c);
        else return null;                     /* e' tornato com'era */
      }
    }
    attesa[r.uid] = 1;
    return r;
  }).filter(Boolean);

  /* 3. evento per evento */
  const uids = new Set([...Object.keys(E), ...Object.keys(base), ...Object.keys(C)]);
  for (const uid of uids) {
    if (attesa[uid] || gestiti[uid]) continue;
    const e = E[uid], b = base[uid], c = C[uid];
    if (!b) {
      if (c && !e) {
        if (NOSTRO.test(uid)) { ops.push({ tipo: "cancella", uid, href: c.href, etag: c.etag }); continue; }
        if (ignorati[uid] || c.tuttoGiorno || c.ripetuto || !(c.e > c.s)) continue;
        riporti.push(riporto("nuovo", uid, c)); continue;
      }
      if (c && e) {
        if (c.s !== e.s || c.e !== e.e || c.t !== e.t) ops.push({ tipo: "aggiorna", uid, ev: e, href: c.href, etag: c.etag });
        else base[uid] = Object.assign({}, e, { href: c.href, etag: c.etag });
        continue;
      }
      if (e) ops.push({ tipo: "crea", uid, ev: e });
      continue;
    }
    if (!c) {
      if (b.e < dalMs || !e) { delete base[uid]; continue; }
      if (forza[uid]) { delete base[uid]; ops.push({ tipo: "crea", uid, ev: e }); continue; }
      riporti.push(riporto("via", uid)); continue;
    }
    if (forza[uid]) {
      if (e) ops.push({ tipo: "aggiorna", uid, ev: e, href: c.href, etag: c.etag });
      else ops.push({ tipo: "cancella", uid, href: c.href, etag: c.etag });
      continue;
    }
    if (c.s !== b.s || c.e !== b.e) {           /* l'hai cambiato nel calendario */
      if (e) riporti.push(riporto("sposta", uid, c));
      else ops.push({ tipo: "cancella", uid, href: c.href, etag: c.etag });
      continue;
    }
    if (!e) {
      if (b.e < dalMs) { delete base[uid]; continue; }
      ops.push({ tipo: "cancella", uid, href: c.href, etag: c.etag });
      continue;
    }
    if (b.s !== e.s || b.e !== e.e || b.t !== e.t || (b.d || "") !== (e.d || "") || c.t !== e.t)
      ops.push({ tipo: "aggiorna", uid, ev: e, href: c.href, etag: c.etag });
  }
  return { ops, stato: { v: 1, base, riporti, ignorati, cal: stato.cal || null, giro: stato.giro } };
}
function riporto(tipo, uid, c) {
  const r = { tipo, uid };
  if (c) { r.s = c.s; r.e = c.e; if (tipo === "nuovo") r.t = c.t; }
  r.id = [tipo, uid, c ? c.s : "", c ? c.e : "", tipo === "nuovo" ? c.t : ""].join("|");
  return r;
}

async function esegui(dav, calHref, op, base) {
  if (op.tipo === "crea") {
    const href = new URL(nomeFile(op.uid), calHref).href;
    const etag = await dav.put(href, icsEvento(op.ev), { "If-None-Match": "*" });
    base[op.uid] = Object.assign({}, op.ev, { href, etag });
  } else if (op.tipo === "aggiorna") {
    const etag = await dav.put(op.href, icsEvento(op.ev), op.etag ? { "If-Match": op.etag } : {});
    base[op.uid] = Object.assign({}, op.ev, { href: op.href, etag });
  } else if (op.tipo === "cancella") {
    await dav.del(op.href, op.etag);
    delete base[op.uid];
  }
}
const nomeFile = uid => uid.replace(/[^A-Za-z0-9_-]/g, "_") + ".ics";

/* ---------------- GitHub ---------------- */
async function gh(env, method, path, body) {
  const r = await fetch("https://api.github.com" + path, {
    method,
    headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json",
      "User-Agent": "agenda-ponte", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 401) throw new Error("GitHub rifiuta il token");
  if (!r.ok) throw new Error("GitHub " + r.status);
  return r.json();
}
async function leggiFile(gist, nome) {
  const f = gist.files && gist.files[nome];
  if (!f) return null;
  const t = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
  return JSON.parse(t);
}

/* ---------------- CalDAV (iCloud) ---------------- */
class Dav {
  constructor(utente, password) { this.auth = "Basic " + btoa(utente + ":" + password); }
  async req(method, url, body, headers) {
    const r = await fetch(url, { method, body,
      headers: Object.assign({ Authorization: this.auth, "User-Agent": "agenda-ponte" }, headers || {}) });
    if (r.status === 401 || r.status === 403)
      throw new Error("iCloud rifiuta l'accesso: controlla Apple ID e password per app");
    return r;
  }
  async xml(method, url, depth, body) {
    const r = await this.req(method, url, body,
      { Depth: String(depth), "Content-Type": "application/xml; charset=utf-8" });
    if (r.status !== 207 && !r.ok) throw new Error(method + " " + r.status);
    return r.text();
  }
  async eventi(calHref, dalMs, fuso) {
    const t = await this.xml("REPORT", calHref, 1,
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
      '<d:prop><d:getetag/><c:calendar-data/></d:prop>' +
      '<c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">' +
      '<c:time-range start="' + utc(dalMs) + '"/>' +
      '</c:comp-filter></c:comp-filter></c:filter></c:calendar-query>');
    const out = [];
    for (const resp of risposte(t)) {
      const dati = testo(dentro(resp, "calendar-data"));
      if (!dati) continue;
      const ev = leggiIcs(dati, fuso);
      if (!ev || !ev.uid) continue;
      ev.href = new URL(testo(dentro(resp, "href")), calHref).href;
      ev.etag = testo(dentro(resp, "getetag")) || null;
      out.push(ev);
    }
    return out;
  }
  async put(href, corpo, headers) {
    const r = await this.req("PUT", href, corpo,
      Object.assign({ "Content-Type": "text/calendar; charset=utf-8" }, headers));
    if (r.status === 412) throw new Error("cambiato nel frattempo, riprovo al giro dopo");
    if (!r.ok) throw new Error("PUT " + r.status);
    return r.headers.get("ETag");
  }
  async del(href, etag) {
    const r = await this.req("DELETE", href, null, etag ? { "If-Match": etag } : {});
    if (r.status === 404) return;
    if (r.status === 412) throw new Error("cambiato nel frattempo, riprovo al giro dopo");
    if (!r.ok) throw new Error("DELETE " + r.status);
  }
}
const PROPFIND = p => '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop>' + p + '</d:prop></d:propfind>';
async function trovaCalendario(dav, stato, nome) {
  if (stato.cal && stato.cal.href && stato.cal.nome === nome) return stato.cal.href;
  const radice = "https://caldav.icloud.com/";
  let t = await dav.xml("PROPFIND", radice, 0, PROPFIND("<d:current-user-principal/>"));
  const princ = new URL(testo(dentro(dentro(t, "current-user-principal"), "href")), radice).href;
  t = await dav.xml("PROPFIND", princ, 0, PROPFIND("<c:calendar-home-set/>"));
  const casa = new URL(testo(dentro(dentro(t, "calendar-home-set"), "href")), princ).href;
  t = await dav.xml("PROPFIND", casa, 1, PROPFIND("<d:displayname/><d:resourcetype/>"));
  let href = null;
  for (const resp of risposte(t)) {
    if (testo(dentro(resp, "displayname")) === nome && /calendar/.test(dentro(resp, "resourcetype"))) {
      href = new URL(testo(dentro(resp, "href")), casa).href; break;
    }
  }
  if (!href) {
    href = new URL("agenda-studio-" + Date.now().toString(36) + "/", casa).href;
    const r = await dav.req("MKCALENDAR", href,
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:set><d:prop>' +
      "<d:displayname>" + esc(nome) + "</d:displayname>" +
      '<c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>' +
      "</d:prop></d:set></c:mkcalendar>", { "Content-Type": "application/xml; charset=utf-8" });
    if (!r.ok) throw new Error("non riesco a creare il calendario: MKCALENDAR " + r.status);
  }
  stato.cal = { href, nome };
  return href;
}

/* ---------------- XML, senza DOMParser (nei Worker non c'e') ---------------- */
const P = "(?:[A-Za-z0-9_-]+:)?";
function risposte(xml) {
  const re = new RegExp("<" + P + "response[\\s>][\\s\\S]*?</" + P + "response>", "g");
  return xml.match(re) || [];
}
function dentro(xml, tag) {
  if (!xml) return "";
  const m = new RegExp("<" + P + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + P + tag + ">").exec(xml);
  return m ? m[1] : "";
}
function testo(x) {
  return String(x || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&").trim();
}
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------------- iCalendar ---------------- */
function leggiIcs(txt, fuso) {
  const righe = txt.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  let dentroEv = false, n = 0, ev = null;
  for (const r of righe) {
    if (r === "BEGIN:VEVENT") { n++; if (n === 1) { dentroEv = true; ev = {}; } continue; }
    if (r === "END:VEVENT") { dentroEv = false; continue; }
    if (!dentroEv) continue;
    const i = r.indexOf(":");
    if (i < 0) continue;
    const testa = r.slice(0, i), val = r.slice(i + 1);
    const nome = testa.split(";")[0].toUpperCase();
    const par = {};
    testa.split(";").slice(1).forEach(p => { const k = p.split("="); par[k[0].toUpperCase()] = (k[1] || "").replace(/^"|"$/g, ""); });
    if (nome === "UID") ev.uid = val.trim();
    else if (nome === "SUMMARY") ev.t = sfuggi(val);
    else if (nome === "DTSTART") ev._s = [val, par];
    else if (nome === "DTEND") ev._e = [val, par];
    else if (nome === "DURATION") ev._d = val;
    else if (nome === "RRULE") ev.ripetuto = true;
  }
  if (!ev || !ev._s) return null;
  if (n > 1) ev.ripetuto = true;
  const s = istante(ev._s[0], ev._s[1], fuso);
  ev.tuttoGiorno = s.giorno;
  ev.s = s.ms;
  if (ev._e) ev.e = istante(ev._e[0], ev._e[1], fuso).ms;
  else if (ev._d) ev.e = ev.s + durata(ev._d);
  else ev.e = ev.s + (s.giorno ? 864e5 : 0);
  delete ev._s; delete ev._e; delete ev._d;
  ev.t = ev.t || "";
  return ev;
}
const sfuggi = v => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
function istante(v, par, fuso) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v.trim());
  if (!m) return { ms: NaN, giorno: false };
  const [, y, mo, d, h, mi, se, z] = m;
  if (!h || par.VALUE === "DATE") return { ms: zonaInUtc(+y, +mo, +d, 0, 0, 0, fuso), giorno: true };
  if (z) return { ms: Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se || 0)), giorno: false };
  let tz = par.TZID || fuso;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch (e) { tz = fuso; }
  return { ms: zonaInUtc(+y, +mo, +d, +h, +mi, +(se || 0), tz), giorno: false };
}
function durata(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return 0;
  const ms = (((+(m[2] || 0) * 7 + +(m[3] || 0)) * 24 + +(m[4] || 0)) * 60 + +(m[5] || 0)) * 60e3 + +(m[6] || 0) * 1e3;
  return m[1] === "-" ? -ms : ms;
}
/* quanto il fuso e' avanti rispetto a UTC in quell'istante (ora legale compresa) */
function scarto(ms, tz) {
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}
function zonaInUtc(y, mo, d, h, mi, s, tz) {
  const g = Date.UTC(y, mo - 1, d, h, mi, s);
  const o = scarto(g, tz);
  let u = g - o;
  const o2 = scarto(u, tz);
  if (o2 !== o) u = g - o2;
  return u;
}
const utc = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const daGiorno = g => Date.UTC(+g.slice(0, 4), +g.slice(5, 7) - 1, +g.slice(8, 10)) - 864e5;
function piega(r) {
  const enc = new TextEncoder();
  if (enc.encode(r).length <= 75) return r;
  const out = []; let cur = "", n = 0;
  for (const ch of r) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const icsTesto = x => String(x).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function icsEvento(e) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//agenda//ponte//IT", "BEGIN:VEVENT",
    "UID:" + e.uid, "DTSTAMP:" + utc(Date.now()), "DTSTART:" + utc(e.s), "DTEND:" + utc(e.e),
    "SUMMARY:" + icsTesto(e.t), "DESCRIPTION:" + icsTesto(e.d || ""), "END:VEVENT", "END:VCALENDAR"]
    .map(piega).join("\r\n") + "\r\n";
}
