const ANIMALS = [
  { name: "Lišky", emoji: "🦊", color: "#e0702f" },
  { name: "Medvědi", emoji: "🐻", color: "#8a5a3b" },
  { name: "Sovy", emoji: "🦉", color: "#7656c2" },
  { name: "Vlci", emoji: "🐺", color: "#3f6fb0" },
  { name: "Jeleni", emoji: "🦌", color: "#b8862a" },
  { name: "Ježci", emoji: "🦔", color: "#c24f7c" },
  { name: "Veverky", emoji: "🐿️", color: "#21958a" },
  { name: "Jezevci", emoji: "🦡", color: "#5d6a75" },
  { name: "Divočáci", emoji: "🐗", color: "#4c8a35" },
];
const MAX_TEAMS = 4;
const MIN_TEAMS = 0; // bez týmů = nesoutěžní režim (bez lišty týmů)
const LEVEL_NAMES = { lehka: "Lehká", stredni: "Střední", tezka: "Těžká", hardcore: "Hardcore", mix: "Mix" };
const LOADING_TIPS = [
  "Vymýšlím chytáky do špatných odpovědí…",
  "Ověřuji, že správná odpověď je opravdu správná…",
  "Píšu vysvětlení ke každé otázce…",
  "Míchám obtížnost…",
  "Ještě chvilku, ladím formulace…",
];
const STORAGE_KEY = "kviz-state-v1";
// předgenerovaná témata (s emoji pro bubliny): našeptávač, bubliny pro inspiraci na zadání a losování náhodného tématu
const TOPICS = [
  ["🪐", "Vesmír"], ["🦖", "Dinosauři"], ["🏺", "Starověký Egypt"], ["🏛️", "Antické Řecko"], ["⚔️", "Římská říše"],
  ["🏰", "Středověk"], ["🎖️", "Druhá světová válka"], ["👑", "Čeští panovníci"], ["🏯", "Hrady a zámky"], ["🗺️", "Hlavní města"],
  ["🏳️", "Vlajky světa"], ["🌋", "Sopky"], ["🌊", "Oceány"], ["🏞️", "Řeky a jezera"], ["⛅", "Počasí"],
  ["🫀", "Lidské tělo"], ["💊", "Medicína"], ["⚗️", "Chemické prvky"], ["🧲", "Fyzika kolem nás"], ["➗", "Matematika"],
  ["💡", "Vynálezy"], ["💻", "Internet a technologie"], ["🎮", "Videohry"], ["🎬", "Filmy"], ["🎞️", "Filmové hlášky"],
  ["🧚", "Pohádky"], ["📺", "Seriály"], ["📼", "Hudba 80. let"], ["🎸", "Česká hudba"], ["🎻", "Klasická hudba"],
  ["🎨", "Malíři"], ["🏗️", "Architektura"], ["📚", "Světová literatura"], ["📖", "Česká literatura"], ["⚡", "Mytologie"],
  ["👻", "České pověsti"], ["⚽", "Fotbal"], ["🏒", "Hokej"], ["🏅", "Olympijské hry"], ["🏎️", "Formule 1"],
  ["🍜", "Kuchyně světa"], ["🥟", "Česká kuchyně"], ["🦁", "Zvířata"], ["🦜", "Ptáci"], ["🐞", "Hmyz"],
  ["🌻", "Rostliny"], ["🐾", "Psi a kočky"], ["🏴‍☠️", "Piráti"], ["🏆", "Rekordy"], ["🚂", "Dopravní prostředky"],
  ["💥", "Komiksy"], ["🦸", "Superhrdinové"], ["🐉", "Draci a fantasy"], ["🧙", "Harry Potter"], ["🌌", "Star Wars"],
  ["💍", "Pán prstenů"], ["🎭", "Divadlo"], ["👗", "Móda"], ["🤘", "Rock a metal"], ["🎹", "Hudební nástroje"],
  ["🏔️", "Hory a horolezectví"], ["🍄", "Houby"], ["🐋", "Mořští živočichové"], ["🧬", "Genetika"], ["🤖", "Roboti a AI"],
  ["🧩", "Hlavolamy a logika"], ["🗣️", "Jazyky světa"], ["🔤", "Čeština"], ["📜", "Přísloví a pořekadla"], ["🗽", "USA"],
  ["🗼", "Francie"], ["🍕", "Itálie"], ["🗾", "Japonsko"], ["🐼", "Čína"], ["🦘", "Austrálie"],
  ["🌎", "Jižní Amerika"], ["🦒", "Afrika"], ["🇨🇿", "Česká republika"], ["🏙️", "Praha"], ["🕌", "Divy světa"],
  ["🎄", "Vánoce a tradice"], ["🍷", "Víno"], ["🍺", "Pivo"], ["☕", "Káva a čaj"], ["🍎", "Ovoce a zelenina"],
  ["🎾", "Tenis"], ["🏀", "Basketbal"], ["⛷️", "Zimní sporty"], ["🚴", "Cyklistika"], ["🥊", "Bojové sporty"],
  ["♟️", "Šachy"], ["🎲", "Deskové hry"], ["✈️", "Letectví"], ["🚢", "Lodě a moře"], ["🚗", "Auta"],
  ["💰", "Peníze a ekonomika"], ["⚖️", "Právo a politika"], ["🕵️", "Detektivky"], ["🌍", "Ekologie"], ["⏳", "Slavné osobnosti"],
];
const TOPIC_IDEAS = TOPICS.map(([, t]) => t);

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* ---------- Dotykové zařízení ---------- */
const touchQuery = matchMedia("(hover: none) and (pointer: coarse)");
const isTouch = () => touchQuery.matches;
touchQuery.addEventListener?.("change", () => renderTeams());

