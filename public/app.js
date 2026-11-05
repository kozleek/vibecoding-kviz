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
const MAX_TEAMS = 9;
const LEVEL_NAMES = { lehka: "Lehká", stredni: "Střední", tezka: "Těžká", hardcore: "Hardcore", mix: "Mix" };
const TOPIC_SUGGESTIONS = ["Sport", "Vesmír", "Česká historie", "Zeměpis", "Příroda", "Film a seriály", "Hudba", "Věda a technika", "Jídlo"];
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

/* ---------- Stav ---------- */
let state = load() || {
  view: "setup",
  quiz: null,
  index: 0,
  teams: ANIMALS.slice(0, 2).map((a) => ({ ...a, score: 0 })),
};
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

function show(view) {
  state.view = view;
  for (const v of ["setup", "loading", "quiz", "results"]) $(v + "View").hidden = v !== view;
  $("newQuizBtn").hidden = !state.quiz || view === "setup" || view === "loading";
  $("quizInfo").textContent =
    state.quiz && view !== "setup" ? `${state.quiz.topic} · ${LEVEL_NAMES[state.quiz.level]}` : "";

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
  n = Math.min(30, Math.max(1, Number(n) || 10));
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
  let i = 0;
  $("loadingSub").textContent = LOADING_TIPS[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_TIPS.length;
    $("loadingSub").textContent = LOADING_TIPS[i];
  }, 3500);
}

function newQuiz() {
  if (state.quiz && !confirm("Začít nový kvíz? Aktuální otázky se zahodí, body týmů zůstanou.")) return;
  state.quiz = null;
  show("setup");
  $("topic").focus();
}
$("newQuizBtn").addEventListener("click", newQuiz);
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

  state.teams.forEach((t, i) => {
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

    const sub = el("div", "crown", card.classList.contains("leader") ? "👑 vede" : `klávesa ${i + 1}`);

    const score = el("button", "score", String(t.score));
    score.title = "Kliknutím přidáš bod";
    score.addEventListener("click", () => addPoints(i, 1));

    const tools = el("div", "tools");
    const minus = el("button", null, "−");
    minus.title = "Odebrat bod";
    minus.addEventListener("click", () => addPoints(i, -1));
    tools.append(minus);
    if (state.teams.length > 1) {
      const del = el("button", "del", "✕");
      del.title = "Odebrat tým";
      del.addEventListener("click", () => removeTeam(i));
      tools.append(del);
    }

    card.append(avatar, name, score, sub, tools);
    wrap.appendChild(card);
  });

  if (state.teams.length < MAX_TEAMS) {
    const add = el("button", "add-team", "+ Přidat tým");
    add.addEventListener("click", addTeam);
    wrap.appendChild(add);
  }
  if (state.view === "results") renderResults();
}

function addPoints(i, delta) {
  const t = state.teams[i];
  if (!t) return;
  t.score += delta;
  renderTeams();
  save();
  const card = $("teams").children[i];
  card.classList.add("bump");
  setTimeout(() => card.classList.remove("bump"), 160);
  const f = el("span", "float" + (delta < 0 ? " minus" : ""), delta > 0 ? `+${delta}` : String(delta));
  card.appendChild(f);
  setTimeout(() => f.remove(), 800);
}

function addTeam() {
  if (state.teams.length >= MAX_TEAMS) return;
  const used = new Set(state.teams.map((t) => t.emoji));
  const animal = ANIMALS.find((a) => !used.has(a.emoji)) || ANIMALS[state.teams.length];
  state.teams.push({ ...animal, score: 0 });
  renderTeams();
  save();
}

function removeTeam(i) {
  const snapshot = JSON.stringify(state.teams);
  const [t] = state.teams.splice(i, 1);
  renderTeams();
  save();
  toast(`Tým ${t.name} odebrán`, "Vrátit", () => { state.teams = JSON.parse(snapshot); renderTeams(); save(); });
}

$("resetScoresBtn").addEventListener("click", () => {
  const snapshot = state.teams.map((t) => t.score);
  state.teams.forEach((t) => (t.score = 0));
  renderTeams();
  save();
  toast("Body vynulovány", "Vrátit", () => {
    state.teams.forEach((t, i) => (t.score = snapshot[i] ?? 0));
    renderTeams();
    save();
  });
});

