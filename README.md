# MeteOrto 🌞🥕

Meteo su misura per il tuo orto: previsioni a breve termine per un punto preciso,
allerta gelo, consigli di annaffiatura e di semina. Web app installabile (PWA),
tutti i dati restano sul tuo dispositivo.

> Stato: previsioni multi-modello, sole diretto con orizzonte, gelo, pioggia e annaffiatura,
> luna e calendario delle semine. In arrivo: diario dell'orto e lavori del mese.

## Cosa fa

- **Oggi / Giorni**: previsioni a 5 giorni da 5 modelli, con indicatore di affidabilità; ore di sole diretto nell'orto.
- **Gelo**: avviso con giorni di anticipo (minima, temperatura sul terreno, cause) e statistica storica delle gelate.
- **Pioggia**: pioggia caduta e prevista, consiglio di annaffiatura, mattine adatte ai lavori.
- **Orto**: fase lunare e calendario, cosa seminare o trapiantare *ora*. Il periodo della tabella è solo la
  finestra possibile: dentro decidono la temperatura del terreno e le gelate previste.

## Tabella delle colture

I valori di partenza sono in `src/data/colture.json` (scritti come dati originali, indicativi per il Nord Italia).
Dall'app (**Orto → Modifica la tabella delle colture**) puoi cambiare periodi e soglie di ogni coltura, ripristinare
l'originale o aggiungere colture tue: le modifiche restano sul dispositivo.

## Installare l'app sul telefono

Apri l'indirizzo dell'app (`https://<utente>.github.io/MeteOrto/`):

- **iPhone (Safari)**: tocca *Condividi* → *Aggiungi alla schermata Home*.
- **Android (Chrome)**: menu ⋮ → *Installa app* (o *Aggiungi a schermata Home*).

## Sviluppo

```bash
npm install
npm run dev        # server di sviluppo
npm test           # test unitari (Vitest)
npm run check      # controllo tipi
npm run build      # build di produzione in dist/
npm run icons      # rigenera le icone PWA da public/favicon.svg
```

## Pubblicazione su GitHub Pages

1. Crea il repository su GitHub (il nome deve essere `MeteOrto`, oppure imposta
   `BASE_PATH` di conseguenza: il workflow usa già il nome del repository).
2. In *Settings → Pages* scegli come sorgente **GitHub Actions**.
3. Ogni push su `main` esegue controlli, test, build e pubblicazione.

## Struttura

- `src/core/` logica meteo pura e testabile (nessuna UI, nessun fetch)
- `src/adapters/` accesso a servizi esterni e storage
- `src/app/` orchestrazione (fetch → cache → core)
- `src/data/` tabelle modificabili (colture, lavori)
- `src/ui/` interfaccia Svelte, testi in italiano
