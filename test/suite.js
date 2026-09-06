  var T=[],ok=0,ko=0;
  function t(nome,f){
    try{var r=f();
      if(r===true){ok++;}
      else{ko++;T.push("KO · "+nome+" · "+r);}
    }catch(e){ko++;T.push("KO · "+nome+" · eccezione: "+e.message);}
  }
  var eq=function(a,b,q){return a===b?true:(q||"")+" ho "+JSON.stringify(a)+" invece di "+JSON.stringify(b);};
  var pulisci=function(){state.cells={};state.pass={};state.log={};state.pomLog=null;
    state.pomRun=null;state.over={};state.colors={};state.exams=[];selRuns={};};
  var it=items(), oggi=iso(new Date()), G=[], H0=0;
  /* La giornata mostrata va riaperta a mano ogni volta che adopt() la rimette
     com'era: placeRun scarta gli slot fuori dalla fascia, quindi senza questo
     i test successivi piazzerebbero nel vuoto e fallirebbero per colpa mia. */
  function apri(){
    setDayRange(0,24);
    state.anchor[state.ctx]=iso(monday(new Date()));
    applySpan();
    G=[];document.querySelectorAll("td.c").forEach(function(x){
      if(G.indexOf(x.dataset.date)<0)G.push(x.dataset.date);});
    H0=+document.querySelector("td.c").dataset.h;
  }
  apri();

  /* ---------- griglia ---------- */
  pulisci();
  t("placeRun crea un blocco della lunghezza chiesta",function(){
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:3},0);
    var r=runAt(G[0],H0,0);return r?eq(r.len,3):"nessun blocco";});
  t("il blocco copre tutte le sue mezz'ore",function(){
    return eq(!!runAt(G[0],H0+2,0),true,"alla terza mezz'ora ");});
  t("clearRun lo toglie tutto",function(){
    clearRun(G[0],H0,3,0);return eq(runAt(G[0],H0,0),null);});
  t("due blocchi nella stessa mezz'ora vanno su corsie diverse",function(){
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    placeRun(G[0],H0,{i:it[1].id,a:"RIP",len:2},1);
    return eq(runsOf(G[0]).length,2);});
  t("le corsie non superano il massimo",function(){
    return eq(freeLane(G[0],H0,2)<=MAXLANE,true,"freeLane oltre il massimo: ");});

  /* ---------- annulla e ripeti ---------- */
  pulisci();histInit();
  t("annulla riporta indietro, ripeti riapplica",function(){
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);commit();
    var dopo=!!runAt(G[0],H0,0);
    undo();var annullato=!!runAt(G[0],H0,0);
    redo();var ripetuto=!!runAt(G[0],H0,0);
    return (dopo&&!annullato&&ripetuto)?true:
      "messo="+dopo+" dopo undo="+annullato+" dopo redo="+ripetuto;});

  /* ---------- salvataggio e pieghe ---------- */
  t("payload e adopt conservano celle, pieghe ed esami superati",function(){
    pulisci();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    state.collapsed={0:1,2:1};state.pass[it[0].id]=1;
    var p=payload();
    state.cells={};state.collapsed={};state.pass={};
    adopt(JSON.parse(p));
    return (Object.keys(state.cells).length===2&&state.collapsed["0"]===1&&
            state.pass[it[0].id]===1)?true:"celle="+Object.keys(state.cells).length+
            " pieghe="+JSON.stringify(state.collapsed)+" pass="+JSON.stringify(state.pass);});
  t("foldToToday non tocca le pieghe già salvate",function(){
    state.collapsed={0:1,2:1,3:1};pieghePresenti=false;
    adopt(JSON.parse(payload()));foldToToday();
    return eq(JSON.stringify(state.collapsed),'{"0":1,"2":1,"3":1}');});
  t("al primo avvio apre una sola settimana",function(){
    var q=JSON.parse(payload());delete q.collapsed;
    state.collapsed={};pieghePresenti=false;adopt(q);foldToToday();
    return eq(Object.keys(state.collapsed).length,PANELS-1,"settimane piegate: ");});

  /* ---------- pomodoro ---------- */
  pulisci();apri();
  var n=new Date(), ORA=n.getHours()*PERQ+(n.getMinutes()>=30?1:0);
  placeRun(oggi,Math.max(0,ORA-4),{i:it[0].id,a:"ESE",len:2},0);
  placeRun(oggi,ORA,{i:it[1].id,a:"ESE",len:2},0);
  placeRun(oggi,Math.min(46,ORA+6),{i:it[2].id,a:"ESE",len:2},0);
  placeRun(oggi,ORA,{i:it[3].id,a:"RIP",len:2},1);
  t("il timer prende lo slot che copre adesso",function(){
    var g=slotDiOggi("ESE");return g?eq(g.start,ORA,"slot "):"nessuno slot";});
  t("il timer non prende lo slot di un'altra attività",function(){
    var g=slotDiOggi("ESE");return g?eq(g.lane,0,"corsia "):"nessuno slot";});
  t("senza slot di quell'attività non aggancia niente",function(){
    return eq(slotDiOggi("LAB"),null);});
  t("a fine sessione il blocco si spunta da solo",function(){
    state.log={};state.pomLog=null;
    var g=slotDiOggi("ESE");
    pomStart("ESE",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(true);
    var q=runAt(oggi,ORA,0);return eq(!!(q&&q.done),true,"spuntato: ");});
  var somma=function(){var s=0;Object.keys(state.log||{}).forEach(function(k){
    Object.keys(state.log[k]).forEach(function(f){s+=state.log[k][f];});});return s;};
  t("la sessione finisce nel registro",function(){
    return eq(somma(),pomConf("ESE").s,"minuti ");});
  t("anche la pausa finisce nel registro",function(){
    pomAdvance(true);
    return eq(somma(),pomConf("ESE").s+pomConf("ESE").b,"minuti ");});
  t("i minuti di oggi contano anche la pausa",function(){
    return eq(pomToday().min,pomConf("ESE").s+pomConf("ESE").b,"minuti di oggi ");});
  t("una sessione scaduta a pagina chiusa spunta lo stesso",function(){
    /* è il caso del portatile richiuso a metà sessione: al rientro la
       sessione è finita davvero, quindi il blocco va spuntato */
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[1].id,a:"ESE",len:2},0);
    var g=slotDiOggi("ESE");
    pomStart("ESE",[{date:g.date,start:g.start,lane:g.lane}]);
    state.pomRun.ends=Date.now()-60000;          /* scaduta un minuto fa */
    if(state.pomRun.paused==null&&Date.now()>=state.pomRun.ends)pomAdvance(true);
    var q=runAt(oggi,ORA,0);
    state.pomRun=null;
    return eq(!!(q&&q.done),true,"spuntato: ");});
  t("un blocco da un'ora e mezza non si spunta tutto in quarantacinque minuti",function(){
    /* il caso vero: schemi da 1h30 e pomodoro da 45 minuti. Una sessione vale
       45 minuti, cioè una mezz'ora spuntata e un quarto d'ora in cassa. */
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:15,l:30,n:4}};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:3},0);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    var conta=function(){var n=0;for(var i=0;i<3;i++){
      var v=at(ck(oggi,ORA+i))[0];if(v&&v.done)n++;}return n;};
    pomAdvance(true);                       /* fine sessione: 45 min */
    var dopoSess=conta();
    pomAdvance(true);                       /* fine pausa: +15 = 60 min */
    var dopoPausa=conta();
    pomAdvance(true);                       /* seconda sessione: +45 */
    var dopoSecondo=conta();
    state.pomRun=null;state.pomConf={};
    return (dopoSess===1&&dopoPausa===2&&dopoSecondo===3)?true:
      "mezz'ore spuntate: dopo la sessione "+dopoSess+" (attesa 1), dopo la pausa "+
      dopoPausa+" (attese 2), dopo la seconda sessione "+dopoSecondo+" (attese 3)";});
  t("chiuso un blocco, il tempo avanzato va nel prossimo di oggi",function(){
    /* 45+12+45+20+45+12 = 179 minuti su due blocchi da un'ora e mezza:
       il primo si chiude e il secondo prende quello che resta */
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:12,l:20,n:2}};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:3},0);
    placeRun(oggi,ORA+4,{i:it[0].id,a:"SCH",len:3},0);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    for(var i=0;i<6;i++)pomAdvance(true);
    var c=function(a,b){var k=0;for(var j=a;j<b;j++){
      var v=at(ck(oggi,j))[0];if(v&&v.done)k++;}return k;};
    var uno=c(ORA,ORA+3),due=c(ORA+4,ORA+7),fermo=state.pomRun===null;
    state.pomRun=null;state.pomConf={};
    /* il primo si chiude, il secondo prende il resto e la sua ultima mezz'ora
       si chiude con la sessione che se l'è quasi tutta mangiata; finita la
       fascia il timer si ferma da solo */
    return (uno===3&&due===3&&fermo)?true:
      "primo "+uno+"/3, secondo "+due+"/3, timer fermo: "+fermo+
      " (attesi 3, 3 e true)";});
  t("la mezz'ora scatta quando la compi, non a fine fase",function(){
    /* Su un blocco lungo il conto deve scorrere: dopo sessione e pausa sono 57
       minuti e una mezz'ora sola; tre minuti dentro la sessione dopo sono
       sessanta, e la seconda mezz'ora deve scattare lì — non alla fine di
       quella sessione, quarantacinque minuti più in là. */
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:12,l:20,n:2}};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:6},0);      /* tre ore */
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    var conta=function(){var k=0;for(var i=0;i<6;i++){
      var v=at(ck(oggi,ORA+i))[0];if(v&&v.done)k++;}return k;};
    pomAdvance(true);pomAdvance(true);                    /* 45 + 12 = 57 */
    var a57=conta();
    var c=pomConf("SCH");
    state.pomRun.ends=Date.now()+(c.s-3)*60000;           /* tre minuti dentro */
    spuntaMaturato(state.pomRun);
    var a60=conta();
    state.pomRun=null;state.pomConf={};
    return (a57===1&&a60===2)?true:
      "a 57 minuti "+a57+"/6, a 60 minuti "+a60+"/6 (attesi 1 e 2)";});
  t("il blocco si chiude a fine sessione, senza aspettare la pausa",function(){
    /* un'ora di studio: dopo i 45 minuti resta mezz'ora, meno di una sessione,
       e non ne farai un'altra per quella: il blocco si chiude lì */
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:12,l:20,n:2}};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:2},0);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(true);                       /* fine della sessione da 45 */
    var k=0;for(var i=0;i<2;i++){var v=at(ck(oggi,ORA+i))[0];if(v&&v.done)k++;}
    var infase=state.pomRun&&state.pomRun.phase;
    state.pomRun=null;state.pomConf={};
    return (k===2&&infase==="break")?true:
      "mezz'ore "+k+"/2, fase "+infase+" (attesi 2 e break)";});
  t("finita la fascia il timer si ferma da solo",function(){
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:12,l:20,n:2}};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:2},0);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(true);                       /* sessione: chiude il blocco */
    var pausa=state.pomRun&&state.pomRun.phase==="break";
    pomAdvance(true);                       /* fine pausa: niente più, si ferma */
    var fermo=state.pomRun===null;
    state.pomConf={};
    return (pausa&&fermo)?true:"la pausa è partita: "+pausa+", timer fermo: "+fermo;});
  t("la pausa che ferma il timer non finisce due volte a registro",function(){
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:12,l:20,n:2}};
    state.log={};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:2},0);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(true);pomAdvance(true);
    var m=0;Object.keys(state.log).forEach(function(k2){
      Object.keys(state.log[k2]).forEach(function(f){m+=state.log[k2][f];});});
    state.pomConf={};
    return eq(m,57,"minuti a registro ");});
  t("la parte fatta e quella da fare diventano due blocchi",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:3},0);
    var key=ck(oggi,ORA),arr=at(key).slice();arr[0].done=1;setAt(key,arr);
    var rs=runsOf(oggi).filter(function(x){return x.lane===0;});
    return (rs.length===2&&rs[0].len===1&&rs[1].len===2)?true:
      "blocchi: "+JSON.stringify(rs.map(function(x){return x.len+(x.v.done?" fatto":" da fare");}));});
  t("una pausa interrotta non vale quanto una sessione",function(){
    state.log={};
    var c=pomConf("ESE");
    state.pomRun={act:"ESE",phase:"break",cycle:1,ends:Date.now()+c.b*60000/2,
                  paused:null,linked:null};
    logPartial(state.pomRun);
    var m=somma();
    return (m<=Math.ceil(c.b/2)+1)?true:"ha registrato "+m+" min invece di ~"+Math.round(c.b/2);});
  state.pomRun=null;

  /* ---------- CFU ---------- */
  pulisci();apri();
  t("la classificazione del manifesto è quella giusta",function(){
    var c=items().filter(function(o){return o.kind==="c";});
    var ob=c.filter(function(o){return o.ob;}).length;
    return (ob===16&&c.length-ob===3)?true:"obbligatorie="+ob+" a scelta="+(c.length-ob);});
  t("i CFU obbligatori del piano fanno 102",function(){
    var v={},s=0;
    items().filter(function(o){return o.kind==="c"&&o.ob;}).forEach(function(o){
      if(o.alt){if(v[o.alt])return;v[o.alt]=1;}s+=o.cfu;});
    return eq(s,102);});
  t("superato senza le ore non porta CFU",function(){
    state.pass={};state.pass["c:1009070"]=1;
    var f=cfuFatti();
    return (f.tot===0&&f.attesa===1)?true:"CFU="+f.tot+" in attesa="+f.attesa;});
  t("superato con le ore porta i CFU",function(){
    var id="c:1009070",serve=targetH(6)*PERQ,messe=0;
    for(var w=0;w<60&&messe<serve;w++)for(var d=0;d<7&&messe<serve;d++){
      var day=iso(addDays(parse(G[0]),w*7+d));
      for(var j=0;j<HOURS.length-1&&messe<serve;j+=2){var sl=HOURS[j];
        placeRun(day,sl,{i:id,a:"LET",len:2,done:1},0);messe+=2;}}
    var f=cfuFatti();
    return (f.tot===6&&f.attesa===0)?true:"CFU="+f.tot+" in attesa="+f.attesa+
      " ore="+(oreFatte(id)/PERQ);});
  t("le due lingue contano una volta sola",function(){
    state.pass["c:1010779"]=1;state.pass["c:1007808"]=1;
    var a=cfuFatti();
    /* nessuna delle due ha le ore: devono restare in attesa, ma una sola */
    return eq(a.attesa,1,"in attesa ");});
  t("un piano senza materie a scelta fa una barra sola",function(){
    var salva=COURSES[1],salva2=COURSES[2];
    COURSES[1]=[{c:"9001",n:"Pedagogia",k:"Pedagogia",p:1,u:12},
                {c:"9002",n:"Didattica",k:"Didattica",p:2,u:9}];
    COURSES[2]=[{c:"9003",n:"Tesi",k:"Tesi",p:2,u:6}];
    var P=pianoCfu();
    COURSES[1]=salva;COURSES[2]=salva2;
    return (P.due===false&&P.tot===27)?true:"due="+P.due+" tot="+P.tot+" (attesi false e 27)";});

  /* ---------- elenco materie ---------- */
  pulisci();apri();
  t("la percentuale conta le ore messe in piano",function(){
    var id=it[0].id;
    for(var k=0;k<10;k++)placeRun(G[0],H0+k*2,{i:id,a:"LET",len:2},0);  /* 10 h */
    picklist();
    var riga=document.querySelector(".picklist .prow .ph");
    var pct=riga?riga.childNodes[0].textContent:"";
    return eq(pct,Math.round(10/targetH(items()[0].cfu)*100)+"%","percentuale ");});

  /* ---------- blocchi ---------- */
  pulisci();apri();
  t("la mezz'ora non scrive il nome dell'attività",function(){
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:1},0);render();
    var b=document.querySelector('.blk.mini');
    return b?eq(b.textContent.indexOf("Esercizi")<0,true,"il testo è: "+b.textContent):"nessun blocco mini";});
  t("la mezz'ora ha la fascia del motivo",function(){
    return eq(!!document.querySelector(".blk.mini span.tr"),true);});
  t("la fascia del motivo non è mai alta zero",function(){
    pulisci();
    ACTS.forEach(function(a,i){
      placeRun(G[0],H0+i*4,{i:it[i%6].id,a:a.k,len:(i%3)+1,n:i%2?"cap. 4 esercizi 12-30":""},0);});
    render();
    var mal=[].filter.call(document.querySelectorAll(".blk"),function(b){
      var tr=b.querySelector("span.tr");
      return tr&&tr.getBoundingClientRect().height<1;});
    if(!mal.length)return true;
    return mal.map(function(b){
      var l1=b.querySelector(".l1"),nt=b.querySelector("u.nota");
      return "["+(b.className.replace("blk","").trim()||"normale")+
        " alto "+Math.round(b.getBoundingClientRect().height)+
        " largo "+Math.round(b.getBoundingClientRect().width)+
        " riga1="+(l1?Math.round(l1.getBoundingClientRect().height):"-")+
        " nota="+(nt?Math.round(nt.getBoundingClientRect().height):"-")+
        " ROW="+ROW+" "+document.documentElement.dataset.row+"]";}).join(" ");});

  /* ---------- grafici ---------- */
  t("i grafici ci sono tutti e quattro",function(){
    state.semOpen=true;semSummary();
    return eq(document.querySelectorAll("#semBody .graf").length,4);});
  t("la tenuta non conta le settimane future",function(){
    pulisci();
    var futura=iso(addDays(new Date(),21));
    placeRun(futura,H0,{i:it[0].id,a:"LET",len:2},0);   /* mai spuntata */
    state.semOpen=true;semSummary();
    var nota=document.querySelector("#semBody .gnota").textContent;
    return nota.indexOf("Nessuna settimana ancora conclusa")>=0?true:
      "dice: "+nota;});

  /* ---------- niente trabocca ---------- */
  t("niente trabocca in orizzontale",function(){
    var b=[].filter.call(document.querySelectorAll(
      ".tin,.gridbar,.sidebar,.sec,.tool,.seg,.prow,.cfubar,.graf,.gcol,.gbar,.gmap"),
      function(e){return e.scrollWidth>e.clientWidth+1;});
    return b.length?b.length+" elementi traboccano: "+
      [].map.call(b,function(e){return e.className;}).join(", "):true;});

  /* ---------- barre appiccicate col pomodoro ---------- */
  t("col pomodoro acceso le barre in cima non si sovrappongono",function(){
    state.pomRun={act:"ESE",phase:"work",cycle:1,ends:Date.now()+9e5,paused:null,linked:[]};
    pomRender();stickyOffsets();window.scrollTo(0,400);
    var pb=document.querySelector(".pombar.on").getBoundingClientRect(),
        tb=document.querySelector(".topbar").getBoundingClientRect(),
        gb=document.querySelector(".gridbar").getBoundingClientRect();
    state.pomRun=null;pomRender();stickyOffsets();
    return (tb.top>=pb.bottom-1&&gb.top>=tb.bottom-1)?true:
      "pom "+Math.round(pb.bottom)+" topbar "+Math.round(tb.top)+" gridbar "+Math.round(gb.top);});


  /* ---------- modello dei dati ---------- */
  pulisci();apri();
  t("la nota sta sulla prima mezz'ora del blocco",function(){
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2,n:"cap. 4"},0);
    var a=at(ck(G[0],H0))[0],b=at(ck(G[0],H0+1))[0];
    return (a.n==="cap. 4"&&!b.n)?true:"prima="+a.n+" seconda="+b.n;});
  t("anyRunAt trova il blocco su qualunque corsia",function(){
    placeRun(G[0],H0+4,{i:it[1].id,a:"RIP",len:2},1);
    var r=anyRunAt(G[0],H0+4);return r?eq(r.lane,1,"corsia "):"non trovato";});
  t("due blocchi staccati restano due",function(){
    pulisci();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:1},0);
    placeRun(G[0],H0+2,{i:it[0].id,a:"ESE",len:1},0);
    return eq(runsOf(G[0]).length,2);});
  t("clearRun tocca solo la corsia che gli dici",function(){
    pulisci();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    placeRun(G[0],H0,{i:it[1].id,a:"RIP",len:2},1);
    clearRun(G[0],H0,2,0);
    return (!runAt(G[0],H0,0)&&!!runAt(G[0],H0,1))?true:
      "corsia0="+!!runAt(G[0],H0,0)+" corsia1="+!!runAt(G[0],H0,1);});
  t("le mezz'ore fuori dalla fascia vengono dichiarate",function(){
    pulisci();setDayRange(8,20);
    var d=G[0];
    state.cells[state.year+"."+state.ctx+"."+d+".44"]=[{i:it[0].id,a:"ESE"}];
    var f=outOfRange();apri();
    return f>0?true:"outOfRange ha detto "+f;});
  t("copiare un giorno non si porta dietro gli altri",function(){
    pulisci();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    placeRun(G[1],H0,{i:it[1].id,a:"RIP",len:2},0);
    var d=dayData(G[0]);
    return eq(Object.keys(d).length,2,"mezz'ore copiate ");});

  /* ---------- salvataggio ---------- */
  t("tutte le chiavi durevoli sopravvivono al giro",function(){
    pulisci();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    state.collapsed={1:1};state.pass={"c:1009070":1};state.exams=[{mid:"x",d:"2027-01-08",t:"prova"}];
    state.colors={"c:1009070":"#123456"};state.dayFrom=7;state.dayTo=23;
    var prima={};DURABLE.forEach(function(k){prima[k]=JSON.stringify(state[k]);});
    var q=JSON.parse(payload());
    state.cells={};state.exams=[];state.colors={};
    adopt(q);
    var diversi=DURABLE.filter(function(k){
      return prima[k]!==undefined&&prima[k]!==JSON.stringify(state[k]);});
    /* dayFrom/dayTo li normalizza adopt: quelli non li conto */
    diversi=diversi.filter(function(k){return k!=="dayFrom"&&k!=="dayTo";});
    apri();
    return diversi.length?"cambiate: "+diversi.join(", "):true;});
  t("il ripeti sparisce dopo una modifica nuova",function(){
    pulisci();apri();histInit();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);commit();
    undo();
    placeRun(G[0],H0+4,{i:it[1].id,a:"RIP",len:2},0);commit();
    redo();
    return eq(!!runAt(G[0],H0,0),false,"il vecchio è tornato: ");});

  /* ---------- CFU ---------- */
  t("il monte ore è venticinque ore per CFU",function(){
    return (targetH(6)===150&&targetH(9)===225&&targetH(0)===0)?true:
      "6→"+targetH(6)+" 9→"+targetH(9)+" 0→"+targetH(0);});
  t("i CFU a scelta oltre il richiesto non contano",function(){
    pulisci();apri();
    /* tre materie a scelta superate con le ore: 18 CFU, il tetto è 18 */
    var sc=items().filter(function(o){return o.kind==="c"&&!o.ob;});
    sc.forEach(function(o,idx){
      state.pass[o.id]=1;
      var serve=targetH(o.cfu)*PERQ,messe=0;
      for(var w=idx*30;w<idx*30+80&&messe<serve;w++)for(var d=0;d<7&&messe<serve;d++){
        var day=iso(addDays(parse(G[0]),w*7+d));
        for(var j=0;j<HOURS.length-1&&messe<serve;j+=2){
          placeRun(day,HOURS[j],{i:o.id,a:"LET",len:2,done:1},0);messe+=2;}}
    });
    var f=cfuFatti();
    return (f.sc===18&&f.sc<=f.piano.sce)?true:"a scelta contati "+f.sc+" su "+f.piano.sce;});
  t("le ore senza il superato non bastano",function(){
    var o=items().filter(function(x){return x.kind==="c"&&!x.ob;})[0];
    delete state.pass[o.id];
    return eq(cfuOk(o),false);});

  /* ---------- pomodoro, casi storti ---------- */
  t("in pausa il tempo non matura",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"ESE",len:4},0);
    var g=slotDiOggi("ESE");
    pomStart("ESE",[{date:g.date,start:g.start,lane:g.lane}]);
    var c=pomConf("ESE");
    state.pomRun.paused=c.s*60000;          /* messo in pausa subito */
    var a=maturato(state.pomRun),b=maturato(state.pomRun);
    state.pomRun=null;
    return (Math.round(a)===0&&a===b)?true:"maturato "+a+" e poi "+b;});
  t("saltare la sessione non spunta niente",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"ESE",len:2},0);
    var g=slotDiOggi("ESE");
    pomStart("ESE",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(false);                      /* è il tasto Salta */
    var q=runAt(oggi,ORA,0);state.pomRun=null;
    return eq(!!(q&&q.done),false,"spuntato: ");});
  t("saltare mette a registro solo il girato",function(){
    pulisci();apri();state.log={};
    placeRun(oggi,ORA,{i:it[0].id,a:"ESE",len:2},0);
    var g=slotDiOggi("ESE");
    pomStart("ESE",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(false);
    var m=0;Object.keys(state.log).forEach(function(k){
      Object.keys(state.log[k]).forEach(function(f){m+=state.log[k][f];});});
    state.pomRun=null;
    return m<=1?true:"ha registrato "+m+" minuti invece di ~0";});
  t("le lezioni non prendono il pomodoro",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:AUTOACT,len:2},0);
    pomFromCell(oggi,ORA,0);
    var partito=!!state.pomRun;state.pomRun=null;pomAskBlock(false);
    return eq(partito,false,"è partito: ");});
  t("il timer non aggancia un blocco già fatto",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"ESE",len:2,done:1},0);
    return eq(slotDiOggi("ESE"),null);});
  t("una sessione senza aggancio non spunta niente e non si rompe",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"ESE",len:2},0);
    pomStart("ESE",[]);
    pomAdvance(true);
    var q=runAt(oggi,ORA,0);state.pomRun=null;
    return eq(!!(q&&q.done),false,"spuntato: ");});
  t("i minuti si dividono fra le materie agganciate",function(){
    pulisci();apri();state.log={};
    logAdd("ESE",60,[it[0].id,it[1].id]);
    var k=state.year+"."+state.ctx+"."+iso(new Date());
    var d=state.log[k]||{};
    return (d[it[0].id+"|ESE"]===30&&d[it[1].id+"|ESE"]===30)?true:
      "ha diviso così: "+JSON.stringify(d);});
  t("riavvia riporta la fase all'inizio",function(){
    pulisci();apri();
    pomStart("ESE",[]);
    state.pomRun.ends=Date.now()+60000;     /* un minuto alla fine */
    pomRestart();
    var resta=Math.round((state.pomRun.ends-Date.now())/60000);
    state.pomRun=null;
    return eq(resta,pomConf("ESE").s,"minuti rimasti ");});
  t("il conto del giorno riparte quando cambia giorno",function(){
    state.pomLog={d:"2020-01-01",n:9,min:400,byAct:{}};
    var t2=pomToday();
    return (t2.n===0&&t2.min===0)?true:"n="+t2.n+" min="+t2.min;});

  /* ---------- grafici ---------- */
  t("senza niente in piano i grafici lo dicono",function(){
    pulisci();apri();state.semOpen=true;semSummary();
    var b=document.getElementById("semBody");
    return b.querySelector(".empty")?true:"non c'è il messaggio di vuoto";});
  t("le fasi del metodo non contano il lavoro",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"LET",len:2},0);
    placeRun(G[0],H0+4,{i:it[0].id,a:"LAV",len:2},0);
    state.semOpen=true;semSummary();
    var righe=[].map.call(document.querySelectorAll("#semBody .gbar .gr .gl"),
      function(e){return e.textContent;});
    return righe.indexOf("Lavoro")<0?true:"fra le fasi c'è: "+righe.join(", ");});
  t("la proiezione mette prima l'esame più vicino",function(){
    pulisci();apri();
    var a=items()[0],b=items()[1];
    state.over[a.id]={n:a.name,c:6,d:iso(addDays(new Date(),90))};
    state.over[b.id]={n:b.name,c:6,d:iso(addDays(new Date(),10))};
    placeRun(G[0],H0,{i:a.id,a:"LET",len:2},0);
    placeRun(G[0],H0+4,{i:b.id,a:"LET",len:2},0);
    state.semOpen=true;semSummary();
    var primo=document.querySelector("#semBody .gp .gph b");
    var atteso=(state.over[b.id]||{}).n;
    state.over={};
    return primo?eq(primo.textContent,atteso):"nessuna proiezione";});
  t("le tre fasce del giorno cadono dove devono",function(){
    return (fascia(12*PERQ+1)===0&&fascia(13*PERQ)===1&&
            fascia(18*PERQ+1)===1&&fascia(19*PERQ)===2)?true:
      "12:30→"+fascia(12*PERQ+1)+" 13:00→"+fascia(13*PERQ)+
      " 18:30→"+fascia(18*PERQ+1)+" 19:00→"+fascia(19*PERQ);});

  /* ---------- colori e leggibilità ---------- */
  var lum=function(h){
    var n=parseInt(h.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(function(v){
      v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});
    return .2126*c[0]+.7152*c[1]+.0722*c[2];};
  var contrasto=function(a,b){
    var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  t("il testo nero si legge su ogni colore di materia",function(){
    var male=items().filter(function(o){return o.kind==="c";})
      .filter(function(o){return contrasto(o.color,BLKINK)<4.5;})
      .map(function(o){return o.short+" "+contrasto(o.color,BLKINK).toFixed(1)+":1";});
    return male.length?"sotto 4,5:1 → "+male.join(", "):true;});
  t("due materie dello stesso periodo non hanno lo stesso colore",function(){
    var c=colorClashes();
    return Object.keys(c).length?"stesso colore: "+Object.keys(c).join(", "):true;});
  t("il colore di una materia non cambia da una chiamata all'altra",function(){
    var id="c:1009070";
    return eq(autoColor(id),autoColor(id));});
  t("le otto trame sono tutte diverse",function(){
    var v=ACTS.map(function(a){return ATRAMA[a.k];});
    return eq(new Set(v).size,ACTS.length,"trame distinte ");});
  t("ogni attività ha la sua trama anche nella legenda",function(){
    var senza=ACTS.filter(function(a){return !ATRAMALEG[a.k]||ATRAMALEG[a.k]==="none";});
    return senza.length?"senza trama: "+senza.map(function(a){return a.n;}).join(", "):true;});

  /* ---------- interfaccia ---------- */
  t("il motivo non finisce sotto il quadratino della spunta",function(){
    pulisci();apri();
    ACTS.forEach(function(a,i){placeRun(G[0],H0+i*4,{i:it[0].id,a:a.k,len:(i%3)+1},0);});
    render();
    var male=[].filter.call(document.querySelectorAll(".blk"),function(b){
      var tr=b.querySelector("span.tr"),tk=b.querySelector(".tick");
      if(!tr||!tk)return false;
      var A=tr.getBoundingClientRect(),B=tk.getBoundingClientRect();
      return A.right>B.left+1&&A.left<B.right-1&&A.bottom>B.top+1&&A.top<B.bottom-1;});
    return male.length?male.map(function(b){
      var A=b.querySelector("span.tr").getBoundingClientRect(),
          B=b.querySelector(".tick").getBoundingClientRect();
      return "["+(b.className.replace("blk","").trim()||"normale")+" riga "+
        document.documentElement.dataset.row+" fascia "+Math.round(A.left)+"-"+
        Math.round(A.right)+"/"+Math.round(A.top)+"-"+Math.round(A.bottom)+
        " spunta "+Math.round(B.left)+"-"+Math.round(B.right)+"/"+
        Math.round(B.top)+"-"+Math.round(B.bottom)+"]";}).join(" "):true;});
  t("ogni pulsante degli strumenti dice cosa fa",function(){
    var muti=[].filter.call(document.querySelectorAll(".tool"),function(b){
      return !b.title&&!b.getAttribute("aria-label");});
    return muti.length?muti.length+" pulsanti senza spiegazione":true;});
  t("nel tema chiaro le scritte dei blocchi restano nere",function(){
    var prima=state.theme;
    document.documentElement.setAttribute("data-theme","light");
    render();
    var b=document.querySelector(".blk");
    var col=b?getComputedStyle(b).color:"";
    document.documentElement.setAttribute("data-theme",prima||"dark");render();
    return col==="rgb(20, 22, 27)"?true:"il colore del testo è "+col;});

  document.title=(ko?"FALLITI "+ko+" su "+(ok+ko):"TUTTI OK "+ok+" controlli")+
    (T.length?" || "+T.join(" || "):"");
