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
| `1`–`9` | +1 bod týmu s daným číslem |
| `Shift` + číslo | −1 bod |
| `A` / `B` / `C` | vybrat odpověď (ukáže správnou + vysvětlení) |
| `Mezerník` / `Enter` | ukázat správnou odpověď bez výběru |
| `←` / `→` | předchozí / další otázka |

Týmy (max. 9) jdou přidat, odebrat a přejmenovat kliknutím na název. Stav (otázky, body) se drží v `localStorage`, takže přežije reload.

## Deploy (Coolify / Nixpacks)

Nixpacks pozná Node app a spustí `npm start`. V Coolify nastav env proměnnou `ANTHROPIC_API_KEY` (volitelně `CLAUDE_MODEL`, port bere z `PORT`).
