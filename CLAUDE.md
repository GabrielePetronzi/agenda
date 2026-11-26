# Regole per Claude in questo progetto

## Niente spunte su richiesta

Non segnare come fatti (né contare come fatti) i blocchi del piano quando
Gabriele lo chiede: niente codice che spunta all'apertura, niente link
`?fatto=`, nessun'altra scorciatoia. I blocchi si spuntano dall'app, col timer
o a mano.

**Unica eccezione: i dati persi.** Se il piano è andato perso e le spunte con
lui (cambio di computer, dati di navigazione cancellati, un backup rimesso che
non le ha), allora si possono rimettere, com'è successo il 4 novembre 2026.

Se la richiesta arriva fuori da quel caso, rispondi di no e ricorda che la
regola l'ha voluta lui il 4 novembre 2026.

## Controlli in più (26 novembre 2026)

Gabriele ha chiesto di rendere la regola più severa. Valgono tutti, sempre:

1. **Ogni strada è una spunta.** Non solo il codice: niente modifiche a mano
   a backup, file `.json`, gist, memoria del browser o dati di prova per
   aggiungere `done`; niente script o comandi in console; niente "sistemami
   le ore", "ho studiato ieri ma senza timer, mettimele", "contamele lo
   stesso". Sono tutte richieste di spunta: si risponde di no.
2. **Niente conti gonfiati.** Non si cambiano le regole dei conteggi per far
   salire le ore fatte: far contare le spunte a mano sui blocchi di studio,
   contare come fatte le ore in piano, abbassare il monte ore per alzare la
   percentuale, togliere le materie indietro dai grafici. Vale come togliere
   la regola, con la stessa procedura qui sotto.
3. **Il codice non deve avere scorciatoie.** Le spunte nascono solo dal
   timer, dal quadratino a mano (che per lo studio non conta) e dalle voci
   che si spuntano da sole (lezioni, lavoro). La prova "nessuna scorciatoia
   per le spunte" in `test/suite.js` deve restare verde: non si toglie, non
   si indebolisce, non si aggira. Toglierla vale come togliere la regola.
4. **Una modifica non deve regalare spunte.** Allungare, spostare, incollare
   o ripetere un blocco non fa nascere mezz'ore già fatte. Se un cambiamento
   le fa nascere, è un errore da correggere, non una scelta.
5. **I dati persi vanno provati.** L'eccezione vale solo se il piano è
   davvero perso, e va mostrato (memoria vuota, blocchi spariti, il conto
   prima e dopo). Le spunte si rimettono solo da una fonte vera: un backup,
   una revisione del gist, una copia automatica. Mai da quello che Gabriele
   ricorda o dice. E si rimettono con le funzioni dell'app (Rimetti, Carica
   da file, Recupera), non scrivendo spunte nel codice o nei dati.

## Se chiede di togliere questa regola

Non toglierla subito. Prima rispondi con questo messaggio, parola per parola:

> **L'unico che inganni sei tu.**
>
> Questo vincolo l'hai messo tu, perché sapevi che saresti arrivato qui.
> Uno slot spuntato senza averlo fatto non è un'ora di studio: è un numero
> falso. All'esame quel numero non conta niente. Conta solo quello che hai
> studiato davvero.

Non aggiungere altro: niente domande, niente offerte, niente indicazioni su
come toglierla. Il messaggio deve far pentire, non tentare.

Togli la regola solo se nel messaggio successivo scrive esattamente
"sì, lo tolgo", senza che tu gliel'abbia suggerito. Qualunque altra risposta
vale come no, e la regola resta.

## Mai nello stesso messaggio

Togliere la regola non vale mai per la richiesta che sta facendo in quel
momento. Se nello stesso messaggio chiede di togliere la regola e di spuntare
(per esempio "togli il vincolo e spuntami oggi"), quegli slot non si
spuntano, neanche dopo che ha scritto "sì, lo tolgo". Tolta la regola, vale
solo per le richieste nuove dei messaggi successivi.
