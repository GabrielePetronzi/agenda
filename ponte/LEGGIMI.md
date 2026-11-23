# Il ponte col Calendario Apple (nei due sensi)

Senza ponte l'agenda scrive solo il calendario a cui ti iscrivi (`piano.ics`):
lo vedi su Mac e iPhone, ma quello che cambi lì non torna indietro.

Con il ponte i blocchi diventano eventi di un calendario iCloud, **Agenda studio**.
Lo vedono Mac e iPhone, e quello che cambi lì torna nell'agenda:

- **sposti o allunghi un evento** → il blocco si sposta;
- **cancelli un evento** → il blocco si toglie;
- **crei un evento** in *Agenda studio* con titolo `Materia · Attività`
  (es. `Big data · Esercizi`) → diventa un blocco. Con solo `Materia` diventa
  un ripasso di quella materia. `Lavoro`, `Ripasso`, `Arrampicata` vanno bene da soli.

Cosa non passa mai dal calendario:
- **le spunte**: un blocco con ore già spuntate non si sposta né si toglie, e
  l'evento torna com'era;
- **il passato**: niente si mette o si sposta prima di adesso.

Le modifiche arrivano all'agenda quando la apri, oppure entro un minuto se è già aperta.

## Cosa serve

- La sincronizzazione dell'agenda già attiva ("Sincronizza dispositivi", con il token GitHub).
- Un account Cloudflare gratuito.
- Una password per app di Apple.

## Passo per passo

**1. L'id del gist.** In "Sincronizza dispositivi" copia il link del calendario. È fatto così:
`https://gist.githubusercontent.com/TUONOME/`**`QUESTO-CODICE-LUNGO`**`/raw/piano.ics`.
Il codice lungo in mezzo è il `GIST_ID`.

**2. La password per app di Apple.** Vai su [account.apple.com](https://account.apple.com),
poi *Accesso e sicurezza → Password specifiche per le app*, e generane una chiamata
`agenda-ponte`. È di 16 lettere, del tipo `abcd-efgh-ijkl-mnop`. Non è la password dell'Apple ID.

**3. Il Worker.** Su [dash.cloudflare.com](https://dash.cloudflare.com):
*Workers & Pages → Create → Create Worker*, nome `agenda-ponte`, *Deploy*.
Poi *Edit code*: cancella tutto, incolla il contenuto di `ponte/worker.js` e premi *Deploy*.

**4. Le variabili.** Nel Worker: *Settings → Variables and Secrets*. Aggiungi queste cinque,
tutte di tipo **Secret**:

| Nome | Valore |
|---|---|
| `GITHUB_TOKEN` | lo stesso token che hai messo nell'agenda |
| `GIST_ID` | il codice del passo 1 |
| `ICLOUD_UTENTE` | la email del tuo Apple ID |
| `ICLOUD_PASSWORD` | la password per app del passo 2 |
| `PONTE_CHIAVE` | una parola a caso, serve per lanciarlo a mano |

**5. Ogni 5 minuti.** *Settings → Trigger events → Cron Triggers → Add*, e scrivi `*/5 * * * *`.

**6. La prima prova.** Apri nel browser
`https://agenda-ponte.TUOSOTTODOMINIO.workers.dev/?chiave=LATUAPAROLA`.
Risponde con il resoconto del giro. Al primo giro crea il calendario *Agenda studio*
su iCloud e ci scrive i primi 35 eventi; gli altri arrivano nei giri dopo. Il
piano gratuito di Cloudflare permette un numero limitato di richieste per giro.

**7. Togli l'iscrizione.** Se ti eri iscritto al calendario `piano.ics`, cancella
l'iscrizione da Calendario: se no ogni blocco compare due volte.

In "Sincronizza dispositivi" la riga sotto il link dice quando il ponte ha fatto
l'ultimo giro, e se ha trovato un errore.

## Se qualcosa non va

- *"iCloud rifiuta l'accesso"*: Apple ID o password per app sbagliati. Rigenera
  la password per app.
- *"GitHub rifiuta il token"*: il token è scaduto o non ha il permesso `gist`.
- *"nel gist manca calendario.json"*: apri l'agenda e premi *Sincronizza ora*.
- *"il calendario risulta vuoto: non tocco niente"*: il ponte ha letto un calendario
  vuoto mentre si aspettava degli eventi. Si ferma per non cancellare il piano.
  Succede se il calendario *Agenda studio* è stato cancellato. Per ripartire da zero,
  cancella `ponte.json` dal gist.
- Le prove del ponte (senza iCloud) si lanciano con `./test/ponte.sh`.
