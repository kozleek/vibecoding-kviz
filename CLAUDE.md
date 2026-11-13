# CLAUDE.md

Kvízová aplikace pro týmové kvízy promítané na plátno: otázky generuje Claude API, moderátor ovládá kvíz klávesnicí a přičítá body týmům. Uživatelský popis je v `README.md`.

## Stack a spuštění

- Node 22+, Express 5, `@anthropic-ai/sdk`, ES moduly. **Žádný build ani framework** – frontend je čisté HTML/CSS/JS v `public/`.
- `npm run dev` (s auto-reloadem) nebo `npm start`, port `PORT` (výchozí 3000). Env v `.env` (vzor `.env.example`): `ANTHROPIC_API_KEY`, `ACCESS_TOKEN`, volitelně `CLAUDE_MODEL`.
- Deploy: Coolify + Nixpacks (`npm start`), web je navíc za basic auth od Coolify.

## Struktura

- `server.js` – statické soubory a jediný endpoint `POST /api/generate`: validace vstupu, prompt, strukturovaný výstup (`QUIZ_SCHEMA`), míchání odpovědí, u náhodného tématu losuje oblast server (`RANDOM_AREAS`).
- `public/app.js` – celá aplikace: stav, obrazovky (`setup`, `loading`, `quiz`, `results`, `archive` přes `show(view)`), týmy a bodování, klávesové zkratky, archiv s průběhem (timeline), zadání tokenu.
- `public/index.html` – markup všech obrazovek a dialogů (`<dialog>`), `public/style.css` – styly s CSS proměnnými.
- `public/sample-quiz*.json` – ukázkové kvízy (nevolají API).

## Důležitá pravidla

- **Přístupový token:** generování chrání `ACCESS_TOKEN`. Klient posílá hlavičku **`X-Access-Token`**, ne `Authorization` – ta patří basic auth proxy v Coolify a přepsání by vyvolalo přihlašovací okno prohlížeče. Bez `ACCESS_TOKEN` je generování vypnuté (503).
- **Stav v `localStorage`:** `kviz-state-v1` (běžící kvíz), `kviz-archive-v1` (archiv), `kviz-token`. Při změně tvaru dat zachovat kompatibilitu se starším uloženým stavem (viz normalizace po načtení stavu v `app.js`), případně zvýšit verzi klíče.
- **Archivní kvíz** je jen ke čtení (`state.locked`) – nové akce musí zamčený stav respektovat; akce běžícího kvízu se zapisují do timeline (`logEvent`).
- Max. 4 týmy (`MAX_TEAMS`), 3–100 otázek, tři odpovědi a/b/c.
- Klávesové zkratky jsou v `keydown` handleru v `app.js` **a** v dialogu nápovědy v `index.html` a v tabulce v README – měnit všude.
- Chyby a hlášky přes `showError()` – zobrazují se v proužku nad lištou týmů.

## Konvence

- Texty rozhraní, komentáře i commity **česky**. V UI nezmiňovat Claude, jen „AI“.
- Ikony: Phosphor Icons (regular, `<i class="ph ph-…">`).
- Model: výchozí `claude-sonnet-5-5` (levnější než Opus); měnit přes `CLAUDE_MODEL`.
- Dokumentaci (`README.md`, tento soubor) držet aktuální při změně funkcí.

## Git

- Commit po každé dokončené a ověřené změně, jednořádkově česky ve tvaru `{oblast} | {popis}` (např. `zadání | …`, `archiv | …`, `api | …`), bez `Co-Authored-By`.
- `git push` jen na výslovnou výzvu.

## Ověření

- `node --check server.js public/app.js` po úpravě JS.
- API bez volání Claude: `curl -XPOST localhost:3000/api/generate -H 'Content-Type: application/json' -H "X-Access-Token: $ACCESS_TOKEN" -d '{}'` má vrátit validační chybu (token prošel); bez tokenu 401.
