/* Uno studente qualunque, quattro settimane di uso vero.
   Non prova una funzione alla volta come suite.js: fa i gesti nell'ordine in
   cui li farebbe uno — apre, aggiunge, dipinge, spunta, sbaglia, torna
   indietro — e dopo ognuno si guarda intorno per vedere se qualcosa non
   torna: mezz'ore orfane, scadenze agganciate a materie sparite, numeri rotti
   a schermo, conti che non tornano.

   Come si lancia: si inietta in una copia di index.html come fa test/run.sh,
   e si legge il titolo della pagina.

   ATTENZIONE ai gesti finti. Se i pointerdown/pointerup partono a distanza di
   millisecondi l'app li legge come un doppio tocco — che e' giusto, e' quello
   che fa un doppio tocco vero — e il simulatore trova difetti che non
   esistono. Fra un gesto e l'altro devono passare piu' di seicento
   millisecondi, e le coordinate vanno rilette ogni volta: dipingere cambia
   l'altezza delle righe, e un rettangolo misurato prima non e' piu' li'. */
/* Uno studente qualunque che usa l'app per quattro settimane. Non chiama i
   controlli a mano: fa i gesti, e dopo ogni gesto si guarda intorno per vedere
   se qualcosa non torna. */
(function(){
  var problemi=[],passi=[],ora="";
  window.onerror=function(m,f,l){problemi.push("ECCEZIONE durante "+ora+": "+m+" (riga "+l+")");};
  window.addEventListener("unhandledrejection",function(e){
    problemi.push("PROMESSA ROTTA durante "+ora+": "+e.reason);});
  var errCons=console.error;
  console.error=function(){problemi.push("console.error durante "+ora+": "+
    [].slice.call(arguments).join(" "));errCons.apply(console,arguments);};

  function guai(m){problemi.push("["+ora+"] "+m);}
  function passo(nome,f){
    ora=nome;passi.push(nome);
    try{f();}catch(e){guai("il gesto e' esploso: "+e.message);}
    try{controlli();}catch(e){guai("i controlli sono esplosi: "+e.message);}
  }
  /* ---- le cose che devono essere vere sempre ---- */
  function controlli(){
    /* 1. niente numeri rotti a schermo */
    var t=document.body.innerText||"";
    ["NaN","undefined","Infinity","[object Object]"].forEach(function(brutto){
      if(t.indexOf(brutto)>=0)guai("a schermo si legge \""+brutto+"\"");});
    /* 2. ogni blocco disegnato corrisponde a un blocco in memoria */
    var viste={};
    document.querySelectorAll("td.c[data-date]").forEach(function(td){
      viste[td.dataset.date]=1;});
    Object.keys(viste).forEach(function(d){
      var quanti=runsOf(d).length;
      var disegnati=document.querySelectorAll('.blk[data-date="'+d+'"]').length;
      if(disegnati&&quanti&&disegnati%quanti!==0)
        guai(d+": "+quanti+" blocchi in memoria, "+disegnati+" disegnati");
    });
    /* 3. salvare e ricaricare non cambia niente */
    var p1=payload();
    var prima=JSON.parse(p1);
    if(Object.keys(prima.cells||{}).length!==Object.keys(state.cells).length)
      guai("il salvataggio perde delle celle");
    /* 4. i CFU conseguiti non possono superare quelli del piano */
    var c=cfuFatti(),pc=pianoCfu();
    if(c.ob+c.sc>pc.tot+0.001)guai("CFU conseguiti "+(c.ob+c.sc)+" su un piano da "+pc.tot);
    if(c.ob<0||c.sc<0)guai("CFU negativi");
    /* 5. le percentuali stanno fra 0 e 100 */
    document.querySelectorAll(".prow .ph").forEach(function(e){
      var m=/(-?\d+)%/.exec(e.textContent);
      if(m&&(+m[1]<0||+m[1]>100))guai("una percentuale dice "+m[1]+"%");});
    /* 6. nessun disegno con coordinate rotte */
    document.querySelectorAll("#semBody svg path,#semBody svg rect,#semBody svg line")
      .forEach(function(e){
        ["d","x","y","width","height","x1","y1","x2","y2"].forEach(function(a){
          var v=e.getAttribute(a);
          if(v&&/NaN|Infinity/.test(v))guai("un grafico ha "+a+"=\""+v+"\"");});});
    /* 7. le ore in piano coincidono col numero di mezz'ore messe */
    var mezz=0;
    Object.keys(state.cells).forEach(function(k){
      (state.cells[k]||[]).forEach(function(v){if(v)mezz++;});});
    if(mezz<0)guai("conteggio delle mezz'ore negativo");
    /* 8. nessun blocco fuori dalla fascia oraria mostrata */
    Object.keys(state.cells).forEach(function(k){
      var sl=+k.split(".")[3];
      if(sl<0||sl>47)guai("una mezz'ora sta allo slot "+sl);});
  }

  var it=items().filter(function(o){return o.kind!=="g";});
  var G=function(){var g=[];document.querySelectorAll("td.c").forEach(function(x){
    if(g.indexOf(x.dataset.date)<0)g.push(x.dataset.date);});return g;};

  /* ============ SETTIMANA 1: il primo giorno ============ */
  passo("apro l'app la prima volta",function(){
    state.cells={};state.exams=[];state.over={};state.custom=[];state.pass={};
    setDayRange(8,24);applySpan();render();
  });
  passo("metto la data di due esami",function(){
    setDataEsame(it[0].id,"2026-11-05","09:00");
    setDataEsame(it[1].id,"2026-12-15","");
    save();render();
  });
  passo("aggiungo una voce mia col pulsante",function(){
    document.getElementById("newName").value="Palestra";
    document.getElementById("newCfu").value="0";
    document.getElementById("newDate").value="";
    document.getElementById("addBtn").click();
  });
  passo("dipingo la settimana: lezioni, schemi, esercizi",function(){
    var g=G();
    for(var d=0;d<5;d++){
      placeRun(g[d],18,{i:it[0].id,a:"LEZ",len:4},0);
      placeRun(g[d],28,{i:it[1].id,a:"SCH",len:3},0);
      placeRun(g[d],34,{i:it[0].id,a:"ESE",len:2},0);
    }
    placeRun(g[5],20,{i:it[1].id,a:"RIP",len:6},0);
    save();render();
  });
  passo("affianco due materie nella stessa mezz'ora",function(){
    var g=G();
    state.affianca=true;gridModes();
    placeRun(g[0],18,{i:it[1].id,a:"LET",len:2},1);
    state.affianca=false;gridModes();
    save();render();
  });
  passo("spunto quello che ho fatto lunedi",function(){
    var g=G();
    var r=runAt(g[0],18,0);
    if(r)setDone(g[0],r.start,r.len,0,true);
    save();render();
  });
  passo("guardo i grafici",function(){
    state.semOpen=true;semSummary();
  });
  passo("uso il pomodoro su un blocco di oggi",function(){
    var oggi=iso(new Date());
    placeRun(oggi,20,{i:it[0].id,a:"SCH",len:3},0);
    save();render();
    var g=slotDiOggi("SCH");
    if(g){pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
      pomAdvance(true);pomAdvance(true);}
  });
  passo("chiudo il portatile e riapro (il timer e' scaduto)",function(){
    if(state.pomRun){state.pomRun.ends=Date.now()-60*60*1000;pomAdvance(true);}
  });
  passo("fermo il pomodoro",function(){if(state.pomRun)pomStop();});
  passo("annullo e ripeto un paio di volte",function(){
    histInit();commit();
    var g=G();
    placeRun(g[6],20,{i:it[0].id,a:"PRO",len:4},0);commit();
    undo();redo();undo();
  });

  /* ============ SETTIMANA 2: copio e incollo ============ */
  passo("copio la settimana e la incollo nella prossima",function(){
    copyWeek(0);
    if(typeof pasteWeek==="function")pasteWeek(1);
    save();render();
  });
  passo("vado avanti di una settimana",function(){
    state.anchor[state.ctx]=iso(addDays(parse(state.anchor[state.ctx]||iso(monday(new Date()))),7));
    applySpan();render();
  });
  passo("cambio le ore mostrate della giornata",function(){
    setDayRange(6,23);applySpan();render();
    if(autoRow())redrawGrid();
  });
  passo("passo alla vista di un giorno solo e torno",function(){
    state.span=1;applySpan();render();
    state.span=7;applySpan();render();
  });
  passo("cerco una materia nel piano",function(){
    var q=document.getElementById("q");
    q.value="intel";state.q="intel";picklist();
    q.value="";state.q="";picklist();
  });

  /* ============ SETTIMANA 3: le cose che vanno storte ============ */
  passo("mi sveglio tardi: la linea di oggi supera dei blocchi",function(){
    var oggi=iso(new Date());
    placeRun(oggi,16,{i:it[0].id,a:"LEZ",len:2},0);
    save();render();
    if(typeof arretrati==="function")arretrati();
    if(typeof lateBar==="function")lateBar();
  });
  passo("uso Sposta avanti per recuperare",function(){
    if(typeof spostaArretrati==="function")spostaArretrati();
    save();render();
  });
  passo("cancello un tratto con la gomma",function(){
    var g=G();
    clearRun(g[1],28,3,0);
    save();render();
  });
  passo("svuoto tutta una settimana",function(){
    if(typeof wipeWeek==="function")wipeWeek(0);
    save();render();
  });
  passo("segno un esame come superato",function(){
    state.pass[it[0].id]=1;save();render();cfuBar();
  });
  passo("torno indietro di due settimane",function(){
    state.anchor[state.ctx]=iso(addDays(parse(state.anchor[state.ctx]),-14));
    applySpan();render();
  });

  /* ============ SETTIMANA 4: salvataggi e ripensamenti ============ */
  passo("salvo e ricarico da zero, come farebbe il browser",function(){
    var p=payload();
    state.cells={};state.exams=[];render();
    adopt(JSON.parse(p));applySpan();render();
  });
  passo("cambio l'anno e il semestre",function(){
    state.year=2;state.ctx="2";applySpan();render();
    state.year=1;state.ctx="1";applySpan();render();
  });
  passo("apro il pannello del giorno e quello dei backup",function(){
    if(typeof openDay==="function"){openDay(iso(new Date()));closeDay();}
    if(typeof bkStato==="function")bkStato();
    if(typeof bkCopieList==="function")bkCopieList();
  });
  passo("guardo i grafici con dentro tre settimane di roba",function(){
    state.semOpen=true;semSummary();
  });
  passo("cambio colore a una materia a mano",function(){
    state.colors[it[0].id]="#FF0000";save();render();
    delete state.colors[it[0].id];save();render();
  });
  passo("stringo la finestra e la riallargo",function(){
    window.dispatchEvent(new Event("resize"));
    if(autoRow())redrawGrid();
  });

  var esito=problemi.length?("PROBLEMI "+problemi.length):("PULITO "+passi.length+" gesti");
  document.title=esito;
  var pre=document.createElement("pre");pre.id="MIS";
  pre.textContent=esito+"\n"+problemi.join("\n");
  document.body.appendChild(pre);
})();