/* ---------- Stav ---------- */
let state = load() || {
  view: "setup",
  quiz: null,
  index: 0,
  teams: ANIMALS.slice(0, 2).map((a) => ({ ...a, score: 0 })),
};
state.teams = state.teams.slice(0, MAX_TEAMS); // starší uložený stav mohl mít víc týmů
while (state.teams.length < MIN_TEAMS) {
  const used = new Set(state.teams.map((t) => t.emoji));
  state.teams.push({ ...ANIMALS.find((a) => !used.has(a.emoji)), score: 0 });
}
// doplnění barev u starších uložených týmů
state.teams.forEach((t, i) => {
  if (!t.color) t.color = (ANIMALS.find((a) => a.emoji === t.emoji) || ANIMALS[i % ANIMALS.length]).color;
});

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function save() {
  if (state.locked) return; // archivní kvíz se nikdy neukládá zpět
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* ---------- Přepínání obrazovek ---------- */
let loadingTimer = null;

/* ---------- Adaptivní bodování (jen pro mix) ---------- */
const DEFAULT_DIFF_POINTS = { "lehká": 1, "střední": 2, "těžká": 3, "hardcore": 4 };
// body za obtížnost – nastavitelné v Nastavení, výchozí 1 / 2 / 3
const diffPoints = (d) => state.diffPoints?.[d] ?? DEFAULT_DIFF_POINTS[d] ?? 1;
const adaptiveOn = () => !!state.adaptiveScoring && state.quiz?.level === "mix";
// kolik bodů se přičte klávesou / klepnutím: u otázky v mixu podle obtížnosti, jinak 1
function questionPoints() {
  if (!adaptiveOn() || state.view !== "quiz") return 1;
  return diffPoints(currentQ()?.difficulty);
}
const pointsLabel = (n) => (n === 1 ? "1 bod" : n >= 2 && n <= 4 ? `${n} body` : `${n} bodů`);

const scoringActive = () => !state.locked && !!state.quiz && (state.view === "quiz" || state.view === "results");

function show(view) {
  state.view = view;
  document.body.dataset.view = view;
  document.body.classList.toggle("locked", !!state.locked);
  for (const v of ["setup", "loading", "quiz", "results", "archive"]) $(v + "View").hidden = v !== view;
  $("newQuizBtn").hidden = !state.quiz || view === "setup" || view === "loading";
  renderQuizInfo(view);
  // archivní (zamčený) kvíz: bez nastavení, místo „Nový kvíz“ návrat do archivu
  renderHeader();
  $("menuTeams").hidden = !!state.locked;
  $("againBtn").hidden = !!state.locked;
  $("replayBtn").hidden = !state.locked;
  // archivní kvíz: „Průběh kvízu“ je hlavní akce (s ikonou play), návrat do archivu vedlejší
  // běžící kvíz: „Průběh kvízu“ (přepne do archivu), archivní kvíz: „Zobrazit kvíz“ (otázky od první)
  $("backBtn").innerHTML = `<i class="ph ph-play" aria-hidden="true"></i> ${state.locked ? "Zobrazit kvíz" : "Průběh kvízu"}`;
  $("backBtn").classList.toggle("primary", !!state.locked);
  $("backBtn").classList.toggle("ghost", !state.locked);
  if (state.locked) syncReviewTeams();

  // body se počítají jen když kvíz běží (otázky a výsledky); jinak lišta týmů slouží k jejich úpravě
  document.body.classList.toggle("no-scoring", !scoringActive());
  renderTeams();

  clearInterval(loadingTimer);
  if (view === "loading") startLoadingTips();
  // gradient jen na zadání (podle zvolené obtížnosti); otázky a ostatní obrazovky neutrální – čitelnost na TV/projektoru
  if (view === "setup") applySetupGradient();
  else delete document.body.dataset.diff;
  if (view === "setup" && state.setupMode !== "advanced") startBubbles();
  else stopBubbles();
  if (view === "quiz") { renderQuestion(true); logEvent("question"); }
  if (view === "results") { renderResults(); logEvent("results"); }
  if (view === "archive") renderArchive();
  renderHeader(); // znovu – po zápisu výsledků už je kvíz dokončený
  $("main").scrollTop = 0;
  save();
}

/* ---------- Zadání ---------- */
// gradient na zadání podle zvolené obtížnosti (mix má vlastní tyrkysový)
const LEVEL_DIFF = { lehka: "lehká", stredni: "střední", tezka: "těžká", hardcore: "hardcore", mix: "mix" };
function applySetupGradient() {
  const level = document.querySelector('input[name="level"]:checked')?.value || "mix";
  document.body.dataset.diff = LEVEL_DIFF[level];
}
document.querySelectorAll('input[name="level"]').forEach((r) =>
  r.addEventListener("change", () => { if (state.view === "setup") applySetupGradient(); })
);
function topicList() {
  return $("topic").value.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
}

$("topic").addEventListener("input", () => $("topic").classList.remove("invalid"));

// náhodné téma: pole pro téma i upřesnění zadání se vypnou, téma vybere AI
function applyRandomTopic() {
  const on = $("randomTopic").checked;
  $("topic").disabled = on;
  updateTopicPlaceholder();
  $("topic").classList.remove("invalid");
  $("extraBtn").disabled = on;
}
$("randomTopic").addEventListener("change", applyRandomTopic);

// upřesnění zadání (doplňující prompt) v modálním okně; text se pamatuje
function renderExtraBtn() {
  const filled = !!$("extra").value.trim();
  $("extraBtn").classList.toggle("active", filled);
  $("extraBtn").title = filled ? "Zadání upřesněno – upravit" : "Upřesnit zadání";
}
$("extra").value = state.extraPrompt || "";
renderExtraBtn();
$("extraBtn").addEventListener("click", () => { if (!$("extraBtn").disabled) $("extraDialog").showModal(); });
$("extra").addEventListener("input", () => { state.extraPrompt = $("extra").value; save(); });
$("extraSave").addEventListener("click", () => $("extraDialog").close());
$("extraClear").addEventListener("click", () => {
  $("extra").value = "";
  state.extraPrompt = "";
  save();
  $("extra").focus();
});
$("extraDialog").addEventListener("close", renderExtraBtn);
$("extraDialog").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ---------- Jednoduché / pokročilé zadání ---------- */
// jednoduché: jen velké pole s tématem a tlačítko; počet otázek, obtížnost a upřesnění se berou z pokročilého
function setSetupMode(mode, focus = true) {
  const simple = mode !== "advanced";
  state.setupMode = simple ? "simple" : "advanced";
  $("setupForm").dataset.mode = state.setupMode;
  $("setupView").classList.toggle("simple", simple);
  // náhodné téma jde zapnout jen v pokročilém – v jednoduchém by pole zůstalo zamčené
  if (simple && $("randomTopic").checked) { $("randomTopic").checked = false; applyRandomTopic(); }
  updateTopicPlaceholder();
  closeSuggest();
  if (simple && state.view === "setup") startBubbles();
  else stopBubbles();
  save();
  if (focus) $("topic").focus();
}
function updateTopicPlaceholder() {
  $("topic").placeholder = $("randomTopic").checked ? "Téma vybere AI"
    : state.setupMode === "advanced" ? "např. sport, vesmír" : "Napiš jakékoli téma…";
}
$("advancedModeBtn").addEventListener("click", () => setSetupMode("advanced"));
$("simpleModeBtn").addEventListener("click", () => setSetupMode("simple"));

/* ---------- Našeptávač témat ---------- */
// porovnání bez diakritiky; u více témat (oddělených čárkou) se našeptává poslední rozepsané
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let suggestItems = [];
let suggestIndex = -1;
function topicSegment() {
  const v = $("topic").value;
  const i = Math.max(v.lastIndexOf(","), v.lastIndexOf(";"));
  return { head: v.slice(0, i + 1), query: v.slice(i + 1).trim() };
}
function updateSuggest() {
  const { query } = topicSegment();
  const q = norm(query);
  if (!q || $("topic").disabled) return closeSuggest();
  const used = new Set(topicList().map(norm));
  suggestItems = TOPIC_IDEAS
    .map((t) => {
      const n = norm(t);
      // shoda na začátku tématu má přednost před shodou na začátku dalšího slova
      const at = n.startsWith(q) ? 0 : n.indexOf(" " + q) + 1 || -1;
      return { t, at, len: q.length };
    })
    .filter((m) => m.at >= 0 && !used.has(norm(m.t)))
    .sort((a, b) => (a.at > 0) - (b.at > 0))
    .slice(0, 6);
  if (!suggestItems.length) return closeSuggest();
  suggestIndex = -1;
  const list = $("topicSuggest");
  list.innerHTML = "";
  suggestItems.forEach((m, i) => {
    const li = el("li", "suggest-item");
    li.id = "sg-" + i;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    li.append(m.t.slice(0, m.at), el("mark", null, m.t.slice(m.at, m.at + m.len)), m.t.slice(m.at + m.len));
    li.addEventListener("mousedown", (e) => e.preventDefault()); // pole neztratí fokus
    li.addEventListener("click", () => pickSuggest(m.t));
    list.appendChild(li);
  });
  list.hidden = false;
  $("topic").setAttribute("aria-expanded", "true");
}
function closeSuggest() {
  $("topicSuggest").hidden = true;
  $("topicSuggest").innerHTML = "";
  suggestItems = [];
  suggestIndex = -1;
  $("topic").setAttribute("aria-expanded", "false");
  $("topic").removeAttribute("aria-activedescendant");
}
function moveSuggest(d) {
  const n = suggestItems.length + 1; // pozice -1 = nic nevybráno
  suggestIndex = ((suggestIndex + 1 + d) % n + n) % n - 1;
  document.querySelectorAll("#topicSuggest .suggest-item").forEach((li, i) => {
    li.classList.toggle("active", i === suggestIndex);
    li.setAttribute("aria-selected", String(i === suggestIndex));
  });
  if (suggestIndex >= 0) $("topic").setAttribute("aria-activedescendant", "sg-" + suggestIndex);
  else $("topic").removeAttribute("aria-activedescendant");
}
function pickSuggest(topic) {
  const { head } = topicSegment();
  $("topic").value = (head ? head.replace(/\s*$/, " ") : "") + topic;
  $("topic").classList.remove("invalid");
  closeSuggest();
  $("topic").focus();
}
$("topic").addEventListener("input", updateSuggest);
$("topic").addEventListener("blur", closeSuggest);
$("topic").addEventListener("keydown", (e) => {
  if ($("topicSuggest").hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); moveSuggest(e.key === "ArrowDown" ? 1 : -1); }
  else if (e.key === "Enter" && suggestIndex >= 0) { e.preventDefault(); pickSuggest(suggestItems[suggestIndex].t); }
  else if (e.key === "Escape") { e.preventDefault(); closeSuggest(); }
});

/* ---------- Bubliny s tématy (inspirace na jednoduchém zadání) ---------- */
// tři hloubky: blízké bubliny jsou větší a výraznější, vzdálené menší, průsvitnější a pomalejší
let bubbleTimer = null;
let bubbleResize = null;
const BUBBLE_TINTS = ANIMALS.map((a) => a.color);
const BUBBLE_DEPTHS = [
  { size: [1.45, 1.85], drift: 20, dur: [13, 17], opacity: 1 },
  { size: [1.15, 1.4], drift: 14, dur: [16, 21], opacity: .92 },
  { size: [0.95, 1.1], drift: 10, dur: [20, 28], opacity: .7 },
];
const rand = (min, max) => min + Math.random() * (max - min);
function startBubbles() {
  stopBubbles();
  // rozmístit až po vykreslení, ať je známa poloha pole
  requestAnimationFrame(() => {
    if (state.view !== "setup" || state.setupMode === "advanced") return;
    const box = $("topicBubbles");
    const area = box.getBoundingClientRect();
    const target = Math.round(Math.min(24, Math.max(7, (area.width * area.height) / 36000)));
    // postupné „vyplutí“ bublin jedna po druhé
    for (let i = 0; i < target * 6 && box.children.length < target; i++) spawnBubble(box.children.length * 160);
    bubbleTimer = setInterval(swapBubble, 3200);
  });
}
function stopBubbles() {
  clearInterval(bubbleTimer);
  bubbleTimer = null;
  $("topicBubbles").innerHTML = "";
}
// nová bublina na náhodném volném místě (mimo pole se zadáním a ostatní bubliny); vrací false, když se nevejde
function spawnBubble(delay = 0) {
  const box = $("topicBubbles");
  const area = box.getBoundingClientRect();
  const shown = new Set([...box.children].map((b) => b.dataset.topic));
  const free = TOPICS.filter(([, t]) => !shown.has(t));
  if (!free.length || !area.width) return false;
  const [emoji, topic] = free[Math.floor(Math.random() * free.length)];
  const depth = BUBBLE_DEPTHS[Math.floor(Math.random() * BUBBLE_DEPTHS.length)];
  const b = el("button", "bubble out");
  b.type = "button";
  b.tabIndex = -1;
  b.dataset.topic = topic;
  b.append(el("span", "bubble-emoji", emoji), topic);
  b.style.setProperty("--tint", BUBBLE_TINTS[Math.floor(Math.random() * BUBBLE_TINTS.length)]);
  b.style.setProperty("--o", depth.opacity);
  // na menších obrazovkách menší bubliny, ať se jich vejde víc
  const scale = Math.min(1, Math.max(0.72, area.width / 1300));
  b.style.fontSize = (rand(...depth.size) * scale).toFixed(2) + "rem";
  b.style.zIndex = String(3 - BUBBLE_DEPTHS.indexOf(depth));
  const dx = rand(-1, 1) * depth.drift, dy = rand(-1, 1) * depth.drift * 0.8;
  b.style.setProperty("--dx", dx.toFixed(0) + "px");
  b.style.setProperty("--dy", dy.toFixed(0) + "px");
  b.style.setProperty("--rot", rand(-3, 3).toFixed(1) + "deg");
  b.style.setProperty("--dur", rand(...depth.dur).toFixed(1) + "s");
  b.style.setProperty("--wob", rand(7, 11).toFixed(1) + "s");
  b.style.animationDelay = `-${rand(0, 16).toFixed(1)}s, -${rand(0, 10).toFixed(1)}s`;
  b.style.visibility = "hidden";
  box.appendChild(b);
  // celá dráha bubliny: šířka a výška + rozsah plutí na obě strany + rezerva na naklonění a zvětšení při najetí
  const bw = b.offsetWidth, bh = b.offsetHeight;
  const w = bw * 1.06 + Math.abs(dx) * 2 + 8, h = bh * 1.06 + bw * 0.05 + Math.abs(dy) * 2 + 8;
  const form = $("setupForm").getBoundingClientRect();
  // ochranná zóna kolem pole: na velké obrazovce víc volného místa, na mobilu méně (není kam bubliny dát)
  const padX = Math.min(110, area.width * 0.08), padY = Math.min(90, area.height * 0.11);
  const avoid = [{
    l: form.left - area.left - padX, t: form.top - area.top - padY,
    r: form.right - area.left + padX, b: form.bottom - area.top + padY,
  }];
  // ostatní bubliny: jejich celé dráhy (ne aktuální poloha), aby se nepotkaly ani při plutí
  for (const o of box.children) if (o !== b && o.env) avoid.push(o.env);
  for (let tries = 0; tries < 80; tries++) {
    const x = w / 2 + Math.random() * Math.max(0, area.width - w);
    const y = h / 2 + Math.random() * Math.max(0, area.height - h);
    const r = { l: x - w / 2, t: y - h / 2, r: x + w / 2, b: y + h / 2 };
    if (avoid.some((a) => r.l < a.r && r.r > a.l && r.t < a.b && r.b > a.t)) continue;
    b.env = r;
    b.style.left = x + "px";
    b.style.top = y + "px";
    b.style.visibility = "";
    b.addEventListener("click", () => pickBubble(b));
    setTimeout(() => b.classList.remove("out"), 30 + delay);
    return true;
  }
  b.remove();
  return false;
}
// jedna bublina „praskne“ a jinde vypluje nová
function swapBubble() {
  const live = [...$("topicBubbles").children].filter((b) => !b.classList.contains("out"));
  if (!live.length) return;
  const old = live[Math.floor(Math.random() * live.length)];
  old.classList.add("out", "pop");
  setTimeout(() => { old.remove(); spawnBubble(); }, 900);
}
// kliknutí na bublinu: téma do pole (za čárku se přidá k dalším tématům, jinak nahradí obsah)
function pickBubble(b) {
  const v = $("topic").value.trim();
  $("topic").value = /[,;]$/.test(v) ? `${v} ${b.dataset.topic}` : b.dataset.topic;
  $("topic").classList.remove("invalid");
  $("topic").focus();
  closeSuggest();
  b.classList.add("out", "pop");
  setTimeout(() => { b.remove(); spawnBubble(); }, 800);
}
window.addEventListener("resize", () => {
  if (!bubbleTimer) return;
  clearTimeout(bubbleResize);
  bubbleResize = setTimeout(startBubbles, 250);
});

