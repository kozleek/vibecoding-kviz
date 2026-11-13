# Kvíz

Generátor kvízových otázek přes Claude API (výchozí model `claude-sonnet-5-5`) s bodováním týmů – pro hospodské a školní kvízy promítané na plátno. Ovládá se klávesnicí, běží bez buildu (Node + čisté HTML/CSS/JS).

## Spuštění

Vyžaduje Node.js 22+.

```bash
npm install
cp .env.example .env   # doplň ANTHROPIC_API_KEY a ACCESS_TOKEN
npm start              # http://localhost:3000  (npm run dev = s auto-reloadem)
```

## Přístupový token a ochrana API

Generování je chráněné tokenem z env proměnné `ACCESS_TOKEN` (dlouhý náhodný řetězec, např. `openssl rand -hex 24`), aby nikdo cizí negeneroval kvízy na tvůj API klíč. Bez nastaveného tokenu je generování vypnuté. Zbytek aplikace (stránka, ukázkové kvízy, archiv) token nepotřebuje, takže web může být veřejný.

- Token se zadá v aplikaci při prvním generování a prohlížeč si ho zapamatuje (`localStorage`, klíč `kviz-token`). Lze ho předat i odkazem `https://…/?token=…` – uloží se a z adresy se hned odstraní.
- Klient ho posílá v hlavičce `X-Access-Token` (ne `Authorization`, ta zůstává volná pro případnou basic auth proxy).
- **Rate limit** na IP: `POST /api/generate` max. 20 za hodinu (`GENERATE_LIMIT`, počítají se i pokusy se špatným tokenem), proxy obrázků `/api/img` max. 600 za 15 minut. IP se bere z `X-Forwarded-For` přes jednu proxy (`TRUST_PROXY=1`, Traefik v Coolify).
- Doporučení: nastav si v Anthropic Console limit útraty pro případ, že token unikne.

## Rozložení

Jedna horní lišta: vlevo logo, uprostřed týmy s body, vpravo menu ☰ (archiv, týmy, celá obrazovka, zkratky, ukázkové kvízy, podle situace „Zavřít archiv“ / „Zavřít týmy“). V kvízu, na jeho výsledcích a v nastavení týmů je místo menu jen křížek (opustit kvíz, zavřít detail archivního kvízu, zavřít týmy). Na užší obrazovce jsou týmy ve vlastním řádku pod hlavičkou.

## Zadání kvízu

- **Jednoduchý režim** (výchozí): pole s tématem, našeptávač a pod ním shrnutí nastavení (např. „10 otázek · mix · bez obrázků · bez odpočtu“) – kliknutím se otevře pokročilé nastavení.
- **Bubliny s tématy**: kolem formuláře (v obou režimech) poletuje 100 témat pro inspiraci; kliknutím se téma přidá k ostatním v poli.
- **Pokročilé nastavení**:
  - více témat oddělených čárkou (otázky se rovnoměrně rozdělí a promíchají),
  - **náhodné téma** – oblast losuje server (`RANDOM_AREAS`), AI v ní vymyslí konkrétní téma; nedávná témata z archivu se neopakují,
  - **upřesnění zadání** (ikona vedle pole) – oddíly Pro koho, Otázky, Odpovědi, Vysvětlení, Zakázáno (závazné) a Další přání, s rychlými volbami na kliknutí,
  - **počet otázek** 3–100 (rychlé volby 5–100),
  - **čas na odpověď** v sekundách (0 = bez odpočtu),
  - **obtížnost**: lehká, střední, těžká, hardcore, nebo mix (třetina lehkých/středních/těžkých),
  - **obrázkové otázky**: bez obrázků / některé / všechny.

Každá otázka má tři odpovědi (A/B/C), jednu správnou a krátké vysvětlení. Pořadí odpovědí se na serveru náhodně míchá.

V menu ☰ jsou **ukázkové kvízy** (Sport, Příroda, Vesmír a Obrázky) z `public/sample-quiz*.json` – nevolají API.

### Obrázkové otázky

Postup na serveru (`images.js`):

1. Claude u obrázkové otázky vrátí název článku na anglické Wikipedii a verzi otázky bez obrázku.
2. Server stáhne hlavní obrázek článku (Wikipedia API) s autorem a licencí z Wikimedia Commons; nesvobodné obrázky (fair use) přeskočí.
3. Claude (vision) zkontroluje, že obrázek ukazuje to, na co se otázka ptá, a neprozrazuje odpověď – po dávkách 20 obrázků s menšími náhledy. Když obrázek neprojde, použije se textová verze otázky.

Na plátně: otázka nahoře, pod ní obrázek (třetina šířky) a vedle odpovědi. Fotky vyplní plochu (ořez), obrázky na výšku a malé se ukážou celé na rozmazaném pozadí, vlajky a kresby (SVG) celé na bílém. Autor a licence se ukážou dole přes fotku až po odhalení odpovědi. Klik na obrázek nebo `O` ho zvětší přes celou obrazovku. Obrázky jdou přes proxy `/api/img` (jen Wikimedia), aby název souboru v URL neprozradil odpověď, a přednačítají se – další otázka se ukáže až s načteným obrázkem.

## Průběh kvízu

