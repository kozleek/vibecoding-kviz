import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 100;
// náhodné téma: oblast losuje server – se stále stejným promptem by model volil pořád totéž (např. kávu)
const RANDOM_AREAS = [
  "starověké civilizace", "středověk", "novověké dějiny", "české dějiny", "objevitelé a cestovatelé", "archeologie",
  "savci", "ptáci", "hmyz a pavoukovci", "mořský život", "rostliny a houby", "pravěk a dinosauři",
  "vesmír a astronomie", "fyzika", "chemie", "matematika", "geologie a nerosty", "počasí a klima",
  "lidské tělo", "medicína", "vynálezy", "počítače a internet", "doprava a dopravní prostředky", "architektura a stavby",
  "malířství a sochařství", "klasická hudba", "populární hudba", "film", "seriály", "divadlo a opera",
  "literatura", "pohádky a pověsti", "komiksy a animované filmy", "videohry", "deskové a společenské hry",
  "mytologie", "náboženství a svátky", "tradice a zvyky", "jazyky a slova", "písmo a knihy",
  "kuchyně světa", "nápoje", "sladkosti a pečení", "móda a odívání", "řemesla",
  "olympijské hry", "netradiční sporty", "státy a vlajky", "města a metropole", "řeky, hory a ostrovy",
  "peníze a ekonomika", "rekordy a kuriozity", "kriminalistika a detektivky", "piráti a námořnictví", "rytíři a hrady",
];
const pickArea = () => RANDOM_AREAS[Math.floor(Math.random() * RANDOM_AREAS.length)];
const LEVELS = { lehka: "lehká", stredni: "střední", tezka: "těžká", hardcore: "hardcore", mix: "mix" };

const client = new Anthropic();
const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static("public"));

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    quizTopic: { type: "string" }, // název tématu kvízu (u náhodného tématu ho volí Claude)
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          question: { type: "string" },
          difficulty: { type: "string", enum: ["lehká", "střední", "těžká", "hardcore"] },
          answers: {
            type: "object",
            properties: { a: { type: "string" }, b: { type: "string" }, c: { type: "string" } },
            required: ["a", "b", "c"],
            additionalProperties: false,
          },
          correct: { type: "string", enum: ["a", "b", "c"] },
          explanation: { type: "string" },
        },
        required: ["topic", "question", "difficulty", "answers", "correct", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["quizTopic", "questions"],
  additionalProperties: false,
};

const SYSTEM = `Jsi autor kvízů pro týmové hospodské a školní kvízy. Píšeš česky, spisovně a srozumitelně.
Každá otázka má přesně tři odpovědi (a, b, c), z nichž je právě jedna jednoznačně správná.
Špatné odpovědi jsou věrohodné, ale prokazatelně nesprávné. Odpovědi jsou stručné (ideálně do 8 slov).
Vysvětlení má 1–3 věty a říká, proč je správná odpověď správná (případně zajímavost navíc).
Uváděj jen fakta, kterými si jsi jistý. Otázky se neopakují a pokrývají různé stránky tématu.
Úrovně: lehká = zná většina lidí; střední = vyžaduje obecný přehled; těžká = pro znalce tématu;
hardcore = pro kvízové mazáky a experty: méně známá a detailní fakta (přesná data, čísla, jména, souvislosti),
špatné odpovědi jsou velmi blízko té správné (stejné období, obor nebo řád čísel). I tady jen ověřená fakta, žádné chytáky ani sporné otázky.`;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleAnswers(q) {
  const keys = ["a", "b", "c"];
  const items = keys.map((k) => ({ text: q.answers[k], correct: k === q.correct }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const answers = {};
  let correct = "a";
  items.forEach((it, i) => {
    answers[keys[i]] = it.text;
    if (it.correct) correct = keys[i];
  });
  return { ...q, answers, correct };
}

app.post("/api/generate", async (req, res) => {
  const topic = String(req.body?.topic || "").trim().slice(0, 300);
  const randomTopic = req.body?.randomTopic === true;
  const instructions = String(req.body?.instructions || "").trim().slice(0, 1500);
  // nedávná témata z archivu – u náhodného tématu se nemají opakovat
  const avoidTopics = (Array.isArray(req.body?.avoidTopics) ? req.body.avoidTopics : [])
    .map((t) => String(t).trim().slice(0, 80)).filter(Boolean).slice(0, 30);
  const count = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, parseInt(req.body?.count, 10) || 10));
  const level = LEVELS[req.body?.level] ? req.body.level : "mix";

  if (!topic && !randomTopic) return res.status(400).json({ error: "Zadej téma kvízu nebo zapni náhodné téma." });

  const levelText =
    level === "mix"
      ? "Namíchej obtížnosti: přibližně třetina lehkých, třetina středních a třetina těžkých. Obtížnost hardcore v mixu nepoužívej."
      : `Všechny otázky mají obtížnost „${LEVELS[level]}“.`;

  const topics = [...new Set(topic.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean))];
  const topicText = randomTopic
    ? `Téma si vyber sám v oblasti „${pickArea()}“: zvol v ní jedno konkrétnější, zajímavé téma vhodné pro týmový kvíz (klidně netradiční), ale dost široké na ${count} různých otázek.` +
      (avoidTopics.length ? ` Nevybírej žádné z těchto nedávných témat ani jejich obměny: ${avoidTopics.join("; ")}.` : "") +
      " Krátký český název tématu napiš do pole quizTopic a do pole topic u každé otázky."
    : topics.length > 1
      ? `Témata: ${topics.join(", ")}\nRozděl otázky mezi témata co nejrovnoměrněji a promíchej je. Do pole topic napiš, ke kterému tématu otázka patří (přesně jeho název ze seznamu). Do pole quizTopic napiš témata oddělená čárkou.`
      : `Téma: ${topics[0]}\nDo pole topic i quizTopic napiš krátký název tématu.`;
  // upřesnění od moderátora (styl otázek, odpovědí, cílová skupina…)
  const extraText = instructions
    ? `\n\nUpřesnění od moderátora kvízu (dodrž ho, pokud není v rozporu s formátem tří odpovědí a jedné správné):\n${instructions}`
    : "";

  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000, // až 100 otázek i s vysvětlením
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: QUIZ_SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${topicText}\nPočet otázek: ${count}\n${levelText}${extraText}`,
        },
      ],
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") {
      return res.status(422).json({ error: "K tomuto tématu se otázky nepodařilo vytvořit. Zkus jiné téma." });
    }
    if (msg.stop_reason === "max_tokens") {
      return res.status(502).json({ error: "Odpověď byla příliš dlouhá. Zkus menší počet otázek." });
    }

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const data = JSON.parse(text);
    let questions = data.questions.slice(0, count).map(shuffleAnswers);
    if (level === "mix") questions = shuffle(questions); // mix: obtížnosti náhodně promíchané, ne popořadě

    const quizTopic = randomTopic ? String(data.quizTopic || "Náhodné téma").slice(0, 120) : topics.join(", ");
    res.json({ topic: quizTopic, level, questions });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.AuthenticationError || /authentication method/i.test(err?.message)) {
      return res.status(500).json({ error: "Chybí nebo je neplatný ANTHROPIC_API_KEY." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Překročen limit API. Zkus to za chvíli." });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Chyba při generování otázek (${err.status ?? "?"}). Zkus to znovu.` });
    }
    res.status(500).json({ error: "Generování selhalo. Zkus to znovu." });
  }
});

app.listen(PORT, () => {
  console.log(`Kvíz běží na http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️  Není nastaven ANTHROPIC_API_KEY (viz .env.example).");
});