function setCount(n) {
  n = Math.min(100, Math.max(3, Number(n) || 10));
  $("count").value = n;
  document.querySelectorAll("#countChips .chip").forEach((c) => c.classList.toggle("active", Number(c.dataset.count) === n));
}
document.querySelectorAll(".stepper button").forEach((b) =>
  b.addEventListener("click", () => setCount(Number($("count").value) + Number(b.dataset.step)))
);
document.querySelectorAll("#countChips .chip").forEach((c) => c.addEventListener("click", () => setCount(c.dataset.count)));
$("count").addEventListener("change", () => setCount($("count").value));

$("setupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const topics = topicList();
  const randomTopic = $("randomTopic").checked;
  if (!topics.length && !randomTopic) {
    $("topic").classList.add("invalid");
    $("topic").focus();
    return showError("Napiš téma kvízu nebo zapni náhodné téma.");
  }
  setCount($("count").value);
  const body = {
    topic: randomTopic ? "" : topics.join(", "),
    randomTopic,
    instructions: randomTopic ? "" : $("extra").value.trim(),
    // náhodné téma: nedávná témata z archivu, ať se neopakují
    avoidTopics: randomTopic ? [...new Set(archive.map((e) => e.topic))].slice(0, 30) : undefined,
    count: Number($("count").value),
    level: new FormData(e.target).get("level"),
  };
  generateQuiz(body);
});

// vygenerovat kvíz přes API (ze zadání i „Hrát znovu“ v archivu) a spustit ho
async function generateQuiz(body) {
  const randomTopic = !!body.randomTopic;
  $("setupError").hidden = true;
  show("loading");
  if (randomTopic) startTopicDraw();
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Generování selhalo.");
    state.quiz = {
      topic: data.topic,
      level: data.level,
      questions: data.questions.map((q) => ({ ...q, picked: null, revealed: false })),
    };
    state.index = 0;
    archiveStart("ai", { count: body.count, instructions: body.instructions, randomTopic });
    // náhodné téma: nejdřív chvíli ukázat vylosované téma, pak kvíz
    if (randomTopic) await revealTopicDraw(data.topic);
    show("quiz");
  } catch (err) {
    stopTopicDraw();
    show("setup");
    showError(err.message);
  }
}

/* ---------- Losování náhodného tématu (animace při načítání) ---------- */
const DRAW_TOPICS = TOPIC_IDEAS;
let drawTimer = null;
function startTopicDraw() {
  $("topicDraw").hidden = false;
  $("topicDraw").classList.remove("done");
  $("topicDrawLabel").textContent = "Losuji téma…";
  $("loadingText").hidden = true;
  let last = "";
  drawTimer = setInterval(() => {
    let t;
    do t = DRAW_TOPICS[Math.floor(Math.random() * DRAW_TOPICS.length)]; while (t === last);
    last = t;
    $("topicDrawValue").textContent = t;
  }, 110);
}
function stopTopicDraw() {
  clearInterval(drawTimer);
  drawTimer = null;
  $("topicDraw").hidden = true;
  $("loadingText").hidden = false;
}
function revealTopicDraw(topic) {
  clearInterval(drawTimer);
  $("topicDrawLabel").textContent = "Téma kvízu";
  $("topicDrawValue").textContent = topic;
  $("topicDraw").classList.add("done");
  return new Promise((resolve) => setTimeout(() => { stopTopicDraw(); resolve(); }, 2200));
}

function showError(msg) {
  $("setupError").textContent = msg;
  $("setupError").hidden = false;
}

function startLoadingTips() {
  // při načítání poskakují ikony zvolených týmů
  const animals = $("loaderAnimals");
  animals.innerHTML = "";
  // bez týmů (nesoutěžní režim) poskakují výchozí zvířátka
  const loaderTeams = state.teams.length ? state.teams : ANIMALS.slice(0, 3);
  loaderTeams.forEach((t, j) => {
    const s = el("span", null, t.emoji);
    s.style.setProperty("--team", t.color);
    s.style.animationDelay = `${j * 0.15}s`;
    animals.appendChild(s);
  });
  let i = 0;
  $("loadingSub").textContent = LOADING_TIPS[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_TIPS.length;
    $("loadingSub").textContent = LOADING_TIPS[i];
  }, 3500);
}

// aktuální kvíz se nezahazuje – zůstane v archivu (nedokončený mezi rozehranými), proto bez potvrzení
function newQuiz() {
  if (state.locked) exitReview();
  leaveCurrent();
  show("setup");
  $("topic").focus();
}
$("newQuizBtn").addEventListener("click", () => { closeMenu(); newQuiz(); });
// výsledky: „Nový kvíz“ i „Průběh kvízu“ uzavřou dokončený kvíz do archivu a vynulují body
$("againBtn").addEventListener("click", () => {
  closeQuiz();
  show("setup");
  $("topic").focus();
});
// „Zobrazit kvíz“ / „Průběh kvízu“: v archivním kvízu otázky od první, u běžícího kvízu přepne do archivu na jeho průběh
$("backBtn").addEventListener("click", () => {
  if (state.locked) {
    state.index = 0;
    return show("quiz");
  }
  const id = state.quiz?.archiveId;
  if (!archive.some((e) => e.id === id)) return show("quiz");
  closeQuiz();
  state.archiveFrom = "setup"; // kvíz je uzavřený – z archivu se křížkem jde na zadání
  state.view = "archive";
  save();
  openReview(id);
});
$("brand").addEventListener("click", (e) => {
  e.preventDefault();
  // s křížkem v hlavičce (kvíz, archiv, nastavení) logo nic nedělá – opouští se jen křížkem
  if (document.body.classList.contains("close-head") || state.bigTeams) return;
  if (state.locked) exitReview();
  if (state.view !== "setup") newQuiz();
});

/* ---------- Otázka ---------- */
const currentQ = () => state.quiz?.questions[state.index];

function renderQuestion(animate = false) {
  const q = currentQ();
  if (!q) return;
  const total = state.quiz.questions.length;
  // archivní kvíz: lišta týmů ukazuje body tak, jak byly po této otázce
  if (state.locked) { syncReviewTeams(); renderTeams(); }

  $("qCounter").innerHTML = `Otázka <b>${state.index + 1}</b> z ${total}`;
  const multi = state.quiz.topic.includes(",");
  $("qTopic").hidden = !(multi && q.topic);
  $("qTopic").textContent = q.topic || "";
  // štítek obtížnosti jen v mixu (bez barevného pozadí)
  const mixQuiz = state.quiz.level === "mix";
  $("qLevel").hidden = !mixQuiz;
  $("qLevel").textContent = q.difficulty;
  $("qLevel").className = "pill level-pill " + q.difficulty;
  $("qPoints").hidden = !adaptiveOn();
  $("qPoints").textContent = adaptiveOn() ? pointsLabel(diffPoints(q.difficulty)) : "";
  $("qText").textContent = q.question;

  const wrap = $("answers");
  wrap.innerHTML = "";
  for (const key of ["a", "b", "c"]) {
    const btn = el("button", "answer");
    btn.append(el("span", "letter", key.toUpperCase()), el("span", "text", q.answers[key]));
    if (q.revealed || state.locked) {
      btn.disabled = true;
      if (key === q.correct) { btn.classList.add("correct"); btn.append(el("span", "mark", "✓")); }
      else if (key === q.picked) { btn.classList.add("wrong"); btn.append(el("span", "mark", "✗")); }
      else btn.classList.add("dim");
    }
    btn.addEventListener("click", () => pick(key));
    wrap.appendChild(btn);
  }

  $("explanation").hidden = !q.revealed;
  if (q.revealed) {
    requestAnimationFrame(() => $("explanation").scrollIntoView({ block: "nearest", behavior: "smooth" }));
    $("exTitle").textContent = `Správná odpověď: ${q.correct.toUpperCase()} – ${q.answers[q.correct]}`;
    $("exText").textContent = q.explanation;
  }
  $("qSkipped").hidden = !(state.locked && q.skipped);
  renderReviewNote();

  $("prevBtn").disabled = state.index === 0;
  const last = state.index === total - 1;
  $("nextBtn").innerHTML = last ? '<span aria-hidden="true">🏆</span>' : '<i class="ph ph-caret-right" aria-hidden="true"></i>';
  $("nextBtn").setAttribute("aria-label", last ? "Výsledky" : "Další otázka");
  $("nextBtn").title = last ? "Výsledky (→)" : "Další otázka (→)";
  $("nextBtn").classList.toggle("primary", q.revealed);

  if (animate) {
    const card = $("questionCard");
    card.classList.remove("enter");
    void card.offsetWidth;
    card.classList.add("enter");
  }
}

