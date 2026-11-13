// Obrázkové otázky: obrázky z Wikipedie (hlavní obrázek článku), kontrola přes vision a proxy.
// Claude u obrázkové otázky vrátí název článku na anglické Wikipedii (imageWiki) a náhradní
// textovou verzi otázky (questionNoImage) pro případ, že obrázek nejde použít.

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const UA = "kviz-app/1.0 (quiz generator)";
const THUMB_SIZE = 1280;
const MAX_IMAGE_BYTES = 4_500_000; // limit pro vision (5 MB na obrázek)
export const IMAGE_HOSTS = ["upload.wikimedia.org", "thumb.wikimedia.org"];

const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function wikiQuery(params) {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries({ action: "query", format: "json", formatversion: "2", ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return (await res.json()).query || {};
}

// název článku → { src (URL náhledu), file, page } ; titulky po dávkách (API bere max. 50)
async function pageImages(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const q = await wikiQuery({ titles: batch.join("|"), redirects: "1", prop: "pageimages", piprop: "thumbnail|name", pithumbsize: String(THUMB_SIZE) });
    // dohledat, na co se původní název přeložil (normalizace, přesměrování)
    const resolve = (t) => {
      for (const n of q.normalized || []) if (n.from === t) t = n.to;
      for (const r of q.redirects || []) if (r.from === t) t = r.to;
      return t;
    };
    const pages = new Map((q.pages || []).map((p) => [p.title, p]));
    for (const t of batch) {
      const p = pages.get(resolve(t));
      if (p?.thumbnail?.source && p.pageimage) out.set(t, { src: p.thumbnail.source, file: p.pageimage, page: p.title });
    }
  }
  return out;
}

// soubor → { artist, license, nonFree } (autor a licence z Wikimedia Commons)
async function fileInfo(files) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50).map((f) => "File:" + f);
    const q = await wikiQuery({ titles: batch.join("|"), prop: "imageinfo", iiprop: "extmetadata", iiextmetadatafilter: "Artist|LicenseShortName|NonFree" });
    const norm = new Map((q.normalized || []).map((n) => [n.to, n.from]));
    for (const p of q.pages || []) {
      const m = p.imageinfo?.[0]?.extmetadata || {};
      const key = (norm.get(p.title) || p.title).replace(/^File:/, "");
      out.set(key, {
        artist: /file history/i.test(stripHtml(m.Artist?.value)) ? "" : stripHtml(m.Artist?.value).slice(0, 120),
        license: stripHtml(m.LicenseShortName?.value).slice(0, 60),
        nonFree: !!m.NonFree?.value,
      });
    }
  }
  return out;
}

async function download(src) {
  const res = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") || "").split(";")[0];
  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > MAX_IMAGE_BYTES ? null : { type, data: buf.toString("base64") };
}

const CHECK_SCHEMA = {
  type: "object",
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: { index: { type: "integer" }, ok: { type: "boolean" } },
        required: ["index", "ok"],
        additionalProperties: false,
      },
    },
  },
  required: ["checks"],
  additionalProperties: false,
};

// vision: sedí obrázek k otázce a neprozrazuje odpověď? (jedno volání na všechny obrázky)
async function checkImages(client, model, items) {
  const content = [{
    type: "text",
    text: `Kontroluješ obrázky ke kvízovým otázkám. U každého obrázku posuď, zda platí VŠE:
1) obrázek jasně ukazuje to, na co se otázka ptá (ne mapu, erb, logo, schéma ani něco jiného, pokud se na to otázka neptá),
2) z obrázku nejde přečíst správná odpověď (žádný popisek, nápis ani vodoznak s odpovědí),
3) obrázek je vhodný pro promítání v hospodském či školním kvízu.
Vrať pro každý index ok=true/false.`,
  }];
  for (const it of items) {
    content.push({ type: "text", text: `Obrázek ${it.index}: otázka „${it.question}“, správná odpověď „${it.answer}“.` });
    content.push({ type: "image", source: { type: "base64", media_type: it.img.type, data: it.img.data } });
  }
  const msg = await client.messages.create({
    model,
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema: CHECK_SCHEMA } },
    messages: [{ role: "user", content }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return new Set(JSON.parse(text).checks.filter((c) => c.ok).map((c) => c.index));
}

const proxyUrl = (src) => "/api/img?u=" + Buffer.from(src).toString("base64url");

// doplní otázkám obrázky; otázky, u kterých obrázek nevyšel, přepne na textovou verzi
export async function attachImages(client, model, questions) {
  const wanted = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.imageWiki?.trim());
  const fallback = (q) => { if (q.questionNoImage?.trim()) q.question = q.questionNoImage.trim(); };
  try {
    if (!wanted.length) return;
    const titles = [...new Set(wanted.map(({ q }) => q.imageWiki.trim()))];
    const pages = await pageImages(titles);
    const files = [...new Set([...pages.values()].map((p) => p.file))];
    const infos = files.length ? await fileInfo(files) : new Map();

    const candidates = [];
    await Promise.all(wanted.map(async ({ q, i }) => {
      const p = pages.get(q.imageWiki.trim());
      const info = p && infos.get(p.file);
      if (!p || !info || info.nonFree) return; // nesvobodné obrázky (fair use) nepoužívat
      const img = await download(p.src).catch(() => null);
      if (img) candidates.push({ index: i, q, p, info, img, question: q.question, answer: q.answers[q.correct] });
    }));
    if (!candidates.length) return;

    const okSet = await checkImages(client, model, candidates);
    for (const c of candidates) {
      if (!okSet.has(c.index)) continue;
      c.q.image = {
        src: proxyUrl(c.p.src),
        credit: [c.info.artist, c.info.license].filter(Boolean).join(" · ") || "Wikimedia Commons",
        page: c.p.page,
      };
    }
  } catch (err) {
    console.error("Obrázky se nepodařilo doplnit:", err.message);
  } finally {
    for (const { q } of wanted) if (!q.image) fallback(q);
    for (const q of questions) { delete q.imageWiki; delete q.questionNoImage; }
  }
}

// GET /api/img?u=<base64url> – proxy jen pro obrázky z Wikimedia (URL obrázku by prozradila odpověď)
export async function imageProxy(req, res) {
  let src;
  try { src = new URL(Buffer.from(String(req.query.u || ""), "base64url").toString()); } catch { return res.sendStatus(400); }
  if (src.protocol !== "https:" || !IMAGE_HOSTS.includes(src.hostname)) return res.sendStatus(400);
  try {
    const up = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
    const type = up.headers.get("content-type") || "";
    if (!up.ok || !type.startsWith("image/")) return res.sendStatus(502);
    res.set({ "Content-Type": type, "Cache-Control": "public, max-age=604800, immutable" });
    res.send(Buffer.from(await up.arrayBuffer()));
  } catch {
    res.sendStatus(502);
  }
}