- Odpovědi: správná se zvýrazní zeleně, špatně vybraná červeně, pod nimi vysvětlení.
- **Odpočet** (je-li nastavený čas na odpověď): progressbar pod horní lištou, posledních 5 s červeně, po vypršení „Čas vypršel“ – odpověď se sama neodhalí. Po odhalení odpovědi zmizí, u další neodhalené otázky začne znovu.
- Opuštění kvízu (křížek vpravo nahoře nebo `Esc`) se potvrzuje: uložit mezi rozehrané, nebo opustit bez uložení. Ukázkový kvíz se opouští vždy bez ptaní a do archivu se neukládá.

## Týmy a bodování

- Max. 4 týmy; přidávají se výběrem emoji (zvířata, postavy, sport – např. ⚽ Fotbalisti…), název i barva podle emoji, přejmenování kliknutím na název. Nastavení týmů (`T` nebo menu ☰ → Týmy) obsahuje i vynulování bodů a reset týmů.
- Na dotykovém zařízení se během kvízu přičítá bod klepnutím na kartu týmu.
- **Adaptivní bodování pro mix**: místo 1 bodu se přičítá podle obtížnosti otázky (výchozí lehká 1, střední 2, těžká 3; upravitelné v nastavení týmů).
- **Výsledky**: karty týmů seřazené podle bodů, první tři místa s body mají medaili.

## Ovládání

| Klávesa | Akce |
|---|---|
| `1`–`4` | +1 bod týmu s daným číslem (horní řada i numerická klávesnice) |
| `0` | +1 bod všem týmům |
| `Shift` + číslo | −1 bod (`Shift` + `0` všem týmům) |
| `A` / `B` / `C` | vybrat odpověď (ukáže správnou + vysvětlení) |
| `Mezerník` / `Enter` | ukázat správnou odpověď / další otázka |
| `←` / `→` | předchozí / další otázka |
| `O` | obrázek otázky přes celou obrazovku (zavře `Esc`, `O` nebo klik) |
| `T` | týmy (nastavení týmů a bodování) |
| `F` | celá obrazovka |
| `A` | archiv (u otázky běžícího kvízu vybírá odpověď A) |
| `Esc` | zavřít týmy, archiv nebo archivní kvíz; opustit kvíz (s potvrzením); z pokročilého zadání zpět na jednoduché |
| `?` | nápověda s klávesovými zkratkami |

S adaptivním bodováním se místo 1 bodu přičítá počet bodů uvedený u otázky.

## Archiv

Menu ☰ → **Archiv**: statistiky (počet kvízů a otázek) a seznam kvízů. Každý kvíz se ukládá i s celým průběhem – přechody mezi otázkami, odpovědi, body a změny týmů.

- **Rozehrané** (ikona ▶) – kvíz opuštěný před výsledky; kliknutím se v něm pokračuje i s body.
- **Dokončené** – otevřou se jen ke čtení: výsledky a pod nimi **průběh kvízu** jako osa s kartou pro každou otázku (štítky odpovědí a bodů týmů); kliknutím na kartu se otázka otevře.
- **Hrát znovu** (ikona ↻ v seznamu nebo tlačítko u výsledků): otevře pokročilé zadání s předvyplněným tématem a týmy z daného kvízu (body vynulované); ostatní nastavení se zvolí a kvíz se vygeneruje znovu.
- Kvízy jdou smazat ikonou koše.

## Data v prohlížeči

Vše je jen v `localStorage` daného prohlížeče, server nic neukládá:

| Klíč | Obsah |
|---|---|
| `kviz-state-v1` | běžící kvíz, týmy, body, část nastavení (režim zadání, obrázky, čas na odpověď, upřesnění) |
| `kviz-archive-v1` | archiv kvízů s průběhem |
| `kviz-token` | přístupový token |

## Struktura

- `server.js` – Express: statické soubory z `public/`, `POST /api/generate` (token, rate limit, prompt, strukturovaný výstup přes JSON schema) a `GET /api/img` (proxy obrázků).
- `images.js` – obrázkové otázky: Wikipedia API, licence z Commons, kontrola přes vision, proxy.
- `public/index.html`, `public/app.js`, `public/style.css` – celá aplikace na klientu, bez buildu.
- `public/sample-quiz*.json` – ukázkové kvízy.
- `CLAUDE.md` – pravidla projektu pro Claude Code.

## Deploy (Coolify / Nixpacks)

Nixpacks pozná Node app a spustí `npm start`. Env proměnné:

| Proměnná | |
|---|---|
| `ANTHROPIC_API_KEY` | povinná |
| `ACCESS_TOKEN` | povinná – bez ní je generování vypnuté |
| `CLAUDE_MODEL` | volitelná, výchozí `claude-sonnet-5-5` |
| `GENERATE_LIMIT` | volitelná, kvízů za hodinu na IP (výchozí 20) |
| `TRUST_PROXY` | volitelná, počet proxy před aplikací (výchozí 1) |
| `PORT` | volitelná, výchozí 3000 |

Server potřebuje přístup na `api.anthropic.com`, `en.wikipedia.org` a `upload.wikimedia.org` / `thumb.wikimedia.org`.

## Licence

[MIT](LICENSE)
