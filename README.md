# MeteOrto 🌞🥕

Meteo su misura per il tuo orto: previsioni a breve termine per un punto preciso, allerta gelo, consigli di
annaffiatura, sole diretto con il profilo dell'orizzonte, semine, lavori del mese e diario.
È una web app installabile (PWA): tutti i dati restano sul tuo dispositivo.

**App online:** <https://bubbismo.github.io/MeteOrto/>

## Installare l'app sul telefono

- **iPhone (Safari)**: apri l'indirizzo qui sopra, tocca *Condividi* ⬆️ → *Aggiungi alla schermata Home*.
- **Android (Chrome)**: apri l'indirizzo, tocca ⋮ → *Installa app* (oppure il pulsante *Installa* che compare in *Oggi*).

Dopo la prima apertura funziona anche senza rete: mostra l'ultima previsione scaricata.

**Aggiornamenti**: quando esce una nuova versione compare l'avviso *«È pronta una nuova versione · Aggiorna»*. Nulla si
ricarica da solo, e dopo l'aggiornamento torni nella stessa schermata in cui eri (se hai usato l'app da meno di mezz'ora;
altrimenti si riparte da *Oggi*).

## Primo avvio

Scegli la posizione del tuo orto in uno di questi modi:

1. **📍 Usa la mia posizione** (GPS del telefono);
2. **🔎 Cerca** il paese o la località;
3. **🗺️ Tocca la mappa** (con la vista *Satellite* riconosci l'orto dall'alto) e trascina il segnaposto;
4. incolla le coordinate o un link di Google Maps (es. `44.68630, 9.85680`).

L'altitudine si ricava da sola. Puoi cambiare posizione in qualsiasi momento da **Impostazioni**:
l'app funziona per qualunque punto, quindi puoi condividerla con amici che vivono altrove.

## Cosa fa

| Scheda | Contenuto |
|---|---|
| **Oggi** | Condizioni attuali con cielo animato, allerta gelo, consiglio di annaffiatura, lavori del periodo, mattine adatte, **sole diretto nell'orto** (calcolato con l'orizzonte reale) e prossime ore. |
| **Giorni** | 5 giorni con minime, massime, pioggia, vento, raffiche, ore di sole e **affidabilità** (quanto i modelli concordano). Statistica storica delle gelate. |
| **Pioggia** | Consiglio di annaffiatura e storico della pioggia con date e quantità: vista **7 giorni** (con i 5 giorni previsti), **Mese** e **Anno** (con frecce per scorrere), toccando una barra vedi quel giorno o mese; elenco di «quando è piovuto», giorni senza pioggia e confronto con la media degli ultimi 25 anni del tuo punto. I dati scaricati restano sul telefono e si scarica solo ciò che manca. |
| **Orto** | **Semine** (fase lunare, cosa seminare o trapiantare *ora*), **Lavori** del mese e **Diario**. |
| **Impostazioni** | Posizione, tipo di terreno, orizzonte, backup, crediti. |

### Come ragiona

- **Previsione combinata**: 5 modelli (ICON-D2, ICON-EU, AROME, ECMWF IFS, ICON-2I ARPAE) con pesi diversi a breve e
  medio termine. L'indicatore di affidabilità scende quando i modelli divergono su temperature o pioggia.
- **Gelo**: dalla minima prevista, punto di rugiada, nuvole e vento si stima la temperatura *sul terreno* (con cielo
  sereno e aria ferma scende fino a ~3,5 °C sotto quella a 2 m). Livelli: nessuno / possibile / probabile, con giorni
  di anticipo. Oltre l'orizzonte delle previsioni si usano gli ultimi 25 anni di dati del punto.
- **Grandine**: allerta **gialla** (possibile) o **arancione** (probabile) fino a 5 giorni prima, con fascia oraria e
  consigli. Si calcola da energia dei temporali (CAPE), vento in quota, codici di grandine dei modelli e quanti modelli
  concordano; è stata tarata su previsioni passate (circa il 4-12% dei giorni d'estate, nessuno d'inverno). È una
  *stima dei modelli*, non un'allerta ufficiale: controlla anche i bollettini della Regione e della Protezione Civile.
- **Annaffiatura**: bilancio idrico degli ultimi 21 giorni (pioggia, evapotraspirazione ET0, tipo di terreno) e pioggia
  prevista nelle 48 ore: *annaffia oggi*, *aspetta* oppure *non serve*.
