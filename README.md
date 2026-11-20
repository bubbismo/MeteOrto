# MeteOrto 🌞🥕

Meteo su misura per il tuo orto: previsioni a breve termine per un punto preciso,
allerta gelo, consigli di annaffiatura e di semina. Web app installabile (PWA),
tutti i dati restano sul tuo dispositivo.

> Stato: previsioni multi-modello, sole diretto con orizzonte, gelo, pioggia e annaffiatura,
> luna, calendario delle semine, lavori del mese e diario dell'orto. In arrivo: rifinitura grafica.

## Cosa fa

- **Oggi / Giorni**: previsioni a 5 giorni da 5 modelli, con indicatore di affidabilità; ore di sole diretto nell'orto.
- **Gelo**: avviso con giorni di anticipo (minima, temperatura sul terreno, cause) e statistica storica delle gelate.
- **Pioggia**: pioggia caduta e prevista, consiglio di annaffiatura, mattine adatte ai lavori.
- **Orto**: fase lunare e calendario, cosa seminare o trapiantare *ora*. Il periodo della tabella è solo la
  finestra possibile: dentro decidono la temperatura del terreno e le gelate previste.

## Diario e lavori

- **Diario** (Orto → Diario): tocca **＋ Ho seminato** e scegli la coltura, in due tocchi. Per ogni semina l'app
  salva da sola il meteo dei 30 giorni successivi (terreno, minime, gelate, pioggia): così capisci perché è
  andata bene o male. Il raccolto si segna con periodo e stelle (da 1 a 5).
- **Suggerimenti**: se almeno 3 stagioni diverse confermano lo stesso risultato (per esempio fagiolini seminati
  a inizio settembre con buon raccolto) il diario propone di spostare la finestra della tabella. Non cambia mai
  nulla da solo: decidi tu con *Applica* o *Ignora*. In Impostazioni puoi ridurre la soglia a 2 stagioni.
- **Lavori** (Orto → Lavori): calendario dei lavori del mese, incrociato con le mattine adatte previste, il
  gelo e la luna. I primi compaiono anche in *Oggi*. La tabella è in `src/data/lavori.json`.
- **Backup** (Impostazioni → Dati e backup): esporta tutto in JSON (diario, colture modificate, impostazioni) o il
  solo diario in CSV (apribile in Excel); importa un file per ripristinare o unire i dati.

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