function pick(key) {
  const q = currentQ();
  if (!q || q.revealed || state.locked) return;
  q.picked = key;
  q.revealed = true;
  logEvent("pick", { q: state.index, key, correct: key === q.correct });
  renderQuestion();
  save();
}
function reveal() {
  const q = currentQ();
  if (!q || q.revealed || state.locked) return;
  q.revealed = true;
  logEvent("reveal", { q: state.index });
  renderQuestion();
  save();
}
function goTo(i) {
  if (!state.quiz) return;
  if (i < 0) return;
  if (i >= state.quiz.questions.length) return show("results");
  if (state.view !== "quiz") { state.index = i; return show("quiz"); }
  state.index = i;
  renderQuestion(true);
  logEvent("question");
  save();
}
const go = (d) => goTo(state.index + d);

function flashButton(id) {
  const btn = $(id);
  if (btn.disabled) return;
  btn.classList.remove("is-pressed");
  void btn.offsetWidth;
  btn.classList.add("is-pressed");
  clearTimeout(btn.flashTimer);
  btn.flashTimer = setTimeout(() => btn.classList.remove("is-pressed"), 220);
}

$("prevBtn").addEventListener("click", () => go(-1));
$("nextBtn").addEventListener("click", () => go(1));

/* ---------- Výsledky ---------- */
function renderResults() {
  // nadpis: název kvízu a obtížnost
  $("resultsTitle").textContent = state.quiz?.topic || "Výsledky";
  // obtížnost jako pill v barvě úrovně (mix neutrálně)
  $("resultsSub").innerHTML = "";
  if (state.quiz) {
    const lvl = state.quiz.level;
    const pill = el("span", "pill level-pill " + (lvl === "mix" ? "" : LEVEL_DIFF[lvl] || ""), LEVEL_NAMES[lvl] || lvl);
    pill.title = "Obtížnost";
    $("resultsSub").append(pill);
  }
  const podium = $("podium");
  const rest = $("rest");
  podium.innerHTML = "";
  rest.innerHTML = "";

  // pořadí se shodami: stejný počet bodů = stejné místo (1, 1, 3, …)
  const ranked = state.teams
    .map((t) => ({ ...t, rank: 1 + state.teams.filter((o) => o.score > t.score).length }))
    .sort((a, b) => a.rank - b.rank);
  const allTied = ranked.every((t) => t.rank === 1);


  // na stupních místa 1–3; při remíze všech jsou všechny týmy na stejné výšce bez medailí
  const onPodium = ranked.filter((t) => t.rank <= 3);
  const byRank = (r) => onPodium.filter((t) => t.rank === r);
  // vítěz(ové) uprostřed, ostatní střídavě vlevo a vpravo (2. místo blíž středu)
  let order = onPodium;
  if (!allTied) {
    const left = [], right = [];
    [...byRank(2), ...byRank(3)].forEach((t, i) => (i % 2 === 0 ? left.unshift(t) : right.push(t)));
    order = [...left, ...byRank(1), ...right];
  }
  for (const t of order) {
    const place = el("div", allTied ? "podium-place tie" : `podium-place p${t.rank}`);
    place.style.setProperty("--team", t.color);
    place.append(
      el("div", "podium-emoji", t.emoji),
      el("div", "podium-name", t.name),
      el("div", "podium-score", `${t.score} b.`),
      el("div", "podium-block", allTied ? "" : ["🥇", "🥈", "🥉"][t.rank - 1])
    );
    podium.appendChild(place);
  }
  ranked.filter((t) => t.rank > 3).forEach((t) => {
    const li = el("li");
    li.append(el("span", "muted", `${t.rank}.`), el("span", null, `${t.emoji} ${t.name}`), el("b", null, `${t.score} b.`));
    rest.appendChild(li);
  });
  $("timeline").hidden = !state.locked;
  if (state.locked) renderTimeline();
}

/* ---------- Týmy ---------- */
function renderTeams() {
  document.body.classList.toggle("no-teams", state.teams.length === 0);
  const wrap = $("teams");
  wrap.innerHTML = "";
  const max = Math.max(...state.teams.map((t) => t.score));
  const leaders = state.teams.filter((t) => t.score === max).length;

  const big = !!state.bigTeams;

  state.teams.forEach((t, i) => {
    // malé zobrazení: na počítači body jen klávesnicí,
    // na dotykových zařízeních (tablet, mobil – bez klávesnice) klepnutí na kartu = +1 bod
    if (!big) {
      const tapToScore = isTouch() && scoringActive();
      const card = el(tapToScore ? "button" : "div", "team");
      card.style.setProperty("--team", t.color);
      if (max > 0 && leaders === 1 && t.score === max) card.classList.add("leader");
      if (tapToScore) card.addEventListener("click", () => addPoints(i, questionPoints()));
      const avatar = el("div", "avatar", t.emoji);
      avatar.append(el("span", "key", String(i + 1)));
      const scoreRow = el("div", "score-row");
      scoreRow.append(el("span", "score", String(t.score)));
      card.append(avatar, el("span", "name", t.name), scoreRow);
      // archivní kvíz: kolik bodů tým dostal u zobrazené otázky
      const gain = state.locked && state.gains?.[t.emoji];
      if (gain) card.append(el("span", "gain" + (gain < 0 ? " minus" : ""), gain > 0 ? `+${gain}` : String(gain)));
      wrap.appendChild(card);
      return;
    }

    const card = el("div", "team");
    card.style.setProperty("--team", t.color);
    if (max > 0 && leaders === 1 && t.score === max) card.classList.add("leader");

    const avatar = el("button", "avatar", t.emoji);
    avatar.title = "Změnit ikonu";
    avatar.setAttribute("aria-label", `Změnit ikonu týmu ${t.name}`);
    avatar.append(el("span", "key", String(i + 1)));
    avatar.addEventListener("click", (e) => { e.stopPropagation(); openEmojiPicker(i, avatar); });

    const name = el("input", "name");
    name.value = t.name;
    name.maxLength = 20;
    name.setAttribute("aria-label", `Název týmu ${i + 1}`);
    name.addEventListener("change", () => {
      const v = name.value.trim();
      if (!v) {
        // prázdný název = zpět na automatický podle ikony
        t.customName = false;
        t.name = EMOJI_NAMES[t.emoji] || t.name;
      } else if (v !== t.name) {
        t.name = v;
        t.customName = true;
      }
      name.value = t.name;
      logTeams("rename", t);
      save();
    });
    name.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "Escape") name.blur(); });


    // v nastavení týmů jdou body upravit i tlačítky −/+ (v malém zobrazení jen klávesnicí)
    const scoreRow = el("div", "score-row");
    const minus = el("button", "pm", "−");
    minus.title = "Odebrat bod";
    minus.setAttribute("aria-label", `Odebrat bod týmu ${t.name}`);
    minus.addEventListener("click", () => addPoints(i, -1, true));
    const plus = el("button", "pm", "+");
    plus.title = "Přidat bod";
    plus.setAttribute("aria-label", `Přidat bod týmu ${t.name}`);
    plus.addEventListener("click", () => addPoints(i, 1, true));
    scoreRow.append(minus, el("span", "score", String(t.score)), plus);

    // odebrání týmu jen ve velkém zobrazení
    const tools = el("div", "tools");
    if (state.teams.length > MIN_TEAMS) {
      const del = el("button", "del", "✕");
      del.title = "Odebrat tým";
      del.addEventListener("click", () => removeTeam(i));
      tools.append(del);
    }

    // pořadí: šipky ‹ › (i na dotyku) + přetažení karty
    const move = el("div", "move");
    const left = el("button", null, "‹");
    left.title = "Posunout doleva"; left.setAttribute("aria-label", `Posunout tým ${t.name} doleva`);
    left.disabled = i === 0;
    left.addEventListener("click", () => moveTeam(i, i - 1));
    const right = el("button", null, "›");
    right.title = "Posunout doprava"; right.setAttribute("aria-label", `Posunout tým ${t.name} doprava`);
    right.disabled = i === state.teams.length - 1;
    right.addEventListener("click", () => moveTeam(i, i + 1));
    move.append(left, right);

    card.draggable = true;
    name.draggable = false;
    card.addEventListener("dragstart", (e) => {
      if (e.target.closest("input")) return e.preventDefault();
      dragFrom = i;
      e.dataTransfer.setData("text/plain", String(i));
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => { card.classList.remove("dragging"); dragFrom = null; hideDropLine(); });

    card.append(avatar, name, scoreRow, tools, move);
    wrap.appendChild(card);
  });

  // ve velkém zobrazení dlaždice (+) pro přidání týmu
  const canAdd = big && state.teams.length < MAX_TEAMS;
  wrap.style.setProperty("--cols", Math.min(4, state.teams.length + (canAdd ? 1 : 0)));

  if (canAdd) {
    const add = el("button", "add-team");
    add.innerHTML = '<i class="ph ph-plus"></i><span>Přidat tým</span>';
    add.title = "Přidat tým";
    add.setAttribute("aria-label", "Přidat tým");
    add.addEventListener("click", addTeam);
    wrap.appendChild(add);
  }
  if (state.view === "results") renderResults();
}

// i = index týmu, nebo "all" pro všechny týmy najednou
// force = ruční úprava v nastavení (−/+), ta jde vždy; klávesy a klepnutí jen během kvízu
function addPoints(i, delta, force = false) {
  if (state.locked) return;
  if (!force && !scoringActive()) return;
  const idx = i === "all" ? state.teams.map((_, j) => j) : state.teams[i] ? [i] : [];
  if (!idx.length) return;
  idx.forEach((j) => (state.teams[j].score += delta));
  logEvent("points", { delta, all: i === "all" && idx.length > 1, manual: force, who: idx.map((j) => teamRef(state.teams[j])) });
  renderTeams();
  save();
  for (const j of idx) {
    const card = $("teams").children[j];
    card.classList.add("bump");
    setTimeout(() => card.classList.remove("bump"), 160);
    const f = el("span", "float" + (delta < 0 ? " minus" : ""), delta > 0 ? `+${delta}` : String(delta));
    card.appendChild(f);
    setTimeout(() => f.remove(), 800);
  }
}

// tým vznikne až po výběru emoji; zavření nabídky bez výběru tým nepřidá
function addTeam(e) {
  e?.stopPropagation(); // jinak by klik hned zavřel výběr emoji
  if (state.teams.length >= MAX_TEAMS) return;
  openEmojiPicker("new", e?.currentTarget || document.querySelector(".add-team"));
}

/* ---------- Přetahování týmů: jedna čára uprostřed mezery mezi kartami ---------- */
let dragFrom = null;
const dropLine = el("div", "drop-line");

