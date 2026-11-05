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
const MIN_TEAMS = 2;
const LEVEL_NAMES = { lehka: "Lehká", stredni: "Střední", tezka: "Těžká", hardcore: "Hardcore", mix: "Mix" };
const TOPIC_SUGGESTIONS = ["Sport", "Vesmír", "Česká historie", "Zeměpis", "Příroda", "Film a seriály"];
const LOADING_TIPS = [
  "Vymýšlím chytáky do špatných odpovědí…",
  "Ověřuji, že správná odpověď je opravdu správná…",
  "Píšu vysvětlení ke každé otázce…",
  "Míchám obtížnost…",
  "Ještě chvilku, ladím formulace…",
];
const STORAGE_KEY = "kviz-state-v1";

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
const pointsLabel = (n) => (n === 1 ? "1 bod" : n < 5 ? `${n} body` : `${n} bodů`);

const scoringActive = () => !!state.quiz && (state.view === "quiz" || state.view === "results");

function show(view) {
  state.view = view;
  for (const v of ["setup", "loading", "quiz", "results"]) $(v + "View").hidden = v !== view;
  $("newQuizBtn").hidden = !state.quiz || view === "setup" || view === "loading";
  $("quizInfo").textContent =
    state.quiz && view !== "setup" ? `${state.quiz.topic} · ${LEVEL_NAMES[state.quiz.level]}` : "";

  // body se počítají jen když kvíz běží (otázky a výsledky); jinak lišta týmů slouží k jejich úpravě
  document.body.classList.toggle("no-scoring", !scoringActive());
  renderTeams();

  clearInterval(loadingTimer);
  if (view === "loading") startLoadingTips();
  if (view === "quiz") renderQuestion(true);
  if (view === "results") renderResults();
  $("main").scrollTop = 0;
  save();
}

/* ---------- Zadání ---------- */
function topicList() {
  return $("topic").value.split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
}

function renderTopicChips() {
  const chosen = topicList().map((t) => t.toLowerCase());
  const wrap = $("topicChips");
  wrap.innerHTML = "";
  for (const s of TOPIC_SUGGESTIONS) {
    const b = el("button", "chip" + (chosen.includes(s.toLowerCase()) ? " active" : ""), s);
    b.type = "button";
    b.addEventListener("click", () => {
      let list = topicList();
      const i = list.findIndex((t) => t.toLowerCase() === s.toLowerCase());
      if (i >= 0) list.splice(i, 1);
      else list.push(s);
      $("topic").value = list.join(", ");
      $("topic").classList.remove("invalid");
      renderTopicChips();
    });
    wrap.appendChild(b);
  }
}
$("topic").addEventListener("input", () => {
  $("topic").classList.remove("invalid");
  renderTopicChips();
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
  if (!topics.length) {
    $("topic").classList.add("invalid");
    $("topic").focus();
    return showError("Napiš téma kvízu nebo vyber některý z návrhů.");
  }
  setCount($("count").value);
  const body = {
    topic: topics.join(", "),
    count: Number($("count").value),
    level: new FormData(e.target).get("level"),
  };
  $("setupError").hidden = true;
  show("loading");
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
    show("quiz");
  } catch (err) {
    show("setup");
    showError(err.message);
  }
});

function showError(msg) {
  $("setupError").textContent = msg;
  $("setupError").hidden = false;
}

