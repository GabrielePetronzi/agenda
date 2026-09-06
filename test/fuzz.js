/* Cinquanta studenti diversi, ognuno con le sue abitudini e le sue distrazioni.
   Ogni giro parte da un piano vuoto, tira un seme e fa quaranta gesti a caso
   presi da quelli veri: dipingere, spostare, spuntare, cancellare, copiare,
   annullare, cambiare le ore mostrate, far girare il pomodoro. Dopo ogni gesto
   controlla che il piano regga: niente mezz'ore orfane, niente piu' di tre
   blocchi per mezz'ora, niente scadenze agganciate a materie sparite, niente
   numeri rotti, e il salvataggio che rilegge quello che ha scritto.

   Il seme si stampa insieme al difetto, quindi un giro andato male si rifa'
   identico. Non usa i gesti finti del mouse apposta: quelli hanno bisogno dei
   tempi veri (vedi studente.js) e qui servono duemila gesti, non venti. */
(function(){
  var GIRI=+((location.hash.match(/giri=(\d+)/)||[])[1]||50), GESTI=40;
  var problemi=[],fatti=0;

  function rng(seme){                 /* stesso seme, stessa storia */
    var x=seme*1103515245+12345;
    return function(){x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};
  }
  var it=items().filter(function(o){return o.kind!=="g";});
  var ACT=["LEZ","LET","SCH","ESE","LAB","PRO","RIP","LAV"];
  function giorni(){
    var g=[];document.querySelectorAll("td.c").forEach(function(x){
      if(g.indexOf(x.dataset.date)<0)g.push(x.dataset.date);});
    return g;
  }
  function pulito(){
    state.cells={};state.exams=[];state.over={};state.custom=[];state.pass={};
    state.colors={};state.clip=null;state.pomRun=null;state.pomLog=null;
    state.log={};state.brush=null;state.erase=false;state.affianca=false;
    selRuns={};setDayRange(8,24);
    state.anchor[state.ctx]=iso(monday(new Date()));
    state.span=7;applySpan();render();histInit();commit();
  }
  function mezzore(){
    var k=0;Object.keys(state.cells).forEach(function(x){
      (state.cells[x]||[]).forEach(function(v){if(v)k++;});});
    return k;
  }
  /* ---- quello che deve valere sempre, comunque tu abbia usato l'app ---- */
  function controlla(dove){
    var m=map(),errori=[];
    Object.keys(state.cells).forEach(function(k){
      var arr=state.cells[k]||[];
      if(arr.filter(Boolean).length>MAXLANE)
        errori.push("piu' di "+MAXLANE+" blocchi in "+k);
      var sl=+k.split(".")[3];
      if(!(sl>=0&&sl<=47))errori.push("mezz'ora allo slot "+sl);
      arr.forEach(function(v){
        if(!v)return;
        if(!m[v.i])errori.push("mezz'ora orfana ("+v.i+") in "+k);
        if(ACT.indexOf(v.a)<0)errori.push("attivita' sconosciuta \""+v.a+"\" in "+k);
      });
    });
    (state.exams||[]).forEach(function(x){
      if(x.mid&&!m[x.mid])errori.push("scadenza agganciata alla materia sparita "+x.mid);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(x.d||""))errori.push("scadenza con data \""+x.d+"\"");
    });
    Object.keys(state.pass||{}).forEach(function(id){
      if(!m[id])errori.push("superata una materia che non esiste: "+id);});
    /* una materia, una data d'esame */
    var visti={};
    (state.exams||[]).forEach(function(x){
      if(!x.mid)return;
      if(visti[x.mid])errori.push("due date d'esame per la stessa materia ("+x.mid+")");
      visti[x.mid]=1;});
    /* le celle svuotate non devono restare in giro a gonfiare il salvataggio */
    var vuote=0;
    Object.keys(state.cells).forEach(function(k){
      if(!(state.cells[k]||[]).filter(Boolean).length)vuote++;});
    if(vuote>200)errori.push(vuote+" celle vuote rimaste nel salvataggio");
    var c=cfuFatti(),P=pianoCfu();
    if(c.ob+c.sc>P.tot+.001)errori.push("CFU "+(c.ob+c.sc)+" oltre il piano "+P.tot);
    if(c.ob<0||c.sc<0||isNaN(c.ob)||isNaN(c.sc))errori.push("CFU rotti");
    /* salvare e rileggere non cambia niente */
    var p=payload(),q;
    try{q=JSON.parse(p);}catch(e){errori.push("il salvataggio non e' leggibile");}
    if(q){
      var n=0;Object.keys(q.cells||{}).forEach(function(k){
        (q.cells[k]||[]).forEach(function(v){if(v)n++;});});
      if(n!==mezzore())errori.push("il salvataggio ha "+n+" mezz'ore invece di "+mezzore());
    }
    /* il disegno deve dire quello che dice la memoria */
    var viste={};
    document.querySelectorAll("td.c[data-date]").forEach(function(td){
      viste[td.dataset.date]=1;});
    Object.keys(viste).forEach(function(d){
      var quanti=runsOf(d).length;
      var dis=document.querySelectorAll('.blk[data-date="'+d+'"]').length;
      if(dis!==quanti)errori.push(d+": "+quanti+" blocchi in memoria, "+dis+" disegnati");
    });
    /* Fuori dalla fascia mostrata i blocchi possono starci — stringere le ore
       non cancella niente — ma l'app lo deve dire: se ce ne sono e nessuno li
       conta, quelle ore sono sparite senza che nessuno se ne accorga. */
    var primo=HOURS[0],ultimo=HOURS[HOURS.length-1],fuori=0;
    Object.keys(state.cells).forEach(function(k){
      var sl=+k.split(".")[3];
      if((state.cells[k]||[]).filter(Boolean).length&&(sl<primo||sl>ultimo))fuori++;
    });
    if(fuori){
      if(!outOfRange())errori.push(fuori+" mezz'ore fuori dalla fascia e nessuno le conta");
      dayNote();
      var nota=document.getElementById("dayNote");
      if(nota&&nota.textContent.indexOf("Fuori da qui")<0)
        errori.push("il pannello del giorno non avverte delle ore fuori fascia");
    }
    if(errori.length)problemi.push("seme "+dove+": "+errori.join(" · "));
    return !errori.length;
  }
  function domPulito(dove){
    var t=document.body.innerText||"";
    ["NaN","undefined","Infinity","[object Object]"].forEach(function(b){
      if(t.indexOf(b)>=0)problemi.push("seme "+dove+": a schermo si legge \""+b+"\"");});
    document.querySelectorAll("#semBody svg path").forEach(function(e){
      if(/NaN|Infinity/.test(e.getAttribute("d")||""))
        problemi.push("seme "+dove+": un grafico ha un tratto rotto");});
  }

  /* ---- il repertorio: quello che uno fa davvero ---- */
  var GESTO=[
    ["dipingo un blocco",function(r,g){
      var d=g[Math.floor(r()*g.length)],st=HOURS[Math.floor(r()*HOURS.length)];
      var len=1+Math.floor(r()*6);
      placeRun(d,st,{i:it[Math.floor(r()*it.length)].id,
        a:ACT[Math.floor(r()*ACT.length)],len:len},null);
      save();drawDay(d);}],
    ["sposto un blocco",function(r,g){
      var tutti=[];g.forEach(function(d){runsOf(d).forEach(function(x){
        tutti.push({d:d,r:x});});});
      if(!tutti.length)return;
      var s=tutti[Math.floor(r()*tutti.length)];
      var dd=g[Math.floor(r()*g.length)],ns=HOURS[Math.floor(r()*(HOURS.length-s.r.len))];
      var eraFatto=!!s.r.v.done,nota=s.r.v.n||"",lun=s.r.len;
      clearRun(s.d,s.r.start,s.r.len,s.r.lane);
      var L=corsiaPerArrivo(dd,ns,s.r.len,s.r.lane);
      var fd,fs,fl;
      if(L<0){placeRun(s.d,s.r.start,s.r.v,s.r.lane);fd=s.d;fs=s.r.start;fl=s.r.lane;}
      else{placeRun(dd,ns,s.r.v,L);fd=dd;fs=ns;fl=L;}
      save();drawDay(s.d);drawDay(dd);
      var dopo=runAt(fd,fs,fl);
      if(dopo){
        if(eraFatto&&!dopo.done)
          problemi.push("spostando, un blocco spuntato e' tornato da fare");
        if(nota&&fs>=HOURS[0]&&(dopo.n||"")!==nota)
          problemi.push("spostando, la nota e' cambiata: \""+nota+"\" -> \""+(dopo.n||"")+"\"");
        if(fs+lun-1<=HOURS[HOURS.length-1]&&dopo.len!==lun)
          problemi.push("spostando, la durata e' passata da "+lun+" a "+dopo.len);
      }}],
    ["allungo o accorcio un blocco",function(r,g){
      var d=g[Math.floor(r()*g.length)],rs=runsOf(d);
      if(!rs.length)return;
      var x=rs[Math.floor(r()*rs.length)];
      var nl=1+Math.floor(r()*8);
      nl=Math.min(nl,HOURS[HOURS.length-1]-x.start+1);
      clearRun(d,x.start,x.len,x.lane);
      placeRun(d,x.start,{i:x.v.i,a:x.v.a,n:x.v.n,len:nl},x.lane);
      save();drawDay(d);}],
    ["cancello un tratto",function(r,g){
      var d=g[Math.floor(r()*g.length)],rs=runsOf(d);
      if(!rs.length)return;
      var x=rs[Math.floor(r()*rs.length)];
      clearRun(d,x.start,x.len,x.lane);save();drawDay(d);}],
    ["spunto un blocco",function(r,g){
      var d=g[Math.floor(r()*g.length)],rs=runsOf(d);
      if(!rs.length)return;
      var x=rs[Math.floor(r()*rs.length)];
      setDone(d,x.start,x.lane,r()<.7);save();drawDay(d);}],
    ["scrivo una nota",function(r,g){
      var d=g[Math.floor(r()*g.length)],rs=runsOf(d);
      if(!rs.length)return;
      var x=rs[Math.floor(r()*rs.length)];
      var testi=["cap. 4","es. 12-30 \"difficili\"","ripasso 🙂","<b>prova</b>",
        new Array(30).join("nota lunga "),"perché & però"];
      clearRun(d,x.start,x.len,x.lane);
      placeRun(d,x.start,{i:x.v.i,a:x.v.a,len:x.len,
        n:testi[Math.floor(r()*testi.length)]},x.lane);
      save();drawDay(d);}],
    ["annullo",function(){
      commit();
      var prima=JSON.stringify(state.cells);
      /* un gesto qualunque, poi annulla: si deve tornare identici */
      var g=giorni(),d=g[0];
      placeRun(d,HOURS[2],{i:it[0].id,a:"LEZ",len:2},null);commit();
      undo();render();
      if(JSON.stringify(state.cells)!==prima)
        problemi.push("annulla non riporta il piano com'era");}],
    ["ripeto",function(){redo();render();}],
    ["copio una settimana",function(r){copyWeek(Math.floor(r()*3));}],
    ["incollo una settimana",function(r){
      if(state.clip&&typeof pasteWeek==="function"){pasteWeek(Math.floor(r()*3));render();}}],
    ["svuoto una settimana",function(r){
      if(typeof wipeWeek==="function"){wipeWeek(Math.floor(r()*3));render();}}],
    ["aggiungo una materia mia",function(r){
      normCustom();
      var id="x:"+Math.floor(r()*1e9).toString(36);
      state.custom.push({id:id,name:"Voce "+id.slice(2,6),cfu:Math.floor(r()*13)});
      if(r()<.5)setDataEsame(id,"2027-0"+(1+Math.floor(r()*9))+"-1"+Math.floor(r()*9),"");
      save();render();}],
    ["cancello una materia mia",function(r){
      var v=voci();
      if(!v.length)return;
      delVoce(v[Math.floor(r()*v.length)].id);save();render();}],
    ["metto o tolgo una data d'esame",function(r){
      var o=it[Math.floor(r()*it.length)];
      if(r()<.3)setDataEsame(o.id,"","");
      else setDataEsame(o.id,"202"+(6+Math.floor(r()*2))+"-0"+(1+Math.floor(r()*9))+
        "-"+(10+Math.floor(r()*18)),r()<.5?"09:30":"");
      save();render();}],
    ["segno un esame superato",function(r){
      var o=it[Math.floor(r()*it.length)];
      if(r()<.4)delete state.pass[o.id];else state.pass[o.id]=1;
      save();cfuBar();picklist();}],
    ["cambio le ore mostrate",function(r){
      /* come fa il pannello del giorno: prima si stringe il valore, poi si
         scrive nello stato E nelle variabili. Chiamare solo setDayRange
         lascia il salvataggio con la fascia vecchia, e al ricaricamento i
         blocchi finiscono fuori vista — ci sono cascato, ed e' colpa del
         simulatore, non dell'app. */
      var t=Math.min(24,Math.max(DAY_MIN,8+Math.floor(r()*17)));
      var f=Math.min(t-DAY_MIN,Math.floor(r()*10));
      state.dayFrom=f;state.dayTo=t;setDayRange(f,t);
      applySpan();render();
      if(autoRow())redrawGrid();}],
    ["cambio settimana",function(r){
      state.anchor[state.ctx]=iso(addDays(parse(state.anchor[state.ctx]),
        (r()<.5?7:-7)*(1+Math.floor(r()*3))));
      applySpan();render();}],
    ["cambio vista giorno/settimana",function(r){
      state.span=[1,3,7][Math.floor(r()*3)];applySpan();render();}],
    ["faccio girare il pomodoro",function(r){
      var a=ACT[Math.floor(r()*ACT.length)];
      var g=slotDiOggi(a);
      pomStart(a,g?[{date:g.date,start:g.start,lane:g.lane}]:null);
      var quante=1+Math.floor(r()*4);
      for(var i=0;i<quante;i++)pomAdvance(true);
      if(r()<.6)pomStop();}],
    ["guardo i grafici",function(){state.semOpen=true;semSummary();}],
    ["salvo e ricarico",function(){
      /* il giro completo deve restituire tutto: note, spunte, durate */
      var prima=JSON.stringify(state.cells);
      var p=payload();adopt(JSON.parse(p));applySpan();render();
      if(JSON.stringify(state.cells)!==prima)
        problemi.push("salvando e ricaricando il piano cambia");}],
    ["cerco nel piano",function(r){
      var q=["intel","reti","zzz",""][Math.floor(r()*4)];
      state.q=q;picklist();state.q="";picklist();}],
    ["cambio colore a una materia",function(r){
      var o=it[Math.floor(r()*it.length)];
      if(r()<.3)delete state.colors[o.id];
      else state.colors[o.id]="#"+Math.floor(r()*0xffffff).toString(16).padStart(6,"0");
      save();render();}],
    ["scelgo e cancello dei blocchi",function(r,g){
      var d=g[Math.floor(r()*g.length)],rs=runsOf(d);
      if(!rs.length)return;
      rs.forEach(function(x){if(r()<.5)toggleSel(d,x.start,x.lane);});
      if(r()<.5&&typeof deleteSel==="function")deleteSel();
      clearSel();render();}],
    ["lascio che l'app metta le lezioni da sola",function(){
      if(typeof autoLessons==="function")autoLessons();}],
    ["recupero gli arretrati",function(){
      if(typeof spostaArretrati==="function")spostaArretrati();render();}]
  ];

  /* La casualita' da sola non basta: spuntare un blocco e poi spostare
     proprio quello capita di rado, e un difetto che si vede solo li' passa
     inosservato per duemila gesti. Questa prova invece si fa sempre, a fine
     giro, e segue un blocco solo attraverso tutti i passaggi in cui potrebbe
     perdere qualcosa per strada. */
  function fedelta(seme){
    /* si mette in condizioni note: il giro precedente puo' aver lasciato la
       vista a un giorno solo e la fascia stretta a due ore, e quello che si
       vuole provare qui non e' la finestra ma se il piano si porta dietro
       tutto quando lo si sposta, lo si allunga, lo si salva e lo si incolla */
    state.dayFrom=8;state.dayTo=24;setDayRange(8,24);
    state.span=7;state.anchor[state.ctx]=iso(monday(new Date()));
    applySpan();render();
    var g=giorni(),d=g[0],st=HOURS[4],nota="cap. 7 \"il lemma\" — perché";
    if(g.length<4||st==null)return problemi.push("seme "+seme+" fedelta': non riesco a preparare la prova");
    state.cells={};
    placeRun(d,st,{i:it[0].id,a:"SCH",len:4,n:nota},0);
    setDone(d,st,0,true);
    var r=runAt(d,st,0);
    if(!r||!r.done)return problemi.push("seme "+seme+" fedelta': la spunta non si mette");
    if(r.n!==nota)return problemi.push("seme "+seme+" fedelta': la nota non si scrive");
    /* 1. spostarlo in un altro giorno */
    clearRun(d,st,4,0);
    var L=corsiaPerArrivo(g[3],st+2,4,0);
    placeRun(g[3],st+2,r,L);
    var b=runAt(g[3],st+2,L);
    if(!b)return problemi.push("seme "+seme+" fedelta': spostandolo e' sparito");
    if(!b.done)problemi.push("seme "+seme+" fedelta': spostandolo si e' perso lo spuntato");
    if(b.n!==nota)problemi.push("seme "+seme+" fedelta': spostandolo si e' persa la nota");
    if(b.len!==4)problemi.push("seme "+seme+" fedelta': spostandolo la durata e' "+b.len);
    /* 2. allungarlo */
    clearRun(g[3],st+2,b.len,L);
    placeRun(g[3],st+2,{i:b.i,a:b.a,n:b.n,done:b.done,len:6},L);
    var c=runAt(g[3],st+2,L);
    if(c&&!c.done)problemi.push("seme "+seme+" fedelta': allungandolo si e' perso lo spuntato");
    if(c&&c.n!==nota)problemi.push("seme "+seme+" fedelta': allungandolo si e' persa la nota");
    /* 3. salvare, svuotare, ricaricare */
    var p=payload();
    state.cells={};
    adopt(JSON.parse(p));
    var e=runAt(g[3],st+2,L);
    if(!e)return problemi.push("seme "+seme+" fedelta': ricaricando e' sparito");
    if(!e.done)problemi.push("seme "+seme+" fedelta': ricaricando si e' perso lo spuntato");
    if(e.n!==nota)problemi.push("seme "+seme+" fedelta': ricaricando la nota e' \""+e.n+"\"");
    if(e.len!==(c?c.len:6))problemi.push("seme "+seme+" fedelta': ricaricando la durata e' "+e.len);
    /* 4. copiare e incollare la settimana */
    copyWeek(0);
    if(typeof pasteWeek==="function"){
      pasteWeek(1);
      var dd=iso(addDays(parse(g[3]),7)),f=runAt(dd,st+2,L);
      if(f){
        if(!f.done)problemi.push("seme "+seme+" fedelta': incollandolo si e' perso lo spuntato");
        if(f.n!==nota)problemi.push("seme "+seme+" fedelta': incollandolo si e' persa la nota");
      }
    }
  }

  var log=[];
  for(var s=1;s<=GIRI;s++){
    var r=rng(s*7919);
    try{pulito();}catch(e){problemi.push("seme "+s+": non riparte pulito: "+e.message);continue;}
    var storia=[];
    for(var k=0;k<GESTI;k++){
      var gi=Math.floor(r()*GESTO.length),nome=GESTO[gi][0];
      storia.push(nome);
      try{GESTO[gi][1](r,giorni());}
      catch(e){
        problemi.push("seme "+s+" gesto "+(k+1)+" ("+nome+"): ESPLOSO — "+e.message);
        break;
      }
      fatti++;
      if(!controlla(s+" gesto "+(k+1)+" ("+nome+")")){
        problemi.push("   la storia era: "+storia.join(" > "));
        break;
      }
      if(k%10===9)domPulito(s+" gesto "+(k+1));
    }
    try{fedelta(s);}catch(e){problemi.push("seme "+s+": la prova di fedelta' e' esplosa: "+e.message);}
  }
  var esito=problemi.length?("PROBLEMI "+problemi.length+" su "+fatti+" gesti")
                           :("PULITO "+fatti+" gesti in "+GIRI+" giri");
  document.title=esito;
  var pre=document.createElement("pre");pre.id="MIS";
  pre.textContent=esito+"\n"+problemi.slice(0,40).join("\n");
  document.body.appendChild(pre);
})();