// index vložení podle středů karet (0 = před první, n = za poslední)
function dropIndex(e) {
  const cards = [...$("teams").querySelectorAll(".team")];
  return cards.filter((c) => { const r = c.getBoundingClientRect(); return e.clientX > r.left + r.width / 2; }).length;
}
function showDropLine(k) {
  const wrap = $("teams");
  const cards = [...wrap.querySelectorAll(".team")];
  // vložení na místo, odkud karta pochází, nic nemění – čáru neukazovat
  if (!cards.length || k === dragFrom || k === dragFrom + 1) return hideDropLine();
  const gap = parseFloat(getComputedStyle(wrap).columnGap) || 20;
  const ref = cards[Math.min(k, cards.length - 1)];
  const x = k < cards.length ? ref.offsetLeft - gap / 2 : ref.offsetLeft + ref.offsetWidth + gap / 2;
  dropLine.style.left = `${x}px`;
  dropLine.style.top = `${ref.offsetTop}px`;
  dropLine.style.height = `${ref.offsetHeight}px`;
  if (dropLine.parentNode !== wrap) wrap.appendChild(dropLine);
}
function hideDropLine() { dropLine.remove(); }

$("teams").addEventListener("dragover", (e) => {
  if (dragFrom === null) return;
  e.preventDefault();
  showDropLine(dropIndex(e));
});
$("teams").addEventListener("dragleave", (e) => { if (!$("teams").contains(e.relatedTarget)) hideDropLine(); });
$("teams").addEventListener("drop", (e) => {
  if (dragFrom === null) return;
  e.preventDefault();
  const k = dropIndex(e);
  const from = dragFrom;
  hideDropLine();
  moveTeam(from, k > from ? k - 1 : k);
});

function moveTeam(from, to) {
  if (from === to || to < 0 || to >= state.teams.length) return;
  const [t] = state.teams.splice(from, 1);
  state.teams.splice(to, 0, t);
  logTeams("move");
  closeEmojiPicker();
  renderTeams();
  save();
}

async function removeTeam(i) {
  if (state.teams.length <= MIN_TEAMS) return;
  const t = state.teams[i];
  const ok = await confirmDialog({
    icon: t.emoji,
    title: `Odebrat tým ${t.name}?`,
    text: t.score ? `Tým má ${t.score} b. Body se ztratí.` : "Tým zmizí ze seznamu.",
    ok: "Odebrat",
    danger: true,
  });
  if (!ok) return;
  state.teams.splice(i, 1);
  logTeams("remove", t);
  renderTeams();
  save();
}

// reset týmů: stejný počet týmů, nové náhodné ikony a názvy (různé), body na nule
async function resetTeams() {
  const ok = await confirmDialog({
    icon: "🔀",
    title: "Resetovat týmy?",
    text: "Počet týmů zůstane, ale každý dostane novou náhodnou ikonu a název a body se vynulují.",
    ok: "Resetovat",
    danger: true,
  });
  if (!ok) return;
  const pool = [...EMOJIS];
  state.teams = Array.from({ length: state.teams.length || 2 }, () => { // bez týmů vytvoří 2 nové
    const em = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    return { name: EMOJI_NAMES[em], emoji: em, color: EMOJI_DATA[em][1], score: 0 };
  });
  logTeams("reset");
  closeEmojiPicker();
  renderTeams();
  save();
}

function renderAdaptive() {
  $("adaptiveToggle").checked = !!state.adaptiveScoring;
  $("diffPoints").hidden = !state.adaptiveScoring;
  document.querySelectorAll("#diffPoints input").forEach((inp) => (inp.value = diffPoints(inp.dataset.diff)));
}
$("adaptiveToggle").addEventListener("change", (e) => {
  state.adaptiveScoring = e.target.checked;
  updateEntry();
  save();
  renderAdaptive();
  if (state.view === "quiz") renderQuestion();
});
document.querySelectorAll("#diffPoints input").forEach((inp) =>
  inp.addEventListener("change", () => {
    const n = Math.min(10, Math.max(1, parseInt(inp.value, 10) || DEFAULT_DIFF_POINTS[inp.dataset.diff]));
    state.diffPoints = { ...state.diffPoints, [inp.dataset.diff]: n };
    inp.value = n;
    updateEntry();
    save();
    if (state.view === "quiz") renderQuestion();
  })
);
renderAdaptive();

async function resetScores() {
  const ok = await confirmDialog({
    icon: "🧹",
    title: "Vynulovat body?",
    text: "Všem týmům se nastaví 0 bodů. Týmy zůstanou.",
    ok: "Vynulovat",
    danger: true,
  });
  if (!ok) return;
  state.teams.forEach((t) => (t.score = 0));
  logTeams("resetScores");
  renderTeams();
  save();
}

$("resetTeamsBtn").addEventListener("click", resetTeams);
$("resetScoresBtn").addEventListener("click", resetScores);
// tlačítko v malé liště – zastavit klik, jinak by ho zachytil i klik na lištu
$("barSettings").addEventListener("click", (e) => { e.stopPropagation(); toggleTeamsLayout(); });

/* ---------- Výběr emoji ---------- */
// emoji: [název týmu, barva týmu]
const EMOJI_DATA = {
  "🦊": ["Lišky", "#e0702f"], "🐻": ["Medvědi", "#8a5a3b"], "🦉": ["Sovy", "#7656c2"],
  "🐺": ["Vlci", "#3f6fb0"], "🦌": ["Jeleni", "#b8862a"], "🦔": ["Ježci", "#c24f7c"],
  "🐿️": ["Veverky", "#21958a"], "🦡": ["Jezevci", "#5d6a75"], "🐗": ["Divočáci", "#4c8a35"],
  "🐰": ["Zajíci", "#d77a9c"], "🦝": ["Mývalové", "#6b6f8a"], "🦫": ["Bobři", "#9a6a3a"],
  "🐸": ["Žáby", "#3fa34d"], "🐍": ["Hadi", "#6b8e23"], "🦎": ["Ještěrky", "#2fa37a"],
  "🐢": ["Želvy", "#4f8f6a"], "🦅": ["Orli", "#7a4e2d"], "🐦": ["Ptáci", "#3a8fd1"],
  "🦆": ["Kachny", "#c99a12"], "🦇": ["Netopýři", "#4b3f72"], "🐭": ["Myšky", "#8f8fa0"],
  "🦋": ["Motýli", "#2f7fe0"], "🐝": ["Včely", "#d99a00"], "🐞": ["Berušky", "#d6332f"],
  "🐌": ["Šneci", "#b07a4a"], "🕷️": ["Pavouci", "#45454f"], "🐼": ["Pandy", "#4a4f57"],
  "🐨": ["Koaly", "#7f8c99"], "🐯": ["Tygři", "#ef7f1a"], "🦁": ["Lvi", "#cf9520"],
  "🐮": ["Kravičky", "#6d7a86"], "🐷": ["Prasátka", "#e2708f"], "🐵": ["Opice", "#9b6b43"],
  "🐧": ["Tučňáci", "#2c4a6b"], "🐙": ["Chobotnice", "#d1495b"], "🦈": ["Žraloci", "#4f7d9c"],
  "🦄": ["Jednorožci", "#b061d6"], "🐲": ["Draci", "#2f9e5b"], "🦖": ["Dinosauři", "#5a9e3c"],
  "🌲": ["Smrky", "#2d6a45"], "🍄": ["Houby", "#c0392b"], "🌻": ["Slunečnice", "#d8a417"],
  "🍀": ["Čtyřlístky", "#3aa655"], "⭐": ["Hvězdy", "#d9a91c"], "🔥": ["Plameny", "#e8501d"],
  "⚡": ["Blesky", "#e0b020"], "🚀": ["Rakety", "#5865f2"], "👑": ["Králové", "#c99a2e"],
  // netradiční zvířata
  "🦩": ["Plameňáci", "#e2588a"], "🦥": ["Lenochodi", "#8c7a5b"], "🦦": ["Vydry", "#7b5a3c"],
  "🦨": ["Skunkové", "#4a4a5a"], "🦘": ["Klokani", "#c17a3a"], "🦒": ["Žirafy", "#d39a2b"],
  "🦓": ["Zebry", "#555a62"], "🦚": ["Pávi", "#1f8f8a"], "🦜": ["Papoušci", "#2fa84f"],
  "🦭": ["Tuleni", "#6d8496"], "🐡": ["Čtverzubci", "#c39a1f"], "🦑": ["Olihně", "#e0614a"],
  "🦞": ["Humři", "#c8382c"], "🦀": ["Krabi", "#e04b2a"], "🪼": ["Medúzy", "#9b6bd6"],
  "🦤": ["Dodové", "#7d8f6a"], "🐳": ["Velryby", "#3a7bd5"], "🦢": ["Labutě", "#7d93a8"],
  // postavy a bytosti
  "👽": ["Mimozemšťani", "#3fae6b"], "🤖": ["Roboti", "#607d8b"], "👻": ["Duchové", "#8e8ea0"],
  "🧙": ["Čarodějové", "#6a4fb3"], "🧛": ["Upíři", "#9b2346"], "🧟": ["Zombíci", "#5d8a4a"],
  "🥷": ["Nindžové", "#3b3b4f"], "🦸": ["Superhrdinové", "#d63a3a"], "🏴‍☠️": ["Piráti", "#3f3f48"],
  "👸": ["Princezny", "#d65a9c"], "🧚": ["Víly", "#8a6fd6"],
  // věci a jídlo
  "🌵": ["Kaktusy", "#4f9a4a"], "🍕": ["Pizzy", "#e0922f"], "🥑": ["Avokáda", "#6b9a2f"],
  "🍩": ["Donuty", "#d46a9a"], "🎸": ["Kytary", "#c0502f"], "🛸": ["UFO", "#5f7fa8"],
  "💎": ["Diamanty", "#3a9fd1"],
};
const EMOJI_NAMES = Object.fromEntries(Object.entries(EMOJI_DATA).map(([e, [n]]) => [e, n]));
const EMOJIS = Object.keys(EMOJI_DATA);
let pickerTeam = null;

