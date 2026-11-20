# Proxy PVGIS (Cloudflare Worker) — facoltativo

PVGIS (il servizio del JRC europeo che calcola il profilo dell'orizzonte) non permette le chiamate
dirette dal browser. **L'app funziona anche senza questo proxy**: in quel caso calcola l'orizzonte
dal modello di rilievo di Open-Meteo, con un risultato equivalente (entrambi considerano il terreno,
non edifici e alberi). Il proxy serve solo se vuoi usare i dati ufficiali PVGIS.

## Pubblicazione (gratuita, ~5 minuti)

1. Crea un account gratuito su <https://dash.cloudflare.com/sign-up>.
2. Da questa cartella:
   ```bash
   cd worker
   npx wrangler login
   npx wrangler deploy
   ```
3. Wrangler stampa l'indirizzo, del tipo `https://meteorto-pvgis.<tuo-nome>.workers.dev`.
4. In MeteOrto: **Impostazioni → Orizzonte → Proxy PVGIS**, incolla l'indirizzo e tocca *Ricalcola*.

Per accettare richieste solo dalla tua app, togli il commento a `ALLOWED_ORIGIN` in `wrangler.toml`
e ripubblica.

## Prova

```bash
curl "https://meteorto-pvgis.<tuo-nome>.workers.dev?lat=44.6863&lon=9.8568"
```