- **Sole diretto**: la posizione del sole ogni minuto confrontata con il profilo dell'orizzonte. Se PVGIS non è
  configurato, l'orizzonte si calcola dal rilievo del terreno (tile pubblici, nessuna quota; sul punto di prova scarto
  medio di 1° dai dati ufficiali PVGIS). Considera montagne e colline, non edifici o alberi vicini.
- **Semine**: il periodo della tabella è solo la *finestra possibile*. Dentro la finestra decidono la temperatura del
  terreno (settimana passata e prossimi giorni) e le gelate previste: se il terreno è troppo freddo l'indicazione si
  sposta in avanti e l'app lo dice; se invece è prevista una gelata avvisa con giorno e minima e suggerisce le
  contromisure (rimandare, pacciamare, coprire con tessuto non tessuto o tunnel). La luna è solo un'informazione.
- **Diario**: *＋ Ho seminato* + la coltura = due tocchi. Per ogni semina l'app salva il meteo dei 30 giorni successivi.
  Quando almeno 3 stagioni diverse confermano lo stesso risultato propone di spostare la finestra della tabella;
  non cambia mai nulla da sola.

## Tabelle modificabili

- **Colture**: `src/data/colture.json` (periodi, soglie del terreno, sensibilità al gelo, profondità, distanze…).
  Dall'app: *Orto → Modifica la tabella delle colture*. Le modifiche restano sul dispositivo e si possono ripristinare.
- **Lavori**: `src/data/lavori.json`.

I valori sono indicativi (Nord Italia, pianura e collina) e scritti come dati originali: confrontali con la tua
esperienza e con i calendari di semina che usi.

## Backup

**Impostazioni → Dati e backup**: backup completo in JSON (diario, colture modificate, impostazioni) e diario in CSV
(apribile in Excel). L'importazione unisce i dati.

## PVGIS (facoltativo)

PVGIS non può essere chiamato direttamente da un browser. Se vuoi usare i suoi dati ufficiali dell'orizzonte,
pubblica il piccolo proxy gratuito in [worker/](worker/README.md) e incolla il suo indirizzo in
*Impostazioni → Orizzonte*.

## Sviluppo

```bash
npm install
npm run dev        # server di sviluppo
npm test           # test unitari (Vitest)
npm run check      # controllo tipi
npm run build      # build di produzione in dist/
npm run icons      # rigenera le icone PWA da public/favicon.svg
```

Architettura a strati: `src/core/` (logica meteo e agronomica pura e testata, senza interfaccia né rete),
`src/adapters/` (Open-Meteo, PVGIS, archiviazione locale), `src/app/` (orchestrazione e cache), `src/ui/` (Svelte).

**Stazione meteo personale (predisposta, non ancora nell'interfaccia)**: `DataSource` in `src/core/types.ts` descrive
una fonte di misure reali; `src/adapters/datasource/csv.ts` ne legge i dati da un file CSV e `src/core/bias/` calcola di
quanto le previsioni sbagliano nel tuo punto (es. «la mia stazione è 1,5 °C più fredda dei modelli») e le corregge.
Per collegare Ecowitt, Davis o Netatmo basta scrivere un nuovo adapter che implementi `DataSource`.

## Pubblicazione su GitHub Pages

1. Crea il repository (il nome deve essere `MeteOrto`, oppure imposta `BASE_PATH`).
2. In *Settings → Pages* scegli come sorgente **GitHub Actions**.
3. Ogni push su `main` esegue controlli, test, build e pubblicazione.

## Crediti e limiti

Dati meteo e storico: [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0, uso gratuito non commerciale). Il servizio
gratuito ha un limite di richieste **per rete** (10.000 al giorno, contate più care se le richieste sono grandi): un
uso normale ne consuma pochissime, ma dispositivi sullo stesso wifi condividono il limite. Il rilievo per l'orizzonte e
l'altitudine arrivano invece da tile pubblici senza quota. Rilievo: [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen, AWS Open Data; SRTM, NASA, USGS e altri). Mappe e nome della località: © OpenStreetMap (Nominatim), Esri.
Sole e luna: [SunCalc](https://github.com/mourner/suncalc). Le previsioni sono indicative.