/* ---------- Výběr emoji ---------- */
const EMOJI_NAMES = {
  "🦊": "Lišky", "🐻": "Medvědi", "🦉": "Sovy", "🐺": "Vlci", "🦌": "Jeleni", "🦔": "Ježci",
  "🐿️": "Veverky", "🦡": "Jezevci", "🐗": "Divočáci", "🐰": "Zajíci", "🦝": "Mývalové", "🦫": "Bobři",
  "🐸": "Žáby", "🐍": "Hadi", "🦎": "Ještěrky", "🐢": "Želvy", "🦅": "Orli", "🐦": "Ptáci",
  "🦆": "Kachny", "🦇": "Netopýři", "🐭": "Myšky", "🦋": "Motýli", "🐝": "Včely", "🐞": "Berušky",
  "🐌": "Šneci", "🕷️": "Pavouci", "🐼": "Pandy", "🐨": "Koaly", "🐯": "Tygři", "🦁": "Lvi",
  "🐮": "Krávy", "🐷": "Prasátka", "🐵": "Opice", "🐧": "Tučňáci", "🐙": "Chobotnice", "🦈": "Žraloci",
  "🦄": "Jednorožci", "🐲": "Draci", "🦖": "Dinosauři", "🌲": "Smrky", "🍄": "Houby", "🌻": "Slunečnice",
  "🍀": "Čtyřlístky", "⭐": "Hvězdy", "🔥": "Plameny", "⚡": "Blesky", "🚀": "Rakety", "👑": "Králové",
};
const EMOJIS = Object.keys(EMOJI_NAMES);
let pickerTeam = null;

function openEmojiPicker(i, anchor) {
  const picker = $("emojiPicker");
  if (pickerTeam === i && !picker.hidden) return closeEmojiPicker();
  pickerTeam = i;
  const team = state.teams[i];
  const used = new Set(state.teams.filter((_, j) => j !== i).map((t) => t.emoji));
  const grid = $("emojiGrid");
  grid.innerHTML = "";
  for (const em of EMOJIS) {
    const b = el("button", "emoji" + (em === team.emoji ? " current" : "") + (used.has(em) ? " used" : ""), em);
    b.title = used.has(em) ? "Používá jiný tým" : "";
    b.addEventListener("click", () => {
      team.emoji = em;
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
  picker.style.bottom = innerHeight - r.top + 10 + "px";
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

/* ---------- Toast ---------- */
let toastTimer;
function toast(text, actionLabel, action) {
  const t = $("toast");
  t.innerHTML = "";
  t.append(el("span", null, text));
  if (actionLabel) {
    const b = el("button", "link-btn", actionLabel);
    b.style.cssText = "color:inherit;margin-left:12px;pointer-events:auto";
    b.addEventListener("click", () => { action(); t.classList.remove("show"); });
    t.append(b);
  }
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 5000);
}

/* ---------- Celá obrazovka & nápověda ---------- */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
$("fullscreenBtn").addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  $("fsIcon").className = "ph " + (document.fullscreenElement ? "ph-corners-in" : "ph-corners-out");
});
$("helpBtn").addEventListener("click", () => $("helpDialog").showModal());

/* ---------- Klávesnice ---------- */
document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;
  if ($("helpDialog").open) return;
  if (!$("emojiPicker").hidden) {
    if (e.key === "Escape") closeEmojiPicker();
    if (e.key === "Escape" || e.key === " " || e.key === "Enter" || e.key.startsWith("Arrow")) return;
  }

  // 1–9 (horní řada i numerická klávesnice), Shift = odečíst
  const m = e.code.match(/^(?:Digit|Numpad)([1-9])$/);
  if (m) {
    e.preventDefault();
    addPoints(Number(m[1]) - 1, e.shiftKey ? -1 : 1);
    return;
  }
  if (e.key === "?") return $("helpDialog").showModal();
  if (e.key === "f" || e.key === "F") return toggleFullscreen();

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
renderTeams();
if (state.view === "loading" || (!state.quiz && state.view !== "setup")) state.view = state.quiz ? "quiz" : "setup";
show(state.view);
