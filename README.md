# Kvíz

Generátor kvízových otázek přes Claude API (výchozí model `claude-sonnet-5-5`) s bodováním týmů – pro hospodské a školní kvízy promítané na plátno.

## Spuštění

Vyžaduje Node.js 22+.

```bash
npm install
cp .env.example .env   # doplň ANTHROPIC_API_KEY a ACCESS_TOKEN
npm start              # http://localhost:3000  (npm run dev = s auto-reloadem)
```

## Přístupový token

Generování přes API je chráněné tokenem z env proměnné `ACCESS_TOKEN` (např. `openssl rand -hex 24`), aby nikdo cizí negeneroval kvízy na tvůj API klíč. Bez nastaveného tokenu je generování vypnuté.

V aplikaci se token zadá při prvním generování a prohlížeč si ho zapamatuje (`localStorage`, klíč `kviz-token`). Lze ho předat i odkazem `https://…/?token=…` – uloží se a z adresy se hned odstraní. Ukázkové kvízy a archiv token nepotřebují.

## Zadání kvízu

- **Jednoduchý režim** (výchozí): jen pole s tématem, kolem kterého poletují bubliny se 100 tématy pro inspiraci, a našeptávač při psaní.
- **Pokročilé nastavení**:
  - více témat oddělených čárkou (otázky se rovnoměrně rozdělí a promíchají),
  - **náhodné téma** – oblast losuje server, AI v ní zvolí konkrétní téma; nedávná témata z archivu se neopakují,
  - **upřesnění zadání** (ikona vedle pole) – oddíly Pro koho, Otázky, Odpovědi, Vysvětlení, Zakázáno (závazné) a Další přání, každý s rychlými volbami na kliknutí,
  - počet otázek 3–100,
  - obtížnost: lehká, střední, těžká, hardcore, nebo mix (třetina lehkých/středních/těžkých).

Každá otázka má tři odpovědi (A/B/C), jednu správnou a krátké vysvětlení. Pořadí odpovědí se na serveru náhodně míchá.

V menu ☰ jsou i **ukázkové kvízy** (Sport, Příroda, Vesmír) z `public/sample-quiz*.json`, které nevolají API.

## Týmy a bodování

- Max. 4 týmy; přidávají se výběrem emoji (název i barva podle zvířete), přejmenovávají kliknutím na název. Nastavení (`T` nebo ozubené kolo ve spodní liště) obsahuje i vynulování bodů a reset týmů.
- Na dotykovém zařízení se během kvízu přičítá bod klepnutím na kartu týmu.
- **Adaptivní bodování pro mix**: místo 1 bodu se přičítá podle obtížnosti otázky (výchozí lehká 1, střední 2, těžká 3; upravitelné v nastavení).
- Na konci kvízu výsledky se stupni vítězů.

## Ovládání

| Klávesa | Akce |
|---|---|
| `1`–`4` | +1 bod týmu s daným číslem (horní řada i numerická klávesnice) |
| `0` | +1 bod všem týmům |
| `Shift` + číslo | −1 bod (`Shift` + `0` všem týmům) |
| `A` / `B` / `C` | vybrat odpověď (ukáže správnou + vysvětlení) |
| `Mezerník` / `Enter` | ukázat správnou odpověď / další otázka |
| `←` / `→` | předchozí / další otázka |
| `T` | nastavení (týmy, bodování) |
| `F` | celá obrazovka |
| `A` | archiv (u otázky běžícího kvízu vybírá odpověď A) |
| `Esc` | zavřít archiv / archivní kvíz |
| `?` | nápověda s klávesovými zkratkami |

S adaptivním bodováním se místo 1 bodu přičítá počet bodů uvedený u otázky.

Stav (otázky, body, týmy) se drží v `localStorage` (klíč `kviz-state-v1`), takže přežije reload.

## Archiv

Menu ☰ → **Archiv**: počet vygenerovaných kvízů a otázek a seznam všech kvízů. Každý kvíz se ukládá i s celým průběhem (timeline): přechody mezi otázkami, vybrané/ukázané odpovědi, každé přidání a odebrání bodů a změny týmů.

- **Rozehrané** – kvíz opuštěný křížkem v hlavičce dřív, než došel na výsledky (při opuštění volba uložit, nebo opustit bez uložení). Kliknutím se v něm pokračuje i s body.
- **Archiv** – dokončené kvízy. Otevřou se v zamčeném stavu: stejné obrazovky, ale nic nejde měnit; lišta týmů ukazuje body po dané otázce, u otázek je vidět, kdo kolik bodů dostal, a výsledky obsahují časovou osu.
- **Hrát znovu** (ikona v seznamu nebo tlačítko u výsledků): buď nové otázky od AI na stejné téma, nebo stejné otázky v novém pořadí.
- Kvízy jdou smazat ikonou koše.

Archiv je v `localStorage` (klíč `kviz-archive-v1`), tedy jen v daném prohlížeči.

## Struktura

- `server.js` – Express server, statické soubory z `public/` a endpoint `POST /api/generate` (hlavička `X-Access-Token: <ACCESS_TOKEN>` – `Authorization` zůstává volná pro basic auth v Coolify; strukturovaný výstup přes JSON schema).
- `public/index.html`, `public/app.js`, `public/style.css` – celá aplikace na klientu, bez buildu.

## Deploy (Coolify / Nixpacks)

Nixpacks pozná Node app a spustí `npm start`. V Coolify nastav env proměnné `ANTHROPIC_API_KEY` a `ACCESS_TOKEN` (volitelně `CLAUDE_MODEL`, port bere z `PORT`).

## Licence

[MIT](LICENSE)