function openEmojiPicker(i, anchor) {
  const picker = $("emojiPicker");
  if (pickerTeam === i && !picker.hidden) return closeEmojiPicker();
  pickerTeam = i;
  const isNew = i === "new";
  const team = isNew ? { emoji: null, color: "var(--accent)" } : state.teams[i];
  const used = new Set(state.teams.filter((_, j) => j !== i).map((t) => t.emoji));
  const grid = $("emojiGrid");
  grid.innerHTML = "";

  const choose = (em) => {
      if (isNew) {
        if (state.teams.length >= MAX_TEAMS) return closeEmojiPicker();
        state.teams.push({ name: EMOJI_NAMES[em], emoji: em, color: EMOJI_DATA[em][1], score: 0 });
        logTeams("add", state.teams[state.teams.length - 1]);
        closeEmojiPicker();
        renderTeams();
        save();
        $("teams").children[state.teams.length - 1]?.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
      team.emoji = em;
      team.color = EMOJI_DATA[em][1];
      if (!team.customName) team.name = EMOJI_NAMES[em];
      logTeams("icon", team);
      closeEmojiPicker();
      renderTeams();
      save();
  };

  // velká dlaždice 2×2: náhodná ikona, kterou nemá jiný tým
  const random = el("button", "emoji emoji-random");
  random.innerHTML = '<i class="ph ph-shuffle" aria-hidden="true"></i><span>Náhodně</span>';
  random.addEventListener("click", () => {
    const pool = EMOJIS.filter((em) => !used.has(em) && em !== team.emoji);
    choose(pool[Math.floor(Math.random() * pool.length)]);
  });
  grid.appendChild(random);

  for (const em of EMOJIS) {
    const b = el("button", "emoji" + (em === team.emoji ? " current" : "") + (used.has(em) ? " used" : ""), em);
    b.title = EMOJI_DATA[em][0] + (used.has(em) ? " (používá jiný tým)" : "");
    b.style.setProperty("--c", EMOJI_DATA[em][1]);
    b.addEventListener("click", () => choose(em));
    grid.appendChild(b);
  }
  picker.style.setProperty("--team", team.color);
  picker.hidden = false;

  const r = anchor.getBoundingClientRect();
  const w = picker.offsetWidth;
  picker.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
  const h = picker.offsetHeight;
  const above = r.top - h - 10;
  picker.style.top = (above >= 8 ? above : Math.min(r.bottom + 10, innerHeight - h - 8)) + "px";
  grid.querySelector(".current, .emoji-random")?.focus();
}
function closeEmojiPicker() {
  $("emojiPicker").hidden = true;
  pickerTeam = null;
}
document.addEventListener("click", (e) => {
  if (!$("emojiPicker").hidden && !e.target.closest("#emojiPicker")) closeEmojiPicker();
});
addEventListener("resize", closeEmojiPicker);
$("teams").addEventListener("scroll", closeEmojiPicker);

/* ---------- Potvrzovací dialog ---------- */
function confirmDialog(opts) {
  return askDialog(opts).then((v) => v === "ok");
}
// dialog s volitelnou třetí volbou (alt); vrací "ok", "alt", nebo "cancel"/""
function askDialog({ icon = "❓", title, text = "", ok = "Potvrdit", alt = "", altDanger = false, danger = false }) {
  const d = $("confirmDialog");
  $("confirmAlt").hidden = !alt;
  $("confirmAlt").classList.toggle("danger-text", altDanger);
  $("confirmAlt").textContent = alt;
  d.querySelector(".confirm-actions").classList.toggle("stack", !!alt);
  $("confirmIcon").textContent = icon;
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = text;
  $("confirmOk").textContent = ok;
  $("confirmOk").classList.toggle("danger", danger);
  d.returnValue = "";
  closeEmojiPicker();
  d.showModal();
  $("confirmOk").focus();
  return new Promise((resolve) => {
    d.addEventListener("close", () => resolve(d.returnValue), { once: true });
  });
}
// kliknutí na pozadí dialog zavře
$("helpDialog").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$("confirmDialog").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close("cancel"); });

/* ---------- Celá obrazovka & nápověda ---------- */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
document.addEventListener("fullscreenchange", () => {
  const fs = !!document.fullscreenElement;
  $("fsIcon").className = "ph " + (fs ? "ph-corners-in" : "ph-corners-out");
  $("fsLabel").textContent = fs ? "Ukončit celou obrazovku" : "Celá obrazovka";
});

/* ---------- Menu (hamburger) ---------- */
function openMenu() {
  closeEmojiPicker();
  $("menuPanel").hidden = false;
  $("menuBtn").setAttribute("aria-expanded", "true");
  $("menuPanel").querySelector("button:not([hidden])")?.focus();
}
function closeMenu() {
  $("menuPanel").hidden = true;
  $("menuBtn").setAttribute("aria-expanded", "false");
}
$("menuBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("menuPanel").hidden ? openMenu() : closeMenu();
});
document.addEventListener("click", (e) => {
  if (!$("menuPanel").hidden && !e.target.closest(".menu")) closeMenu();
});
const menuAction = (fn) => () => { closeMenu(); fn(); };
$("menuTeams").addEventListener("click", menuAction(() => toggleTeamsLayout()));
$("menuArchive").addEventListener("click", menuAction(openArchive));
$("menuFullscreen").addEventListener("click", menuAction(toggleFullscreen));
$("menuHelp").addEventListener("click", menuAction(() => $("helpDialog").showModal()));
document.querySelectorAll("[data-demo]").forEach((b) =>
  b.addEventListener("click", menuAction(() => loadDemoQuiz(b.dataset.demo)))
);

/* ---------- Ukázkový kvíz (bez Claude API) ---------- */
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadDemoQuiz(file) {
  if (state.locked) exitReview();
  try {
    const res = await fetch(file, { cache: "no-cache" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    leaveCurrent();
    state.quiz = {
      topic: data.topic,
      level: data.level,
      // mix: otázky v náhodném pořadí, ať obtížnosti nejdou popořadě
      questions: (data.level === "mix" ? shuffleArr(data.questions) : data.questions)
        .map((q) => ({ ...q, picked: null, revealed: false })),
    };
    state.index = 0;
    archiveStart("demo");
    if (state.bigTeams) { state.bigTeams = false; applyTeamsLayout(); }
    show("quiz");
  } catch {
    show("setup");
    showError("Ukázkový kvíz se nepodařilo načíst.");
  }
}

/* ---------- Velké / malé zobrazení týmů ---------- */
function applyTeamsLayout() {
  const big = !!state.bigTeams;
  document.body.classList.toggle("teams-big", big);
  $("menuTeamsLabel").textContent = big ? "Zavřít nastavení" : "Nastavení";
  renderHeader();
  renderTeams();
}
// hlavička jako v nastavení (název + zavírací křížek místo menu) pro nastavení, archiv a archivní kvíz
// hlavička jako v nastavení (název + zavírací křížek místo hamburger menu):
// běžící kvíz, archiv a archivní kvíz; hamburger menu jen na zadání a při načítání
function renderHeader() {
  const big = !!state.bigTeams;
  const liveQuiz = !state.locked && !!state.quiz && (state.view === "quiz" || state.view === "results");
  const closeHead = !big && (!!state.locked || state.view === "archive" || liveQuiz);
  document.body.classList.toggle("close-head", closeHead);
  const title = $("headerTitle");
  title.innerHTML = "";
  if (!closeHead) return (title.textContent = "Nastavení");
  let label;
  if (liveQuiz) {
    title.append(state.quiz.topic, el("span", "header-sub", LEVEL_NAMES[state.quiz.level]));
    label = isFinished(liveEntry()) ? "Zavřít kvíz (zůstane v archivu)" : "Opustit kvíz (uloží se mezi rozehrané)";
  } else {
    title.append("Archiv");
    if (state.locked) {
      title.append(el("span", "header-sub", `${state.quiz.topic} · ${LEVEL_NAMES[state.quiz.level]} · ${fmtDate(state.entry.createdAt)}`));
    }
    label = (!state.locked ? "Zavřít archiv" : state.view === "quiz" ? "Zpět na výsledky" : "Zavřít archivní kvíz") + " (Esc)";
  }
  $("closeReviewBtn").title = label;
  $("closeReviewBtn").setAttribute("aria-label", label);
}
function toggleTeamsLayout() {
  if (state.locked) return; // archivní kvíz nejde nastavovat
  state.bigTeams = !state.bigTeams;
  closeEmojiPicker();
  applyTeamsLayout();
  save();
}
$("closeSettingsBtn").addEventListener("click", (e) => { e.stopPropagation(); toggleTeamsLayout(); });
// mimo běžící kvíz: kliknutí kamkoli do lišty týmů otevře nastavení týmů
document.querySelector(".scoreboard").addEventListener("click", (e) => {
  if (!state.bigTeams && !scoringActive() && !state.locked) { e.stopPropagation(); toggleTeamsLayout(); }
});

/* ---------- Klávesnice ---------- */
document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector("dialog[open]")) return;
  if (!$("menuPanel").hidden) {
    if (e.key === "Escape") { closeMenu(); $("menuBtn").focus(); }
    return;
  }
  if (!$("emojiPicker").hidden) {
    if (e.key === "Escape") closeEmojiPicker();
    if (e.key === "Escape" || e.key === " " || e.key === "Enter" || e.key.startsWith("Arrow")) return;
  }

  // 1–4 = tým, 0 = všechny týmy (horní řada i numerická klávesnice), Shift = odečíst
  const m = e.code.match(/^(?:Digit|Numpad)([0-4])$/);
  if (m) {
    e.preventDefault();
    const pts = questionPoints();
    addPoints(m[1] === "0" ? "all" : Number(m[1]) - 1, e.shiftKey ? -pts : pts);
    return;
  }
  if (e.key === "?") return $("helpDialog").showModal();
  if (e.key === "Escape" && state.locked) return closeReview();
  if (e.key === "Escape" && state.view === "archive") return closeArchive();
  if (e.key === "f" || e.key === "F") return toggleFullscreen();
  if (e.key === "t" || e.key === "T") return toggleTeamsLayout();
  if (state.bigTeams) return;

  // A = archiv; na obrazovce s otázkou běžícího kvízu zůstává A výběrem odpovědi
  if ((e.key === "a" || e.key === "A") && (state.view !== "quiz" || state.locked)) {
    return state.view === "archive" ? closeArchive() : openArchive();
  }
  if (state.view === "results" && e.key === "ArrowLeft") return show("quiz");
  if (state.view !== "quiz") return;

  const k = e.key.toLowerCase();
  if (k === "a" || k === "b" || k === "c") pick(k);
  else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    currentQ()?.revealed ? go(1) : reveal();
  } else if (e.key === "ArrowRight") { flashButton("nextBtn"); go(1); }
  else if (e.key === "ArrowLeft") { flashButton("prevBtn"); go(-1); }
});

