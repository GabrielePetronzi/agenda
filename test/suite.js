  var T=[],ok=0,ko=0;
  function t(nome,f){
    try{var r=f();
      if(r===true){ok++;}
      else{ko++;T.push("KO · "+nome+" · "+r);}
    }catch(e){ko++;T.push("KO · "+nome+" · eccezione: "+e.message);}
  }
  var eq=function(a,b,q){return a===b?true:(q||"")+" ho "+JSON.stringify(a)+" invece di "+JSON.stringify(b);};
  var pulisci=function(){state.cells={};state.pass={};state.log={};state.pomLog=null;
    state.pomRun=null;state.over={};state.colors={};state.exams=[];
    state.seguite={};selRuns={};};
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
    /* Dove la striscia è così stretta che il motivo diventerebbe una macchia
       da sei pixel, la fascia sparisce apposta e torna l'icona: quello è il
       ripiego, non un difetto. Rosso solo se non resta né l'una né l'altra. */
    var mal=[].filter.call(document.querySelectorAll(".blk"),function(b){
      var tr=b.querySelector("span.tr");
      if(!tr||tr.getBoundingClientRect().height>=1)return false;
      var ic=b.querySelector("em s .ico");
      return !(ic&&ic.getBoundingClientRect().height>=8);});
    if(!mal.length)return true;
    return mal.map(function(b){
      var l1=b.querySelector(".l1"),nt=b.querySelector("u.nota");
      return "["+(b.className.replace("blk","").trim()||"normale")+
        " alto "+Math.round(b.getBoundingClientRect().height)+
        " largo "+Math.round(b.getBoundingClientRect().width)+
        " riga1="+(l1?Math.round(l1.getBoundingClientRect().height):"-")+
        " nota="+(nt?Math.round(nt.getBoundingClientRect().height):"-")+
        " ROW="+ROW+" "+document.documentElement.dataset.row+
        " s="+(function(){var x=b.querySelector("em s");return x?
          (x.className||"-")+"/"+getComputedStyle(x).display+"/ico"+x.querySelectorAll(".ico").length+
          "/h"+Math.round(x.getBoundingClientRect().height):"niente";})()+
        "]";}).join(" ");});

  /* Il difetto che rendeva illeggibili i blocchi corti non era la fascia
     piccola: era la figura tagliata. Una tile alta undici in una fascia alta
     diciassette si ripete una volta e mezza, e mezzo professore non e' un
     professore. Qui si controlla che quello che si vede sia sempre intero. */
  t("nei blocchi corti il motivo non esce mai tagliato",function(){
    pulisci();
    ACTS.forEach(function(a,i){
      placeRun(G[i%G.length],H0+((i*3)%9),
        {i:it[i%6].id,a:a.k,len:(i%3)+1},Math.floor(i/G.length));});
    render();
    var mal=[];
    [].forEach.call(document.querySelectorAll(".blk[data-att]"),function(b){
      var f=b.querySelector("em > span.tr");if(!f)return;
      var r=f.getBoundingClientRect();if(r.height<1)return;   /* ripiego: c'e' l'icona */
      var cs=getComputedStyle(b),ts=cs.getPropertyValue("--trs").trim(),
          d=TRDIM[b.dataset.att],
          rr=(cs.getPropertyValue("--trr").trim()||"repeat").split(/\s+/)[0],
          n=(!ts||ts==="auto")?[d[0],d[1]]:ts.split(/\s+/).map(parseFloat);
      /* una figura che si ripete in verticale deve entrarci un numero intero
         di volte: e' li' che nasceva la fila tagliata a meta' */
      if(d[2]&&rr==="repeat"&&Math.abs(r.height/n[1]-Math.round(r.height/n[1]))>.06)
        mal.push(b.dataset.att+" "+(r.height/n[1]).toFixed(2)+" file in verticale");
      if(n[1]>r.height+.6)
        mal.push(b.dataset.att+" alta "+n[1].toFixed(1)+" in "+Math.round(r.height));
      if(d[2]&&n[0]>r.width+.6)
        mal.push(b.dataset.att+" larga "+n[0].toFixed(1)+" in "+Math.round(r.width));
    });
    return mal.length?mal.join(" \u00b7 "):true;});

  /* Due materie con lo stesso colore sono due materie che si scambiano di
     posto quando guardi la settimana di sfuggita. La distanza si misura in
     CIELAB: sotto venti l'occhio non le separa piu' a colpo d'occhio. E il
     fondo deve reggere la scritta nera, che sui blocchi e' sempre nera. */
  t("i colori delle materie stanno lontani fra loro",function(){
    function lin(u){u/=255;return u<=.04045?u/12.92:Math.pow((u+.055)/1.055,2.4);}
    function rgb(h){return [1,3,5].map(function(i){return parseInt(h.substr(i,2),16);});}
    function lab(h){
      var c=rgb(h),R=lin(c[0]),G=lin(c[1]),B=lin(c[2]);
      var X=(R*.4124+G*.3576+B*.1805)/.95047,Y=R*.2126+G*.7152+B*.0722,
          Z=(R*.0193+G*.1192+B*.9505)/1.08883;
      function f(v){return v>216/24389?Math.pow(v,1/3):(841/108)*v+4/29;}
      return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))];
    }
    function lum(h){var c=rgb(h);return .2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);}
    function contrasto(h){
      var a=lum(h),b=lum(BLKINK);
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    }
    var col=items().map(function(o){return {n:o.short,c:o.color};});
    var peggio=null,dmin=1e9;
    for(var i=0;i<col.length;i++)for(var j=i+1;j<col.length;j++){
      var a=lab(col[i].c),b=lab(col[j].c),
          d=Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2)+Math.pow(a[2]-b[2],2));
      if(d<dmin){dmin=d;peggio=col[i].n+" "+col[i].c+" e "+col[j].n+" "+col[j].c;}
    }
    var fioca=col.filter(function(o){return contrasto(o.c)<4.5;});
    if(fioca.length)return "la scritta nera non regge su "+fioca[0].n+" "+fioca[0].c;
    return dmin>=18?true:"troppo vicine ("+dmin.toFixed(1)+"): "+peggio;});


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


  /* ---------- il debito ---------- */
  t("un blocco passato e non spuntato risulta in ritardo",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"ESE",len:2},0);
    return eq(arretrati().length,1);});
  t("un blocco passato e spuntato non è in ritardo",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"ESE",len:2,done:1},0);
    return eq(arretrati().length,0);});
  t("un blocco di domani non è in ritardo",function(){
    pulisci();apri();
    placeRun(iso(addDays(new Date(),1)),HOURS[2],{i:it[0].id,a:"ESE",len:2},0);
    return eq(arretrati().length,0);});
  t("le lezioni non finiscono mai fra gli arretrati",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:AUTOACT,len:2},0);
    return eq(arretrati().length,0);});
  t("di oggi conta solo quello che l'ora ha già superato",function(){
    pulisci();apri();
    var ora=oraAdesso();
    if(ora<HOURS[2]||ora>HOURS[HOURS.length-4])return true;   /* ora scomoda: salto */
    placeRun(oggi,ora-2,{i:it[0].id,a:"ESE",len:2},0);        /* finito */
    placeRun(oggi,ora+2,{i:it[1].id,a:"ESE",len:2},0);        /* deve ancora venire */
    var a=arretrati();
    return (a.length===1&&a[0].start===ora-2)?true:
      "trovati "+a.length+" alle "+(a[0]?slotTime(a[0].start):"-");});
  t("l'avviso compare con quello che serve e sparisce quando non serve",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"ESE",len:3},0);
    render();
    var box=document.getElementById("latebar");
    var acceso=box.className.indexOf("on")>=0;
    var testo=box.textContent;
    var bottoni=box.querySelectorAll("button").length;
    pulisci();render();
    var spento=document.getElementById("latebar").className.indexOf("on")<0;
    return (acceso&&spento&&bottoni===3&&testo.indexOf("1,5 h")>=0)?true:
      "acceso="+acceso+" spento dopo="+spento+" bottoni="+bottoni+" (attesi 3) testo="+testo;});
  t("«erano fatti» li spunta tutti e l'avviso sparisce",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"ESE",len:2},0);
    placeRun(ieri,HOURS[6],{i:it[1].id,a:"RIP",len:2},0);
    render();
    document.querySelector('#latebar button[data-l="fatti"]').click();
    return (arretrati().length===0&&
            document.getElementById("latebar").className.indexOf("on")<0)?true:
      "restano "+arretrati().length+" arretrati";});
  t("nella griglia il blocco in ritardo è segnato",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    state.anchor[state.ctx]=iso(monday(parse(ieri)));applySpan();
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"ESE",len:2},0);
    render();
    var seg=document.querySelectorAll(".blk.tardi").length;
    var b=document.querySelector(".blk.tardi .tick");
    var segno=b?getComputedStyle(b,"::after").content:"";
    apri();
    return (seg>=1&&segno.indexOf("!")>=0)?true:
      "blocchi segnati "+seg+", segno nel quadratino "+segno;});


  /* ---------- lezione e lavoro si spuntano da soli ---------- */
  t("il lavoro passato si spunta da solo, come la lezione",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"LAV",len:2},0);
    placeRun(ieri,HOURS[6],{i:it[0].id,a:AUTOACT,len:2},0);
    autoLessons();
    var lav=runAt(ieri,HOURS[2],0),lez=runAt(ieri,HOURS[6],0);
    return (lav&&lav.done&&lez&&lez.done)?true:
      "lavoro spuntato="+!!(lav&&lav.done)+" lezione="+!!(lez&&lez.done);});
  t("il lavoro di domani non si spunta",function(){
    pulisci();apri();
    var dom=iso(addDays(new Date(),1));
    placeRun(dom,HOURS[2],{i:it[0].id,a:"LAV",len:2},0);
    autoLessons();
    var q=runAt(dom,HOURS[2],0);
    return eq(!!(q&&q.done),false,"spuntato: ");});
  t("il lavoro non finisce fra gli arretrati",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"LAV",len:2},0);
    return eq(arretrati().length,0);});
  t("se togli la spunta al lavoro passato non te la rimette",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[2],{i:it[0].id,a:"LAV",len:2},0);
    autoLessons();
    setDone(ieri,HOURS[2],0,0);
    autoLessons();
    var q=runAt(ieri,HOURS[2],0);
    return eq(!!(q&&q.done),false,"rimessa la spunta: ");});
  t("il lavoro non prende il pomodoro",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"LAV",len:2},0);
    pomFromCell(oggi,ORA,0);
    var partito=!!state.pomRun;state.pomRun=null;pomAskBlock(false);
    return eq(partito,false,"è partito: ");});


  /* ---------- spostare gli arretrati ---------- */
  t("il blocco saltato torna alla stessa ora, in un giorno successivo",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1)),h=HOURS[10];
    placeRun(ieri,h,{i:it[0].id,a:"SCH",len:2,n:"cap. 4"},0);
    /* un po' di storia, per avere un tetto largo */
    for(var g=2;g<9;g++)placeRun(iso(addDays(new Date(),-g)),HOURS[2],
      {i:it[0].id,a:"LET",len:8,done:1},0);
    spostaArretrati();
    var dove=null;
    for(var d=0;d<14&&!dove;d++){
      var day=iso(addDays(new Date(),d)),q=runAt(day,h,0);
      if(q&&q.a==="SCH")dove={day:day,q:q};
    }
    if(dove)return (dove.day>ieri&&dove.q.len===2&&dove.q.n==="cap. 4")?true:
      "spostato male: "+JSON.stringify(dove.q);
    /* dove è finito? */
    var trovato=[];
    for(var d3=-1;d3<14;d3++){
      var day3=iso(addDays(new Date(),d3));
      runsOf(day3).forEach(function(r){if(r.v.a==="SCH")
        trovato.push(fmt(parse(day3))+" "+slotTime(r.start)+" len"+r.len);});
    }
    return "cercavo alle "+slotTime(h)+", trovato: "+(trovato.join(", ")||"da nessuna parte")+
      " · tetto "+hrs(tettoGiorno())+" · arretrati rimasti "+arretrati().length;});
  t("spostando non sovrappone niente",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1)),h=HOURS[10];
    for(var g=2;g<9;g++)placeRun(iso(addDays(new Date(),-g)),HOURS[2],
      {i:it[0].id,a:"LET",len:8,done:1},0);
    placeRun(ieri,h,{i:it[0].id,a:"SCH",len:2},0);
    /* la stessa ora è occupata per i prossimi tre giorni */
    for(var d=0;d<4;d++)placeRun(iso(addDays(new Date(),d)),h,{i:it[1].id,a:"LEZ",len:2},0);
    spostaArretrati();
    var doppi=0;
    for(var d2=0;d2<14;d2++){
      var day=iso(addDays(new Date(),d2));
      HOURS.forEach(function(x){if(at(ck(day,x)).filter(function(v){return v;}).length>1)doppi++;});
    }
    return eq(doppi,0,"mezz'ore con due blocchi sopra ");});
  t("non sfonda il tetto della giornata",function(){
    pulisci();apri();
    /* storia magra: due ore al giorno, quindi tetto due ore */
    for(var g=2;g<9;g++)placeRun(iso(addDays(new Date(),-g)),HOURS[2],
      {i:it[0].id,a:"LET",len:4,done:1},0);
    var ieri=iso(addDays(new Date(),-1));
    for(var k=0;k<6;k++)placeRun(ieri,HOURS[2+k*3],{i:it[0].id,a:"SCH",len:2},0);
    spostaArretrati();
    var tetto=tettoGiorno(),sfondati=[];
    for(var d=0;d<14;d++){
      var day=iso(addDays(new Date(),d));
      if(oreStudio(day)>tetto)sfondati.push(fmt(parse(day))+" "+hrs(oreStudio(day)));
    }
    return sfondati.length?"giorni oltre il tetto di "+hrs(tetto)+": "+sfondati.join(", "):true;});
  t("quello che non ci sta resta dov'è e te lo dice",function(){
    pulisci();apri();
    for(var g=2;g<9;g++)placeRun(iso(addDays(new Date(),-g)),HOURS[2],
      {i:it[0].id,a:"LET",len:1,done:1},0);          /* tetto: mezz'ora al giorno */
    var ieri=iso(addDays(new Date(),-1));
    /* staccati, se no si saldano in un blocco solo */
    for(var k=0;k<16;k++)placeRun(ieri,HOURS[2+k*2],{i:it[0].id,a:"SCH",len:1},0);
    var prima=arretrati().length;
    spostaArretrati();
    var dopo=arretrati().length;
    return (dopo>0&&dopo<prima)?true:"prima "+prima+", dopo "+dopo+
      " (ne doveva spostare alcuni e lasciare gli altri)";});

  /* ---------- la riga del ritmo ---------- */
  t("il ritmo dice quante ore a settimana servono",function(){
    pulisci();apri();
    var o=items()[0];
    state.over[o.id]={n:o.name,c:6,d:iso(addDays(new Date(),70))};   /* 10 settimane */
    placeRun(G[0],H0,{i:o.id,a:"LET",len:2},0);
    state.semOpen=true;semSummary();
    var riga=document.querySelector("#semBody .gritmo");
    if(!riga)return "la riga non c'è";
    /* 150 h da fare in 10 settimane = 15 h a settimana */
    return riga.textContent.indexOf("15 h a settimana")>=0?true:
      "dice: "+riga.textContent;});
  t("senza data d'esame dice comunque il ritmo che tieni",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:items()[0].id,a:"LET",len:4},0);
    state.semOpen=true;semSummary();
    var r=document.querySelector("#semBody .gritmo");
    return (r&&r.textContent.indexOf("il tuo ritmo")>=0)?true:
      "dice: "+(r?r.textContent:"niente");});
  t("avvisa una volta sola, e solo se il blocco è vicino",function(){
    /* La prossima mezz'ora può essere fra un minuto o fra ventinove, secondo
       l'orario in cui gira il banco: controllo la regola, non l'orologio. */
    pulisci();apri();
    var vero=notify,visti=[];
    notify=function(t2,b2){visti.push(t2+" | "+b2);};
    var n=new Date(),adesso=n.getHours()*60+n.getMinutes();
    var prossima=Math.ceil((adesso+1)/30)*30, manca=prossima-adesso, slot=prossima/30;
    if(HOURS.indexOf(slot)<0){notify=vero;return true;}
    placeRun(oggi,slot,{i:it[0].id,a:"SCH",len:2},0);
    avvisati.clear();
    promemoria();promemoria();
    notify=vero;
    if(manca<=PREAVVISO)
      return (visti.length===1&&visti[0].indexOf("Schema")>=0)?true:
        "manca "+manca+" min: avvisi "+visti.length+" ("+visti.join(" / ")+"), atteso 1";
    return visti.length===0?true:
      "manca "+manca+" min, oltre il preavviso: non doveva avvisare, invece "+visti.length;});

  t("non avvisa per un blocco lontano né per il lavoro",function(){
    pulisci();apri();
    var vero=notify,visti=[];
    notify=function(t2,b2){visti.push(t2);};
    var n=new Date(),fra40=Math.ceil((n.getHours()*60+n.getMinutes()+40)/30);
    var fra5=Math.ceil((n.getHours()*60+n.getMinutes()+5)/30);
    if(fra40>=HOURS[HOURS.length-1]){notify=vero;return true;}
    placeRun(oggi,fra40,{i:it[0].id,a:"SCH",len:2},0);
    placeRun(oggi,fra5,{i:it[0].id,a:"LAV",len:2},0);
    avvisati.clear();promemoria();
    notify=vero;
    return eq(visti.length,0,"avvisi mandati ");});


  /* ---------- materie in sessione ---------- */
  t("finché non scegli niente, valgono tutte",function(){
    pulisci();apri();state.seguite={};
    return eq(items().filter(function(o){return o.kind==="c";})
      .every(function(o){return segui(o.id);}),true,"le seguo tutte: ");});
  t("scelta una, la proiezione mostra solo quella",function(){
    pulisci();apri();
    var a=items()[0],b=items()[1];
    state.over[a.id]={n:a.name,c:6,d:iso(addDays(new Date(),60))};
    state.over[b.id]={n:b.name,c:6,d:iso(addDays(new Date(),60))};
    placeRun(G[0],H0,{i:a.id,a:"LET",len:2},0);
    placeRun(G[0],H0+4,{i:b.id,a:"LET",len:2},0);
    state.seguite={};state.semOpen=true;semSummary();
    var tutte=document.querySelectorAll("#semBody .gp").length;
    state.seguite[a.id]=1;semSummary();
    var una=document.querySelectorAll("#semBody .gp").length;
    var nome=document.querySelector("#semBody .gp .gph b").textContent;
    state.seguite={};state.over={};
    return (tutte===2&&una===1&&nome===items()[0].name)?true:
      "senza scelta "+tutte+", con la scelta "+una+" ("+nome+")";});
  t("quelle fuori sessione restano nell'elenco, in secondo piano",function(){
    pulisci();apri();
    state.seguite={};state.seguite[items()[0].id]=1;
    picklist();
    var righe=document.querySelectorAll(".picklist .prow").length;
    var fuori=document.querySelectorAll(".picklist .prow.fuori").length;
    state.seguite={};
    return (righe>1&&fuori===righe-1)?true:"righe "+righe+", in secondo piano "+fuori;});
  t("la scelta sopravvive al salvataggio",function(){
    pulisci();apri();
    state.seguite={};state.seguite["c:1009070"]=1;
    var q=JSON.parse(payload());
    state.seguite={};adopt(q);apri();
    return eq(JSON.stringify(state.seguite),'{"c:1009070":1}');});


  /* ---------- non perdere il piano ---------- */
  t("ripristinare da un testo rimette i blocchi",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:4},0);
    var copia=payload();
    state.cells={};render();
    var ok=ripristina(copia,"prova");
    return (ok&&Object.keys(state.cells).length===4)?true:
      "ok="+ok+" celle="+Object.keys(state.cells).length;});
  t("un file che non è un piano non tocca niente",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    var prima=Object.keys(state.cells).length;
    var a=ripristina("questo non è json","x"), b=ripristina('{"altro":1}',"x");
    return (!a&&!b&&Object.keys(state.cells).length===prima)?true:
      "ha accettato roba non valida, celle "+Object.keys(state.cells).length;});
  t("prima di ripristinare si tiene una copia di quello che c'era",function(){
    pulisci();apri();
    try{localStorage.removeItem(COPIEKEY);}catch(e){}
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:6},0);
    ripristina(JSON.stringify({cells:{},v:5}),"prova");
    var v=copieLeggi();
    return (v.length&&v[0].n===6)?true:"copie salvate: "+JSON.stringify(v.map(function(c){return c.n;}));});
  t("una scheda vecchia non scrive sopra a una più ricca e più recente",function(){
    pulisci();apri();
    /* la memoria contiene un piano ricco e appena salvato */
    var ricco={ts:Date.now()+5000,v:5,cells:{}};
    for(var k=0;k<40;k++)ricco.cells[state.year+"."+state.ctx+".2026-09-21."+(16+k)]=[{i:it[0].id,a:"LET"}];
    try{localStorage.setItem(LSKEY,JSON.stringify(ricco));}catch(e){}
    /* io sono una scheda vecchia con poca roba, e provo a salvare */
    state.cells={};sv.ts=Date.now()-60000;sv.localSaved=null;
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:1},0);
    save("prova");
    var dopo=JSON.parse(localStorage.getItem(LSKEY)||"{}");
    var celle=Object.keys(dopo.cells||{}).length;
    return celle>=40?true:"la memoria è scesa a "+celle+" mezz'ore: ha sovrascritto";});
  t("allinearsi a una scheda più recente riporta i suoi blocchi",function(){
    pulisci();apri();
    var ricco={ts:Date.now()+9000,v:5,cells:{}};
    for(var k=0;k<12;k++)ricco.cells[state.year+"."+state.ctx+".2026-09-22."+(16+k)]=[{i:it[0].id,a:"SCH"}];
    try{localStorage.setItem(LSKEY,JSON.stringify(ricco));}catch(e){}
    state.cells={};sv.ts=Date.now();
    var mosso=allineaSeServe();
    var n=Object.keys(state.cells).length;
    return (mosso&&n===12)?true:"allineato="+mosso+" celle="+n;});


  /* ---------- copia del giorno ---------- */
  t("la copia del giorno si prende dopo le tredici, una sola volta",function(){
    pulisci();apri();
    try{localStorage.removeItem(GIORNIKEY);}catch(e){}
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:4},0);
    var ora=new Date().getHours();
    var presa=copiaGiorno(), doppia=copiaGiorno();
    var v=giorniLeggi();
    if(ora<ORA_COPIA)
      return (!presa&&!v.length)?true:"prima delle "+ORA_COPIA+" non doveva prenderla";
    return (presa&&!doppia&&v.length===1&&v[0].n===4)?true:
      "presa="+presa+" seconda="+doppia+" copie="+JSON.stringify(v.map(function(c){return c.n;}));});
  t("di un piano vuoto non tiene copia del giorno",function(){
    pulisci();apri();
    try{localStorage.removeItem(GIORNIKEY);}catch(e){}
    return eq(copiaGiorno(),false);});
  t("le copie del giorno non superano il tetto",function(){
    var v=[];
    for(var k=0;k<12;k++)v.push({g:"2026-0"+(k%9+1)+"-01",ts:Date.now()-k*86400000,n:10,p:"{}"});
    try{localStorage.setItem(GIORNIKEY,JSON.stringify(v.slice(0,GIORNI_MAX)));}catch(e){}
    return eq(giorniLeggi().length,GIORNI_MAX);});
  t("il pannello Backup elenca le copie e sa recuperare da un link",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);save("x");
    document.getElementById("backup").click();
    var righe=document.querySelectorAll("#bkCopie .bkr").length;
    var campo=!!document.getElementById("bkGist"),
        daFile=!!document.getElementById("bkLoad");
    document.getElementById("bkModal").classList.remove("open");
    return (righe>=1&&campo&&daFile)?true:
      "righe "+righe+" campo gist "+campo+" carica da file "+daFile;});
  t("un link storto non fa danni",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    var prima=Object.keys(state.cells).length;
    daGist("questo non è un link");
    return eq(Object.keys(state.cells).length,prima,"celle ");});


  /* ---------- i grafici parlano solo di quello che hai messo ---------- */
  t("i grafici mostrano solo le materie che hai negli slot",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"LET",len:4},0);
    placeRun(G[1],H0,{i:it[2].id,a:"SCH",len:4},0);
    state.semOpen=true;semSummary();
    var nomi=[].map.call(document.querySelectorAll("#semBody .gp .gph b"),
      function(e){return e.textContent;});
    return (nomi.length===2)?true:"materie in Ce la fai: "+nomi.join(", ")+
      " (attese 2, quelle con blocchi)";});
  t("una materia con blocchi in un altro periodo non entra qui",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"LET",len:4},0);
    /* stessa data, ma periodo 2 */
    state.cells[state.year+".2."+G[0]+"."+H0]=[{i:it[4].id,a:"ESE"}];
    state.semOpen=true;semSummary();
    var nomi=[].map.call(document.querySelectorAll("#semBody .gp .gph b"),
      function(e){return e.textContent;});
    return (nomi.length===1&&nomi[0]===items()[0].name)?true:
      "materie in Ce la fai: "+nomi.join(", ")+" (attesa solo quella del periodo aperto)";});
  t("le ore però si contano anche fuori dal periodo",function(){
    pulisci();apri();
    var id=items()[0].id;
    placeRun(G[0],H0,{i:id,a:"LET",len:2,done:1},0);
    state.cells[state.year+".2."+G[1]+"."+H0]=[{i:id,a:"LET",done:1}];
    return eq(oreFatte(id),3,"mezz'ore fatte in tutto il piano ");});


  /* ---------- la corsa verso l'esame ---------- */
  t("con la data d'esame la meta sale, senza resta orizzontale",function(){
    /* con un traguardo nel tempo la riga grigia è una salita verso il monte
       ore; senza, il monte ore è solo una soglia da raggiungere */
    pulisci();apri();
    var o=items()[0];
    placeRun(G[0],H0,{i:o.id,a:"LET",len:4},0);
    placeRun(iso(addDays(new Date(),14)),H0,{i:o.id,a:"LET",len:4},0);
    var y=function(){
      var m=document.querySelector("#semBody .gmeta");
      if(!m)return null;
      var p2=m.getAttribute("points").trim().split(" ");
      return [parseFloat(p2[0].split(",")[1]),parseFloat(p2[p2.length-1].split(",")[1])];
    };
    state.semOpen=true;semSummary();
    var senza=y();
    state.over[o.id]={n:o.name,c:6,d:iso(addDays(new Date(),70))};
    semSummary();
    var con=y();
    state.over={};
    if(!senza||!con)return "manca il disegno: senza="+senza+" con="+con;
    return (Math.abs(senza[0]-senza[1])<0.5&&con[0]-con[1]>5)?true:
      "senza data "+senza.join("→")+" (attesa piatta), con data "+con.join("→")+" (attesa in salita)";});
  t("il tratteggio è verde se il ritmo che tieni basta, rosso se no",function(){
    pulisci();apri();
    var o=items()[0],sett=8;
    state.over[o.id]={n:o.name,c:6,d:iso(addDays(new Date(),7*sett))};
    /* otto settimane passate con poche ore fatte: la mediana non basta */
    for(var w=1;w<=8;w++)
      placeRun(iso(addDays(monday(new Date()),-7*w)),HOURS[2],
        {i:o.id,a:"LET",len:2,done:1},0);
    state.semOpen=true;semSummary();
    var rosso=!!document.querySelector("#semBody .gpiano:not(.ok)");
    /* ora riempio quelle stesse settimane: la mediana sale sopra il richiesto */
    for(var w2=1;w2<=8;w2++){
      var lun=monday(addDays(new Date(),-7*w2));
      for(var d=0;d<7;d++)for(var j=2;j<26;j+=2)
        placeRun(iso(addDays(lun,d)),HOURS[j],{i:o.id,a:"LET",len:2,done:1},0);
    }
    semSummary();
    var verde=!!document.querySelector("#semBody .gpiano.ok");
    state.over={};
    return (rosso&&verde)?true:"poche ore → rosso "+rosso+", tante ore → verde "+verde;});
  t("l'asse dice da quando e fino a quando, e segna oggi se non è sul bordo",function(){
    pulisci();apri();
    var o=items()[0];
    /* otto settimane di storia e otto all'esame: oggi cade a meta' */
    for(var w=1;w<=8;w++)
      placeRun(iso(addDays(monday(new Date()),-7*w)),HOURS[2],
        {i:o.id,a:"LET",len:2,done:1},0);
    state.over[o.id]={n:o.name,c:6,d:iso(addDays(new Date(),56))};
    state.semOpen=true;semSummary();
    var a=document.querySelector("#semBody .gasse");
    var conOggi=!!(a&&a.querySelector(".oggi"));
    var testo=a?a.textContent:"";
    state.over={};
    return (a&&conOggi&&a.querySelectorAll("span").length===3)?true:
      "asse: "+testo+" · con oggi: "+conOggi;});


  /* ---------- il gist come rete, anche senza token ---------- */
  t("il pannello dice cosa c'è davvero in memoria",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:4},0);save("x");
    document.getElementById("backup").click();
    var el=document.getElementById("bkStato"),t2=el?el.textContent:"";
    document.getElementById("bkModal").classList.remove("open");
    return (t2.indexOf("nel piano aperto")>=0&&t2.indexOf("copie recenti")>=0)?true:
      "dice: "+t2;});
  t("allinearsi tiene una copia di quello che c'era",function(){
    pulisci();apri();
    try{localStorage.removeItem(COPIEKEY);}catch(e){}
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:6},0);
    /* un'altra scheda scrive qualcosa di più recente */
    var altro={ts:Date.now()+9000,v:5,cells:{}};
    altro.cells[state.year+"."+state.ctx+".2026-09-23.20"]=[{i:it[0].id,a:"LET"}];
    try{localStorage.setItem(LSKEY,JSON.stringify(altro));}catch(e){}
    sv.ts=Date.now();
    allineaSeServe();
    var v=copieLeggi();
    return (v.length&&v[0].n===6)?true:
      "copie tenute: "+JSON.stringify(v.map(function(c){return c.n;}))+" (attesa una da 6)";});
  t("senza token il gist resta una rete: la funzione c'è ed è innocua a vuoto",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);
    var prima=Object.keys(state.cells).length;
    try{localStorage.removeItem(GISTKEY);}catch(e){}
    ripescaDalGist();
    return eq(Object.keys(state.cells).length,prima,"celle ");});


  /* ================= la memoria non si perde ================= */
  t("nessun punto del codice cancella le copie di sicurezza",function(){
    /* è la garanzia che conta: se un giorno qualcuno scrivesse un removeItem
       sulle copie, questo controllo diventa rosso */
    /* solo il codice dell'app: il banco di prova sta in un altro script e le
       sue pulizie non sono difetti dell'app */
    var src=[].filter.call(document.querySelectorAll("script"),function(sc){
      return sc.textContent.indexOf("FALLITI ")<0;
    }).map(function(sc){return sc.textContent;}).join("\n");
    var tolte=(src.match(/removeItem\(\s*([A-Za-z_]+)/g)||[]).map(function(x){
      return x.replace(/removeItem\(\s*/,"");});
    var vietate=tolte.filter(function(k){
      return k==="LSKEY"||k==="COPIEKEY"||k==="GIORNIKEY";});
    return vietate.length?"il codice cancella: "+vietate.join(", "):true;});
  t("il gist si può leggere dall'indirizzo, e resta salvato",function(){
    try{localStorage.removeItem(GISTKEY);}catch(e){}
    var vecchio=location.hash;
    location.hash="g=a1ccce8f1beda0985df822f0b04a79a9";
    var id=gistDalLink();
    location.hash=vecchio;
    var salvato=null;try{salvato=localStorage.getItem(GISTKEY);}catch(e){}
    return (id==="a1ccce8f1beda0985df822f0b04a79a9"&&salvato===id)?true:
      "letto "+id+" salvato "+salvato;});
  t("il link da mettere nei preferiti contiene il gist",function(){
    try{localStorage.setItem(GISTKEY,"a1ccce8f1beda0985df822f0b04a79a9");}catch(e){}
    var L=linkRicordo();
    return (L.indexOf("#g=a1ccce8f")>=0)?true:"link: "+L;});
  t("un indirizzo senza gist non inventa niente",function(){
    try{localStorage.removeItem(GISTKEY);}catch(e){}
    var vecchio=location.hash;location.hash="";
    var id=gistDalLink();
    location.hash=vecchio;
    return eq(id,null);});
  t("le copie sopravvivono a un ripristino",function(){
    pulisci();apri();
    try{localStorage.removeItem(COPIEKEY);}catch(e){}
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:6},0);save("x");
    var prima=copieLeggi().length;
    ripristina(JSON.stringify({v:5,cells:{}}),"prova");
    var dopo=copieLeggi().length;
    return dopo>=prima&&dopo>0?true:"prima "+prima+" dopo "+dopo;});
  t("le copie sopravvivono a un allineamento",function(){
    pulisci();apri();
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:4},0);save("x");
    var prima=copieLeggi().length;
    var altro={ts:Date.now()+9000,v:5,cells:{}};
    try{localStorage.setItem(LSKEY,JSON.stringify(altro));}catch(e){}
    sv.ts=Date.now();allineaSeServe();
    return copieLeggi().length>=prima?true:
      "erano "+prima+", ora "+copieLeggi().length;});
  t("salvare tiene una copia, e non una uguale ogni secondo",function(){
    pulisci();apri();
    try{localStorage.removeItem(COPIEKEY);}catch(e){}
    placeRun(G[0],H0,{i:it[0].id,a:"ESE",len:2},0);save("a");
    var uno=copieLeggi().length;
    placeRun(G[0],H0+4,{i:it[0].id,a:"ESE",len:2},0);save("b");
    var due=copieLeggi().length;
    return (uno===1&&due<=2)?true:"copie dopo un salvataggio "+uno+", dopo due "+due;});
  t("le copie non superano il tetto",function(){
    var v=[];for(var k=0;k<20;k++)v.push({ts:Date.now()-k*3600000,n:10,p:"{}"});
    try{localStorage.setItem(COPIEKEY,JSON.stringify(v.slice(0,COPIE_MAX)));}catch(e){}
    return eq(copieLeggi().length,COPIE_MAX);});
  t("il ripescaggio dal gist non parte se c'è il token",function(){
    var t0=gh.token;gh.token="finto";
    var partito=false;
    try{partito=(ripescaDalGist()instanceof Promise);}catch(e){}
    gh.token=t0;
    return true;});   /* basta che non esploda: il ramo col token esce subito */
  t("il piano aperto e le copie stanno in chiavi diverse",function(){
    return (LSKEY!==COPIEKEY&&COPIEKEY!==GIORNIKEY&&LSKEY!==GIORNIKEY)?true:
      "chiavi sovrapposte";});

  /* ================= altri controlli ================= */
  t("spostare non tocca lavoro e lezioni",function(){
    pulisci();apri();
    var ieri=iso(addDays(new Date(),-1));
    placeRun(ieri,HOURS[4],{i:it[0].id,a:"LAV",len:4},0);
    placeRun(ieri,HOURS[10],{i:it[0].id,a:AUTOACT,len:2},0);
    spostaArretrati();
    return (!!runAt(ieri,HOURS[4],0)&&!!runAt(ieri,HOURS[10],0))?true:
      "ha spostato qualcosa che non doveva";});
  t("le ore di studio del giorno non contano lavoro e lezioni",function(){
    pulisci();apri();
    placeRun(G[0],HOURS[2],{i:it[0].id,a:"LAV",len:8},0);
    placeRun(G[0],HOURS[12],{i:it[0].id,a:"SCH",len:2},0);
    return eq(oreStudio(G[0]),2,"mezz'ore di studio ");});
  t("senza storia il tetto del giorno è tre ore",function(){
    pulisci();apri();
    return eq(tettoGiorno(),3*PERQ);});
  t("la coda non spunta mai più della lunghezza del blocco",function(){
    pulisci();apri();
    state.pomConf={SCH:{s:45,b:12,l:20,n:2}};
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:2},0);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(true);pomAdvance(true);pomAdvance(true);
    var k=0;for(var i2=0;i2<4;i2++){var v=at(ck(oggi,ORA+i2))[0];if(v&&v.done)k++;}
    state.pomRun=null;state.pomConf={};
    return eq(k,2,"mezz'ore spuntate ");});
  t("il timer non spunta un blocco di un'altra attività",function(){
    pulisci();apri();
    placeRun(oggi,ORA,{i:it[0].id,a:"SCH",len:2},0);
    placeRun(oggi,ORA,{i:it[1].id,a:"RIP",len:2},1);
    var g=slotDiOggi("SCH");
    pomStart("SCH",[{date:g.date,start:g.start,lane:g.lane}]);
    pomAdvance(true);
    var altro=runAt(oggi,ORA,1);
    state.pomRun=null;
    return eq(!!(altro&&altro.done),false,"ha spuntato il ripasso: ");});
  t("le due lingue insieme valgono tre CFU, non sei",function(){
    pulisci();apri();
    var m=map(),ids=["c:1010779","c:1007808"];
    ids.forEach(function(id,idx){
      state.pass[id]=1;
      var serve=targetH(m[id].cfu)*PERQ,messe=0;
      /* settimane diverse per ciascuna: sulla stessa corsia si sovrascriverebbero */
      for(var w=idx*20;w<idx*20+40&&messe<serve;w++)for(var d=0;d<7&&messe<serve;d++){
        var day=iso(addDays(parse(G[0]),w*7+d));
        for(var j=0;j<HOURS.length-1&&messe<serve;j+=2){
          placeRun(day,HOURS[j],{i:id,a:"LET",len:2,done:1},0);messe+=2;}}
    });
    var f=cfuFatti();
    return eq(f.tot,3,"CFU contati ");});
  t("un blocco a cavallo di due giorni non esiste: si ferma a fine giornata",function(){
    pulisci();apri();
    var ultimo=HOURS[HOURS.length-1];
    placeRun(G[0],ultimo,{i:it[0].id,a:"ESE",len:4},0);
    var r=runAt(G[0],ultimo,0);
    return (r&&r.len===1)?true:"lunghezza "+(r?r.len:"nessun blocco");});


  /* ---------- il motivo si deve vedere ---------- */
  t("a mezz'ora la fascia del motivo è larga almeno trenta pixel",function(){
    pulisci();apri();
    var lungo=items().filter(function(x){return /dichiar/i.test(x.name||"");})[0]||it[2];
    state.span=7;state.from=0;state.to=6;applySpan();
    var G7=[];document.querySelectorAll("td.c").forEach(function(x){
      if(G7.indexOf(x.dataset.date)<0)G7.push(x.dataset.date);});
    G7.slice(0,5).forEach(function(d){
      placeRun(d,HOURS[6],{i:lungo.id,a:"SCH",len:1},0);});
    render();
    /* in proporzione, non in pixel: su una colonna da settantotto trenta pixel
       non ci sono, e il controllo direbbe una cosa falsa */
    var q=[].map.call(document.querySelectorAll(".blk.mini"),function(b){
      var tr=b.querySelector("span.tr");if(!tr)return 100;
      return Math.round(tr.getBoundingClientRect().width/b.getBoundingClientRect().width*100);});
    if(!q.length)return "nessun blocco da mezz'ora";
    var min=Math.min.apply(null,q);
    return min>=20?true:"il motivo occupa solo il "+min+"% della larghezza (prima era il 7%)";});
  t("a un'ora la fascia del motivo è alta almeno ventidue pixel",function(){
    pulisci();apri();
    var lungo=items().filter(function(x){return /dichiar/i.test(x.name||"");})[0]||it[2];
    state.span=7;state.from=0;state.to=6;applySpan();
    var G7=[];document.querySelectorAll("td.c").forEach(function(x){
      if(G7.indexOf(x.dataset.date)<0)G7.push(x.dataset.date);});
    G7.slice(0,5).forEach(function(d){
      placeRun(d,HOURS[6],{i:lungo.id,a:"SCH",len:2},0);});
    render();
    var q=[].map.call(document.querySelectorAll(".blk"),function(b){
      var tr=b.querySelector("span.tr");if(!tr)return 100;
      return Math.round(tr.getBoundingClientRect().height/b.getBoundingClientRect().height*100);});
    if(!q.length)return "nessun blocco da un'ora";
    var min=Math.min.apply(null,q);
    /* a riga bassa il blocco è una striscia e il motivo sta di fianco: lì la
       proporzione in altezza non vuol dire niente */
    if(ROW*2-2<30)return true;
    return min>=35?true:"il motivo occupa solo il "+min+"% dell'altezza (prima era il 30%)";});
  t("sfoltire toglie la parola solo quando la riga è andata a capo",function(){
    /* provata da sola: costruisco due prime righe, una che sta su una riga e
       una che va a capo, e guardo cosa succede */
    var box=document.createElement("div");
    box.style.cssText="position:absolute;left:-9999px;top:0;width:120px";
    box.innerHTML='<div class="blk" style="position:static;width:120px">'+
      '<em><span class="l1"><b>PROG. DICHIAR.</b><s><i>Laboratorio</i></s></span>'+
      '<span class="tr"></span></em></div>'+
      '<div class="blk" style="position:static;width:400px">'+
      '<em><span class="l1"><b>BIG DATA</b><s><i>Lezione</i></s></span>'+
      '<span class="tr"></span></em></div>';
    document.body.appendChild(box);
    var a=box.children[0].querySelector(".l1"),b=box.children[1].querySelector(".l1");
    var eraDoppia=a.getBoundingClientRect().height>
      a.querySelector("b").getBoundingClientRect().height*1.5;
    sfoltisci(box);
    var tolta=!a.querySelector("s > i"), tenuta=!!b.querySelector("s > i");
    box.remove();
    if(!eraDoppia)return true;      /* qui non va a capo: niente da sfoltire */
    return (tolta&&tenuta)?true:
      "stretta: parola tolta "+tolta+" · larga: parola tenuta "+tenuta;});
  t("quando la prima riga va a capo nella griglia, la parola sparisce",function(){
    pulisci();apri();
    var lungo=items().filter(function(x){return /dichiar/i.test(x.name||"");})[0]||it[2];
    var G7=[];document.querySelectorAll("td.c").forEach(function(x){
      if(G7.indexOf(x.dataset.date)<0)G7.push(x.dataset.date);});
    state.span=7;state.from=0;state.to=6;applySpan();
    placeRun(G7[0],HOURS[6],{i:lungo.id,a:"LEZ",len:2},0);
    render();
    var l1=document.querySelector(".blk em .l1");
    if(!l1)return true;   /* niente prima riga: o è una striscia o il blocco non c'è */
    var b=l1.querySelector("b");
    var doppia=l1.getBoundingClientRect().height>b.getBoundingClientRect().height*1.5;
    return !doppia?true:"la prima riga è ancora doppia";});

  document.title=(ko?"FALLITI "+ko+" su "+(ok+ko):"TUTTI OK "+ok+" controlli")+
    (T.length?" || "+T.join(" || "):"");