function startLoadingTips() {
  // při načítání poskakují ikony zvolených týmů
  const animals = $("loaderAnimals");
  animals.innerHTML = "";
  state.teams.forEach((t, j) => {
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

async function newQuiz() {
  if (state.quiz) {
    const ok = await confirmDialog({
      icon: "📝",
      title: "Začít nový kvíz?",
      text: "Aktuální otázky se zahodí. Týmy a body zůstanou.",
      ok: "Nový kvíz",
    });
    if (!ok) return;
  }
  state.quiz = null;
  show("setup");
  $("topic").focus();
}
$("newQuizBtn").addEventListener("click", () => { closeMenu(); newQuiz(); });
$("againBtn").addEventListener("click", newQuiz);
$("backBtn").addEventListener("click", () => show("quiz"));
$("brand").addEventListener("click", (e) => { e.preventDefault(); if (state.view !== "setup") newQuiz(); });

/* ---------- Otázka ---------- */
const currentQ = () => state.quiz?.questions[state.index];

function renderQuestion(animate = false) {
  const q = currentQ();
  if (!q) return;
  const total = state.quiz.questions.length;

  $("qCounter").innerHTML = `Otázka <b>${state.index + 1}</b> z ${total}`;
  const multi = state.quiz.topic.includes(",");
  $("qTopic").hidden = !(multi && q.topic);
  $("qTopic").textContent = q.topic || "";
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
    if (q.revealed) {
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
  if (!q || q.revealed) return;
  q.picked = key;
  q.revealed = true;
  renderQuestion();
  save();
}
function reveal() {
  const q = currentQ();
  if (!q || q.revealed) return;
  q.revealed = true;
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
  const sorted = state.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score);
  const podium = $("podium");
  const rest = $("rest");
  podium.innerHTML = "";
  rest.innerHTML = "";

  // pořadí na stupních: 2. – 1. – 3.
  const order = [1, 0, 2].filter((p) => sorted[p]);
  for (const p of order) {
    const t = sorted[p];
    const place = el("div", `podium-place p${p + 1}`);
    place.style.setProperty("--team", t.color);
    place.append(
      el("div", "podium-emoji", t.emoji),
      el("div", "podium-name", t.name),
      el("div", "podium-score", `${t.score} b.`),
      el("div", "podium-block", ["🥇", "🥈", "🥉"][p])
    );
    podium.appendChild(place);
  }
  sorted.slice(3).forEach((t, i) => {
    const li = el("li");
    li.append(el("span", "muted", `${i + 4}.`), el("span", null, `${t.emoji} ${t.name}`), el("b", null, `${t.score} b.`));
    rest.appendChild(li);
  });
}

/* ---------- Týmy ---------- */
function renderTeams() {
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

    card.append(avatar, name, scoreRow, tools);
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
  if (!force && !scoringActive()) return;
  const idx = i === "all" ? state.teams.map((_, j) => j) : state.teams[i] ? [i] : [];
  if (!idx.length) return;
  idx.forEach((j) => (state.teams[j].score += delta));
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
  state.teams = Array.from({ length: Math.max(MIN_TEAMS, state.teams.length) }, () => {
    const em = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    return { name: EMOJI_NAMES[em], emoji: em, color: EMOJI_DATA[em][1], score: 0 };
  });
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
  save();
  renderAdaptive();
  if (state.view === "quiz") renderQuestion();
});
document.querySelectorAll("#diffPoints input").forEach((inp) =>
  inp.addEventListener("change", () => {
    const n = Math.min(10, Math.max(1, parseInt(inp.value, 10) || DEFAULT_DIFF_POINTS[inp.dataset.diff]));
    state.diffPoints = { ...state.diffPoints, [inp.dataset.diff]: n };
    inp.value = n;
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
  renderTeams();
  save();
}

$("resetTeamsBtn").addEventListener("click", resetTeams);
$("resetScoresBtn").addEventListener("click", resetScores);
// tlačítka v malé liště – zastavit klik, jinak by mimo kvíz otevřel nastavení
$("barResetTeams").addEventListener("click", (e) => { e.stopPropagation(); resetTeams(); });
$("barResetScores").addEventListener("click", (e) => { e.stopPropagation(); resetScores(); });

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
  "🦤": ["Dodové", "#7d8f6a"],
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
  for (const em of EMOJIS) {
    const b = el("button", "emoji" + (em === team.emoji ? " current" : "") + (used.has(em) ? " used" : ""), em);
    b.title = EMOJI_DATA[em][0] + (used.has(em) ? " (používá jiný tým)" : "");
    b.style.setProperty("--c", EMOJI_DATA[em][1]);
    b.addEventListener("click", () => {
      if (isNew) {
        if (state.teams.length >= MAX_TEAMS) return closeEmojiPicker();
        state.teams.push({ name: EMOJI_NAMES[em], emoji: em, color: EMOJI_DATA[em][1], score: 0 });
        closeEmojiPicker();
        renderTeams();
        save();
        $("teams").children[state.teams.length - 1]?.scrollIntoView({ block: "nearest", inline: "nearest" });
        return;
      }
      team.emoji = em;
      team.color = EMOJI_DATA[em][1];
      if (!team.customName) team.name = EMOJI_NAMES[em];
      closeEmojiPicker();
      renderTeams();
      save();
    });
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
  grid.querySelector(".current, .emoji")?.focus();
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
function confirmDialog({ icon = "❓", title, text = "", ok = "Potvrdit", danger = false }) {
  const d = $("confirmDialog");
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
    d.addEventListener("close", () => resolve(d.returnValue === "ok"), { once: true });
  });
}
// kliknutí na pozadí dialog zavře
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
  $("menuPanel").querySelector("button")?.focus();
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
  if (state.quiz) {
    const ok = await confirmDialog({
      icon: "🏆",
      title: "Spustit ukázkový kvíz?",
      text: "Aktuální otázky se nahradí ukázkovým kvízem. Týmy a body zůstanou.",
      ok: "Spustit",
    });
    if (!ok) return;
  }
  try {
    const res = await fetch(file, { cache: "no-cache" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    state.quiz = {
      topic: data.topic,
      level: data.level,
      // mix: otázky v náhodném pořadí, ať obtížnosti nejdou popořadě
      questions: (data.level === "mix" ? shuffleArr(data.questions) : data.questions)
        .map((q) => ({ ...q, picked: null, revealed: false })),
    };
    state.index = 0;
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
  renderTeams();
}
function toggleTeamsLayout() {
  state.bigTeams = !state.bigTeams;
  closeEmojiPicker();
  applyTeamsLayout();
  save();
}
$("closeSettingsBtn").addEventListener("click", (e) => { e.stopPropagation(); toggleTeamsLayout(); });
// mimo běžící kvíz: kliknutí kamkoli do lišty týmů otevře nastavení týmů
document.querySelector(".scoreboard").addEventListener("click", (e) => {
  if (!state.bigTeams && !scoringActive()) { e.stopPropagation(); toggleTeamsLayout(); }
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
  if (e.key === "f" || e.key === "F") return toggleFullscreen();
  if (e.key === "t" || e.key === "T") return toggleTeamsLayout();
  if (state.bigTeams) return;

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

/* ---------- Start ---------- */
renderTopicChips();
setCount($("count").value);
applyTeamsLayout();
if (state.view === "loading" || (!state.quiz && state.view !== "setup")) state.view = state.quiz ? "quiz" : "setup";
show(state.view);