/* ---------- Archiv ---------- */
// každý kvíz se ukládá i s celým průběhem (timeline): navigace, odpovědi, body, změny týmů.
// Archivní kvízy jsou jen ke čtení – otevírají se v zamčeném stavu (state.locked).
const ARCHIVE_KEY = "kviz-archive-v1";
let archive = (() => {
  try { const a = JSON.parse(localStorage.getItem(ARCHIVE_KEY)); return Array.isArray(a) ? a : []; } catch { return []; }
})();
let liveState = null; // živý stav aplikace, zatímco je otevřený archivní kvíz

function saveArchive() {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive)); } catch {}
}
const teamRef = (t) => ({ name: t.name, emoji: t.emoji, color: t.color });
const teamSnap = () => state.teams.map((t) => ({ ...teamRef(t), score: t.score }));
const liveEntry = () =>
  !state.locked && state.quiz?.archiveId ? archive.find((e) => e.id === state.quiz.archiveId) : null;

// nový záznam v archivu pro právě spuštěný kvíz (legacy = kvíz rozehraný před zavedením archivu)
function archiveStart(source, request = null, legacy = false) {
  const now = Date.now();
  const entry = {
    id: crypto.randomUUID?.() || now.toString(36) + Math.random().toString(36).slice(2),
    createdAt: now,
    updatedAt: now,
    source,
    request,
    topic: state.quiz.topic,
    level: state.quiz.level,
    questions: state.quiz.questions.map(({ picked, revealed, ...q }) => q),
    adaptive: !!state.adaptiveScoring,
    diffPoints: { ...state.diffPoints },
    startTeams: teamSnap(),
    teams: teamSnap(),
    events: [{ t: now, type: "start", q: null, scores: teamSnap() }],
  };
  if (legacy) {
    state.quiz.questions.forEach((q, i) => {
      if (q.picked) entry.events.push({ t: now, type: "pick", q: i, key: q.picked, correct: q.picked === q.correct });
      else if (q.revealed) entry.events.push({ t: now, type: "reveal", q: i });
    });
  }
  archive.unshift(entry);
  state.quiz.archiveId = entry.id;
  saveArchive();
  save();
}

// zápis události do timeline běžícího kvízu
function logEvent(type, data = {}) {
  const entry = liveEntry();
  if (!entry) return;
  const q = "q" in data ? data.q : state.view === "quiz" ? state.index : null;
  const last = entry.events[entry.events.length - 1];
  // navigace: nezapisovat znovu otázku, u které se už stojí (např. po reloadu)
  if (type === "question" && last && last.type !== "results" && last.q === q) return;
  if (type === "results" && last?.type === "results") return;
  const ev = { t: Date.now(), type, ...data, q };
  if (type === "points" || type === "teams") ev.scores = teamSnap();
  entry.events.push(ev);
  updateEntry(false);
  saveArchive();
}
function logTeams(action, team) {
  logEvent("teams", { action, ...(team ? { team: teamRef(team) } : {}) });
}
// průběžně aktualizovat výsledný stav týmů a bodování v záznamu
function updateEntry(persist = true) {
  const entry = liveEntry();
  if (!entry) return;
  entry.teams = teamSnap();
  entry.adaptive = !!state.adaptiveScoring;
  entry.diffPoints = { ...state.diffPoints };
  entry.updatedAt = Date.now();
  if (persist) saveArchive();
}

/* --- přehled archivu --- */
const fmtDate = (ts) =>
  new Date(ts).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const plural = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
// dokončený = došlo se až na výsledky; ostatní jsou rozehrané a jde v nich pokračovat
const isFinished = (entry) => !!entry?.events.some((e) => e.type === "results");
const questionMarks = (entry) => {
  const marks = entry.questions.map(() => ({ picked: null, revealed: false }));
  for (const ev of entry.events) {
    if (!marks[ev.q]) continue;
    if (ev.type === "pick") { marks[ev.q].picked = ev.key; marks[ev.q].revealed = true; }
    if (ev.type === "reveal") marks[ev.q].revealed = true;
  }
  return marks;
};

// odejít z běžícího kvízu – zůstává v archivu (rozehraný, nebo dokončený)
function leaveCurrent() {
  if (!state.quiz) return;
  logEvent("leave", { q: null });
  state.quiz = null;
}
// křížek v hlavičce: po potvrzení odejít z kvízu a vynulovat body (v kvízu se dá pokračovat i s jeho body)
// dokončený kvíz je v archivu automaticky; nedokončený jde uložit mezi rozehrané, nebo zahodit
async function leaveQuiz() {
  const entry = liveEntry();
  const finished = isFinished(entry);
  const choice = await askDialog(
    finished
      ? {
          icon: "🏆",
          title: "Opustit kvíz?",
          text: "Kvíz je dokončený a zůstane v archivu i s výsledky a průběhem. Body týmů se vynulují.",
          ok: "Opustit kvíz",
        }
      : {
          icon: "⏸️",
          title: "Opustit nedokončený kvíz?",
          text: "Ulož ho mezi rozehrané a později v něm pokračuj i s body, nebo ho opusť bez uložení – pak se smaže. Body týmů se v obou případech vynulují.",
          ok: "Uložit do rozehraných",
          alt: "Opustit bez uložení",
          altDanger: true,
        }
  );
  if (choice !== "ok" && choice !== "alt") return;
  closeQuiz();
  if (choice === "alt" && entry) {
    archive = archive.filter((e) => e.id !== entry.id);
    saveArchive();
  }
  show("setup");
}
// uzavřít běžící kvíz (zůstává v archivu) a vynulovat body týmů
function closeQuiz() {
  leaveCurrent();
  state.teams.forEach((t) => (t.score = 0));
}
// pokračovat v rozehraném kvízu: otázky, odpovědi, týmy a body tak, jak byly
function resumeQuiz(id) {
  const entry = archive.find((e) => e.id === id);
  if (!entry) return;
  leaveCurrent();
  const marks = questionMarks(entry);
  state.quiz = {
    topic: entry.topic,
    level: entry.level,
    archiveId: entry.id,
    questions: entry.questions.map((q, i) => ({ ...q, ...marks[i] })),
  };
  const lastQ = [...entry.events].reverse().find((e) => e.q != null)?.q;
  state.index = lastQ != null && lastQ < entry.questions.length ? lastQ : 0;
  state.teams = entry.teams.map((t) => ({ ...t }));
  state.adaptiveScoring = entry.adaptive;
  state.diffPoints = { ...entry.diffPoints };
  renderAdaptive();
  logEvent("resume", { q: null });
  show("quiz");
}

const revealedCount = (entry) =>
  new Set(entry.events.filter((e) => e.type === "pick" || e.type === "reveal").map((e) => e.q)).size;

function openArchive() {
  if (state.locked) return exitReview();
  if (state.view === "loading") return; // během generování ne – výsledek by se zapsal jinam
  closeEmojiPicker();
  if (state.bigTeams) { state.bigTeams = false; applyTeamsLayout(); }
  if (state.view !== "archive") state.archiveFrom = state.view;
  show("archive");
}
function closeArchive() {
  const from = state.archiveFrom;
  show(state.quiz ? (from === "results" ? "results" : "quiz") : "setup");
}

function renderArchive() {
  const ai = archive.filter((e) => e.source === "ai");
  const demo = archive.filter((e) => e.source === "demo");
  const stats = $("archiveStats");
  stats.innerHTML = "";
  const tile = (value, label) => {
    const d = el("div", "card stat");
    d.append(el("b", null, String(value)), el("span", null, label));
    stats.appendChild(d);
  };
  tile(ai.length, "vygenerovaných kvízů");
  tile(ai.reduce((s, e) => s + e.questions.length, 0), "vygenerovaných otázek");
  if (demo.length) tile(demo.length, "ukázkových kvízů");

  const list = $("archiveList");
  list.innerHTML = "";
  if (!archive.length) {
    list.appendChild(el("p", "card archive-empty", "Zatím tu žádný kvíz není. Každý nový kvíz se sem uloží automaticky."));
    return;
  }
  const liveId = state.quiz?.archiveId;
  const playing = archive.filter((e) => !isFinished(e));
  const done = archive.filter(isFinished);
  if (playing.length) {
    list.appendChild(el("h2", "archive-section", "Rozehrané"));
    playing.forEach((e) => list.appendChild(archiveItem(e, liveId)));
  }
  list.appendChild(el("h2", "archive-section", "Archiv"));
  if (!done.length) list.appendChild(el("p", "card archive-empty", "Zatím žádný dokončený kvíz. Kvíz se sem přesune, až dojdeš na výsledky."));
  done.forEach((e) => list.appendChild(archiveItem(e, liveId)));
}

// rozehraný kvíz = pokračovat ve hře, dokončený = zamčené prohlížení
function archiveItem(entry, liveId) {
    const finished = isFinished(entry);
    const item = el("div", "card archive-item");
    const open = el("button", "archive-open");
    open.setAttribute("aria-label", `${finished ? "Zobrazit" : "Pokračovat v kvízu"} ${entry.topic}`);
    open.addEventListener("click", () =>
      entry.id === liveId ? openReview(entry.id) : finished ? openReview(entry.id) : resumeQuiz(entry.id)
    );

    const main = el("div", "archive-main");
    main.append(el("div", "archive-topic", entry.topic));
    const meta = el("div", "archive-meta");
    meta.append(el("span", null, fmtDate(entry.createdAt)));
    meta.append(el("span", "pill", LEVEL_NAMES[entry.level] || entry.level));
    meta.append(el("span", null, `${revealedCount(entry)} / ${plural(entry.questions.length, "otázka", "otázky", "otázek")}`));
    if (entry.source === "demo") meta.append(el("span", "pill", "ukázka"));
    if (entry.source === "remix") meta.append(el("span", "pill", "nové pořadí"));
    if (entry.id === liveId) meta.append(el("span", "pill live", "probíhá"));
    main.appendChild(meta);

    const teams = el("div", "archive-teams");
    const max = Math.max(...entry.teams.map((t) => t.score));
    for (const t of entry.teams) {
      const chip = el("span", "archive-team" + (max > 0 && t.score === max ? " win" : ""), `${t.emoji} ${t.score}`);
      chip.style.setProperty("--team", t.color);
      chip.title = `${t.name}: ${t.score} b.`;
      teams.appendChild(chip);
    }

    const go = el("i", "ph ph-" + (entry.id === liveId || !finished ? "play" : "lock-simple"));
    go.setAttribute("aria-hidden", "true");
    open.append(main, teams, go);
    item.append(open);

    // hrát znovu (jen dokončené)
    if (finished && entry.id !== liveId) {
      const replay = el("button", "icon-btn archive-replay");
      replay.innerHTML = '<i class="ph ph-arrows-clockwise" aria-hidden="true"></i>';
      replay.title = "Hrát znovu";
      replay.setAttribute("aria-label", `Hrát znovu kvíz ${entry.topic}`);
      replay.addEventListener("click", () => replayEntry(entry.id));
      item.append(replay);
    }
    // smazání (běžící kvíz ne – nejdřív ho zavři)
    if (entry.id !== liveId) {
      const del = el("button", "icon-btn archive-del");
      del.innerHTML = '<i class="ph ph-trash" aria-hidden="true"></i>';
      del.title = "Smazat kvíz";
      del.setAttribute("aria-label", `Smazat kvíz ${entry.topic}`);
      del.addEventListener("click", () => deleteEntry(entry.id));
      item.append(del);
    }
    return item;
}

