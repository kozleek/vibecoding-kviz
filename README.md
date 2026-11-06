# Kvíz

Generátor kvízových otázek přes Claude API (model `claude-opus-5-5`) s bodováním týmů.

## Spuštění

```bash
npm install
cp .env.example .env   # doplň ANTHROPIC_API_KEY
npm start              # http://localhost:3000  (npm run dev = s auto-reloadem)
```

## Ovládání

| Klávesa | Akce |
|---|---|
| `1`–`4` | +1 bod týmu s daným číslem |
| `0` | +1 bod všem týmům |
| `Shift` + číslo | −1 bod (`Shift` + `0` všem týmům) |
| `A` / `B` / `C` | vybrat odpověď (ukáže správnou + vysvětlení) |
| `Mezerník` / `Enter` | ukázat správnou odpověď bez výběru |
| `←` / `→` | předchozí / další otázka |
| `A` | archiv (u otázky běžícího kvízu vybírá odpověď A) |

Týmy (max. 4) jdou přidat, odebrat a přejmenovat kliknutím na název. Stav (otázky, body) se drží v `localStorage`, takže přežije reload.

## Archiv

Menu ☰ → **Archiv**: počet vygenerovaných kvízů a otázek a seznam všech odehraných kvízů. Každý kvíz se ukládá i s celým průběhem (timeline): přechody mezi otázkami, vybrané/ukázané odpovědi, každé přidání a odebrání bodů a změny týmů. Odehraný kvíz se otevře v zamčeném stavu – stejné obrazovky, ale nic nejde měnit; lišta týmů ukazuje body po dané otázce a výsledky obsahují časovou osu. Archiv je v `localStorage` (klíč `kviz-archive-v1`), tedy jen v daném prohlížeči.

## Deploy (Coolify / Nixpacks)

Nixpacks pozná Node app a spustí `npm start`. V Coolify nastav env proměnnou `ANTHROPIC_API_KEY` (volitelně `CLAUDE_MODEL`, port bere z `PORT`).
