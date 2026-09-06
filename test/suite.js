  var T=[],ok=0,ko=0;
  function t(nome,f){
    try{var r=f();
      if(r===true){ok++;}
      else{ko++;T.push("KO · "+nome+" · "+r);}
    }catch(e){ko++;T.push("KO · "+nome+" · eccezione: "+e.message);}
  }
  var eq=function(a,b,q){return a===b?true:(q||"")+" ho "+JSON.stringify(a)+" invece di "+JSON.stringify(b);};
  var pulisci=function(){state.cells={};state.pass={};state.log={};state.pomLog=null;
    state.pomRun=null;state.over={};selRuns={};};
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

  document.title=(ko?"FALLITI "+ko+" su "+(ok+ko):"TUTTI OK "+ok+" controlli")+
    (T.length?" || "+T.join(" || "):"");