// hrát archivní kvíz znovu: nové otázky od AI na stejné téma, nebo stejné otázky v novém pořadí
async function replayEntry(id) {
  const entry = archive.find((e) => e.id === id);
  if (!entry) return;
  const topic = entry.topic.replace(/\s*\(ukázkový kvíz\)\s*$/, "");
  const choice = await askDialog({
    icon: "🔁",
    title: "Hrát kvíz znovu?",
    text: `„${topic}“ · ${LEVEL_NAMES[entry.level] || entry.level} · ${plural(entry.questions.length, "otázka", "otázky", "otázek")}. AI může vygenerovat nové otázky na stejné téma, nebo zahraj stejné otázky v jiném pořadí.`,
    ok: "Nové otázky od AI",
    alt: "Stejné otázky, nové pořadí",
  });
  if (choice !== "ok" && choice !== "alt") return;
  if (state.locked) exitReview();
  leaveCurrent();
  if (choice === "ok") {
    return generateQuiz({
      topic,
      randomTopic: false,
      instructions: entry.request?.instructions || "",
      count: entry.questions.length,
      level: entry.level,
    });
  }
  state.quiz = {
    topic: entry.topic,
    level: entry.level,
    questions: shuffleArr(entry.questions).map((q) => ({ ...q, picked: null, revealed: false })),
  };
  state.index = 0;
  archiveStart("remix", entry.request);
  show("quiz");
}
$("replayBtn").addEventListener("click", () => state.locked && replayEntry(state.entry.id));

async function deleteEntry(id) {
  const entry = archive.find((e) => e.id === id);
  if (!entry || entry.id === state.quiz?.archiveId) return;
  const ok = await confirmDialog({
    icon: "🗑️",
    title: "Smazat kvíz?",
    text: `„${entry.topic}“ z ${fmtDate(entry.createdAt)} se i s průběhem a výsledky natrvalo smaže.`,
    ok: "Smazat",
    danger: true,
  });
  if (!ok) return;
  archive = archive.filter((e) => e.id !== id);
  saveArchive();
  renderArchive();
}

/* --- zamčené prohlížení archivního kvízu --- */
// force = otevřít zamčeně i běžící kvíz (z jeho výsledků)
function openReview(id, force = false) {
  const entry = archive.find((e) => e.id === id);
  if (!entry) return;
  if (!force && entry.id === state.quiz?.archiveId) return show(state.archiveFrom === "results" ? "results" : "quiz"); // běžící kvíz jde dál hrát
  const marks = questionMarks(entry);
  liveState = state;
  state = {
    locked: true,
    entry,
    view: "results",
    index: 0,
    quiz: {
      topic: entry.topic,
      level: entry.level,
      // všechny odpovědi odhalené; neodhalené během kvízu jsou označené
      questions: entry.questions.map((q, i) => ({ ...q, picked: marks[i].picked, revealed: true, skipped: !marks[i].revealed })),
    },
    teams: entry.teams.map((t) => ({ ...t })),
    gains: null,
    bigTeams: false,
    adaptiveScoring: entry.adaptive,
    diffPoints: entry.diffPoints,
  };
  closeMenu();
  closeEmojiPicker();
  applyTeamsLayout();
  show("results"); // nejdřív přehled výsledků a průběhu, odtud šipkou na otázky
}
function exitReview() {
  if (!state.locked) return;
  state = liveState;
  liveState = null;
  applyTeamsLayout();
  renderAdaptive();
  show("archive");
}
// křížek / Esc: z otázek zpět na výsledky s průběhem kvízu, z výsledků do archivu
function closeReview() {
  if (state.view === "quiz") show("results");
  else exitReview();
}
$("closeReviewBtn").addEventListener("click", () =>
  state.locked ? closeReview() : state.view === "archive" ? closeArchive() : leaveQuiz()
);

// stav týmů v archivním kvízu: u otázky body po poslední akci u ní, ve výsledcích konečné
function syncReviewTeams() {
  const { entry } = state;
  if (state.view !== "quiz") {
    state.teams = entry.teams.map((t) => ({ ...t }));
    state.gains = null;
    return;
  }
  const i = state.index;
  const snaps = new Map(); // otázka → stav týmů po poslední akci u ní
  const acted = new Set();
  let snap = entry.startTeams;
  for (const ev of entry.events) {
    if (ev.scores) snap = ev.scores;
    if (ev.q == null) continue;
    const isAction = ev.type !== "question";
    if (isAction) acted.add(ev.q);
    if (isAction || !acted.has(ev.q)) snaps.set(ev.q, snap);
  }
  let k = i;
  while (k >= 0 && !snaps.has(k)) k--;
  state.teams = (k >= 0 ? snaps.get(k) : entry.startTeams).map((t) => ({ ...t }));
  state.gains = questionGains(entry, i);
}
// součet bodů, které týmy dostaly u otázky i (podle ikony – ta je mezi týmy jedinečná)
function questionGains(entry, i) {
  const gains = {};
  for (const ev of entry.events) {
    if (ev.type !== "points" || ev.q !== i) continue;
    for (const t of ev.who) gains[t.emoji] = (gains[t.emoji] || 0) + ev.delta;
  }
  return gains;
}

function renderReviewNote() {
  const note = $("reviewNote");
  note.hidden = !state.locked || !state.entry?.startTeams.length;
  if (note.hidden) return;
  note.innerHTML = "";
  const gains = questionGains(state.entry, state.index);
  const teams = new Map();
  for (const ev of state.entry.events)
    if (ev.type === "points" && ev.q === state.index) ev.who.forEach((t) => teams.set(t.emoji, t));
  const icon = el("i", "ph ph-trophy");
  icon.setAttribute("aria-hidden", "true");
  note.append(icon);
  const scored = [...teams.values()].filter((t) => gains[t.emoji]);
  if (!scored.length) return note.append(el("span", null, "U této otázky nikdo body nedostal."));
  note.append(el("span", null, "Body za otázku:"));
  for (const t of scored) {
    const g = gains[t.emoji];
    const chip = el("span", "archive-team" + (g < 0 ? " minus" : ""), `${t.emoji} ${t.name} ${g > 0 ? "+" : ""}${g}`);
    chip.style.setProperty("--team", t.color);
    note.append(chip);
  }
}

function renderQuizInfo(view) {
  const info = $("quizInfo");
  info.innerHTML = "";
  if (!state.quiz || view === "setup" || view === "archive" || state.locked) return;
  info.append(`${state.quiz.topic} · ${LEVEL_NAMES[state.quiz.level]}`);
}

// celý průběh kvízu v časové ose; klik na řádek s otázkou ji otevře
const TEAM_ACTIONS = {
  add: (t) => `Přidán tým ${t.emoji} ${t.name}`,
  remove: (t) => `Odebrán tým ${t.emoji} ${t.name}`,
  rename: (t) => `Tým přejmenován na ${t.emoji} ${t.name}`,
  icon: (t) => `Nová ikona týmu ${t.emoji} ${t.name}`,
  move: () => "Změna pořadí týmů",
  reset: () => "Týmy resetovány",
  resetScores: () => "Body vynulovány",
};
function timelineText(ev, entry) {
  const qn = ev.q != null ? `Otázka ${ev.q + 1}` : "";
  switch (ev.type) {
    case "start": return entry.source === "demo" ? "Start ukázkového kvízu" : entry.source === "remix" ? "Start kvízu (stejné otázky, nové pořadí)" : "Start kvízu";
    case "question": return `${qn}: ${entry.questions[ev.q]?.question ?? ""}`;
    case "pick": return `Odpověď ${ev.key.toUpperCase()} – ${ev.correct ? "správně ✓" : "špatně ✗"}`;
    case "reveal": return "Ukázána správná odpověď";
    case "results": return "🏆 Výsledky";
    case "leave": return "Kvíz zavřen";
    case "resume": return "Pokračování kvízu";
    case "points": {
      const pts = ev.delta > 0 ? `+${ev.delta}` : String(ev.delta);
      const who = ev.all ? "Všem týmům" : ev.who.map((t) => `${t.emoji} ${t.name}`).join(", ");
      return `${who} ${pts}${ev.manual ? " (ručně)" : ""}`;
    }
    case "teams": return (TEAM_ACTIONS[ev.action] || (() => "Změna týmů"))(ev.team || {});
    default: return ev.type;
  }
}
function renderTimeline() {
  const { entry } = state;
  const list = $("timelineList");
  list.innerHTML = "";
  const start = entry.events[0]?.t ?? entry.createdAt;
  for (const ev of entry.events) {
    const li = el("li", "tl-" + ev.type + (ev.type === "points" && ev.delta < 0 ? " tl-minus" : ""));
    const s = Math.max(0, Math.round((ev.t - start) / 1000));
    const time = el("time", null, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    time.dateTime = new Date(ev.t).toISOString();
    time.title = fmtDate(ev.t);
    li.append(time, el("span", "tl-text", timelineText(ev, entry)));
    if (ev.scores?.length && ev.type !== "start") {
      li.append(el("span", "tl-scores", ev.scores.map((t) => `${t.emoji} ${t.score}`).join("  ")));
    }
    if (ev.q != null) {
      li.dataset.q = ev.q;
      li.title = `Otevřít otázku ${ev.q + 1}`;
      li.addEventListener("click", () => goTo(ev.q));
    }
    list.appendChild(li);
  }
}

/* ---------- Start ---------- */
setSetupMode(state.setupMode, false);
setCount($("count").value);
applyTeamsLayout();
if (state.view === "loading" || (!state.quiz && !["setup", "archive"].includes(state.view))) state.view = state.quiz ? "quiz" : "setup";
// kvíz rozehraný před zavedením archivu – uložit ho do archivu dodatečně
if (state.quiz && !state.quiz.archiveId) archiveStart("ai", null, true);
show(state.view);
