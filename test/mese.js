/* Tre mesi di uno studente a tempo pieno, weekend compresi, con l'orologio
   che avanza un minuto alla volta come nella vita.

   Otto settimane di semestre: lezioni la mattina che si spuntano da sole,
   schemi ed esercizi col pomodoro, letture e ripassi spuntati a mano un po'
   dopo l'ora, tre mattine in cui si sveglia tardi, un giorno a letto, la
   seconda settimana copiata nella terza. Poi clicca "Sessione Esami": cinque
   settimane senza lezioni, studio tutto il giorno, tre giorni di vacanza, tre
   esami con la data — due superati, uno no — e ogni sera il portatile chiuso.
   Dopo ogni minuto guarda che le regole dell'orologio reggano; alla fine fa i
   conti, CFU compresi: li porta solo l'esame superato con le ore fatte. */
(function(){
  var guai=[],out=[],avvisi=[];
  function g(m){if(guai.length<40)guai.push(m);}
  try{
    var Vero=Date, base=new Vero(); base.setHours(0,0,0,0);
    base=new Vero(base.getTime()+((8-base.getDay())%7||7)*86400000);   /* dal lunedi' prossimo */
    var off=0;
    function F(){ if(arguments.length===0) return new Vero(base.getTime()+off); return new (Function.prototype.bind.apply(Vero,[null].concat([].slice.call(arguments))))(); }
    F.now=function(){return base.getTime()+off;}; F.parse=Vero.parse; F.UTC=Vero.UTC; F.prototype=Vero.prototype; window.Date=F;
    var veroNotify=notify;notify=function(t,b){avvisi.push({m:off/60000,t:t,b:b});};
    var vt=toast;toast=function(){};
    var rng=(function(x){return function(){x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};})(4242);

    state.cells={};state.pomRun=null;state.log={};state.pomLog=null;state.pomConf=null;state.exams=[];state.pass={};
    state.dayFrom=8;state.dayTo=24;setDayRange(8,24);state.span=7;state.ctx="1";state.anchor={};applySpan();render();
    var mat=items().filter(function(o){return o.kind==="c";}),A=mat[0],B=mat[1],C=mat[2],D=mat[3];
    var SETT=13,SESSIONE=8*7,GIORNI=SETT*7,giorno=function(n){return iso(addDays(new Date(base.getTime()),n));};
    /* D: poche ore e l'esame l'ultimo giorno, superato — e' il caso "in attesa delle ore" */
    var ESAMI={};ESAMI[SESSIONE+7]=A;ESAMI[SESSIONE+18]=B;ESAMI[SESSIONE+28]=C;ESAMI[GIORNI-1]=D;
    var VACANZA={};[SESSIONE+14,SESSIONE+15,SESSIONE+16].forEach(function(n){VACANZA[n]=1;});
    var manuali={},pom={};
    function metti(d,sl,o,a,len,modo,s){placeRun(d,sl,{i:o.id,a:a,len:len},0);if(modo)s.push([sl,modo]);}
    function pianifica(n){
      var d=giorno(n),dow=(new Vero(base.getTime()+n*86400000)).getDay(),s=[];
      if(n<SESSIONE){
        if(dow>=1&&dow<=5){
          metti(d,18,(n%2?A:B),"LEZ",4,null,s);         /* 9-11 */
          metti(d,23,A,"SCH",3,"pom",s);                /* 11:30-13 */
          metti(d,30,B,"LET",3,"mano",s);               /* 15-16:30 */
          metti(d,34,A,"ESE",3,"pom",s);                /* 17-18:30 */
          metti(d,42,C,"RIP",1,"mano",s);               /* 21-21:30 */
        }else if(dow===6){metti(d,20,A,"SCH",4,"pom",s);metti(d,30,B,"ESE",4,"mano",s);}
        else{metti(d,20,C,"RIP",4,"pom",s);metti(d,32,B,"LET",2,"mano",s);}
      }else if(!VACANZA[n]){
        var esame=ESAMI[n];
        /* in sessione: chi ha l'esame piu' vicino prende la mattina */
        var prossimo=[SESSIONE+7,SESSIONE+18,SESSIONE+28].filter(function(x){return x>n;})[0];
        var mira=prossimo===SESSIONE+7?A:(prossimo===SESSIONE+18?B:C);
        if(!esame){metti(d,18,mira,"SCH",4,"pom",s);metti(d,23,mira,"ESE",3,"pom",s);}
        metti(d,30,(mira===A?B:(mira===B?C:A)),"LET",4,"mano",s);   /* 15-17 */
        metti(d,35,C,"RIP",3,"pom",s);                              /* 17:30-19 */
        if(dow<=5&&!esame)metti(d,42,mira,"RIP",1,"mano",s);        /* 21-21:30 */
        if(dow===0)metti(d,40,D,"LET",2,"mano",s);                  /* la domenica un'ora per D */
      }
      manuali[d]=s.filter(function(x){return x[1]==="mano";}).map(function(x){return x[0];});
      pom[d]=s.filter(function(x){return x[1]==="pom";}).map(function(x){return x[0];});
    }
    for(var n=0;n<14;n++)pianifica(n);
    var tardi={2:1,9:1,17:1,60:1},malato={10:1};
    setDataEsame(A.id,giorno(SESSIONE+7),"09:00");setDataEsame(B.id,giorno(SESSIONE+18),"09:00");setDataEsame(C.id,giorno(SESSIONE+28),"14:00");setDataEsame(D.id,giorno(GIORNI-1),"10:00");
    render();
    var ultimoGiorno=-1,spostati=0,ticcati={},semestreCelle=0;
    var st=function(d,sl){var v=at(ck(d,sl))[0];return !!(v&&v.done);};
    for(var min=0;min<=GIORNI*1440+60;min++){
      off=min*60000;var t=new Date(),h=t.getHours(),mm=t.getMinutes();
      /* il giorno lo dice il calendario, non il conto dei minuti: a fine
         ottobre c'e' il cambio dell'ora e un giorno dura venticinque ore */
      var d=iso(t),n=Math.round((new Vero(d+"T00:00:00")-base)/86400000);
      if(n!==ultimoGiorno){
        ultimoGiorno=n;
        if(n===14){copyWeek(0);pasteWeek(2);
          for(var k=14;k<21;k++){manuali[giorno(k)]=manuali[giorno(k-14)];pom[giorno(k)]=pom[giorno(k-14)];}
          for(var k2=14;k2<21;k2++)runsOf(giorno(k2)).forEach(function(r){if(r.v.done)setDoneQuiet(giorno(k2),r.start,r.lane,false);});}
        if(n===21)for(var k3=21;k3<SESSIONE;k3++)pianifica(k3);
        if(n===SESSIONE){
          /* clicca "Sessione Esami": periodo nuovo, le mezz'ore del semestre restano dove sono */
          semestreCelle=Object.keys(state.cells).length;
          state.ctx="S";state.brush=null;state.anchor={};state.anchor.S=giorno(SESSIONE);applySpan();render();
          for(var k4=SESSIONE;k4<GIORNI;k4++)pianifica(k4);
          if(Object.keys(state.cells).length<=semestreCelle)g("entrando in sessione le mezz'ore del semestre sono sparite");
        }
        ticcati[d]={};render();
      }
      if(!malato[n]&&!VACANZA[n]){
        (pom[d]||[]).forEach(function(sl){
          var inizio=sl*30+(tardi[n]&&sl<26?50:0);
          if(h*60+mm===inizio&&!state.pomRun){var r0=runAt(d,sl,0);if(!r0||r0.done)return;var s=slotDiOggi(r0.a);if(s&&s.start===sl)pomStart(r0.a,[{date:d,start:sl,lane:0}]);}
        });
        (manuali[d]||[]).forEach(function(sl){
          var r=runAt(d,sl,0);if(!r||r.done||ticcati[d][sl])return;
          var fine=(sl+r.len)*30+Math.floor(rng()*40);
          if(h*60+mm>=fine){setDone(d,sl,0,true);ticcati[d][sl]=1;}
        });
      }
      if(h===20&&mm===0&&(tardi[n]||malato[n-1])){var prima=arretrati().length;spostaArretrati();spostati+=prima-arretrati().length;}
      if(ESAMI[n]&&h===12&&mm===0&&ESAMI[n]!==C){state.pass[ESAMI[n].id]=1;save();}   /* C va male */
      if(h===23&&mm===30){var p=payload();var cellePrima=JSON.stringify(state.cells);adopt(JSON.parse(p));applySpan();render();
        if(JSON.stringify(state.cells)!==cellePrima)g(d+" ricaricando la sera il piano cambia");
        if(state.pomRun&&Date.now()>=state.pomRun.ends)pomAdvance(true);}
      if(h===22&&mm===0){state.semOpen=true;semSummary();
        var tx=document.getElementById("semBody")?document.getElementById("semBody").innerText:"";
        if(/NaN|undefined|Infinity/.test(tx))g(d+" nei grafici si legge NaN/undefined");}
      nowLine();autoLessons();promemoria();copiaGiorno();
      var r=state.pomRun;if(r&&!r.paused){if(Date.now()>=r.ends)pomAdvance(true);else spuntaMaturato(r);}
      if(mm%5===0)runsOf(d).forEach(function(x){
        var fine=(x.start+x.len)*30,adesso=h*60+mm;
        if(daSola(x.v.a)){
          if(x.v.done&&adesso<fine)g(d+" "+slotTime(x.start)+" "+x.v.a+" spuntato da solo prima della fine");
          if(!x.v.done&&adesso>fine+1&&!x.v.nd)g(d+" "+slotTime(x.start)+" "+x.v.a+" non spuntato da solo dopo la fine");
          if(inRitardo(d,x))g(d+" "+x.v.a+" segnato in ritardo, ma si spunta da solo");
        }else{
          var late=inRitardo(d,x);
          if(late&&adesso<fine)g(d+" "+slotTime(x.start)+" in ritardo prima della fine");
          if(!x.v.done&&!late&&adesso>fine+1)g(d+" "+slotTime(x.start)+" non fatto dopo la fine ma non in ritardo");
        }
      });
      if(h===0&&mm===0&&n>0){var pt=pomToday();if(pt.min)g(d+" a mezzanotte i minuti di oggi non sono ripartiti da zero");}
    }
    var perBlocco={};
    avvisi.filter(function(a){return /^Fra /.test(a.t);}).forEach(function(a){var k=Math.floor(a.m/1440)+"|"+a.b;perBlocco[k]=(perBlocco[k]||0)+1;
      if(/Lavoro|NASPI/.test(a.t+a.b))g("promemoria per lavoro o NASPI: "+a.t+" "+a.b);
      if(/Fra 1 minuti/.test(a.t))g("promemoria all'ultimo minuto (blocco gia' cominciato?): "+a.t+" "+a.b);});
    Object.keys(perBlocco).forEach(function(k){if(perBlocco[k]>1)g("promemoria doppio: "+k);});
    /* ---- i conti ---- */
    var piano=0,fatte=0,ritardo=0,lezioni=0,lezFatte=0;
    ["1","S"].forEach(function(cx){state.ctx=cx;
      for(var q=0;q<GIORNI;q++)runsOf(giorno(q)).forEach(function(x){piano+=x.len;if(x.v.done)fatte+=x.len;
        if(daSola(x.v.a)){lezioni+=x.len;if(x.v.done)lezFatte+=x.len;}else if(inRitardo(giorno(q),x))ritardo+=x.len;});});
    state.ctx="S";
    var reg=0;Object.keys(state.log).forEach(function(k){Object.keys(state.log[k]).forEach(function(z){reg+=state.log[k][z];});});
    var cfu=cfuFatti(),oreA=oreFatte(A.id)/PERQ,oreB=oreFatte(B.id)/PERQ,oreC=oreFatte(C.id)/PERQ,oreD=oreFatte(D.id)/PERQ,tg=targetH(A.cfu);
    ["1","S"].forEach(function(cx){state.ctx=cx;for(var q2=0;q2<GIORNI+14;q2++){var ore=0;runsOf(giorno(q2)).forEach(function(x){ore+=x.len;});if(ore>16*PERQ)g(giorno(q2)+" ha "+hrs(ore)+" in un giorno");}});
    state.ctx="S";
    out.push("tre mesi: "+hrs(piano)+" in piano, "+hrs(fatte)+" fatte ("+Math.round(fatte/piano*100)+"%), "+hrs(ritardo)+" rimaste in ritardo, "+hrs(lezFatte)+"/"+hrs(lezioni)+" di lezioni spuntate da sole");
    out.push("timer: "+Math.round(reg/60)+" ore a registro · promemoria "+avvisi.filter(function(a){return /^Fra /.test(a.t);}).length+" · recuperati con Sposta avanti "+spostati);
    out.push(A.short+": "+Math.round(oreA)+" h su "+tg+" richieste, esame superato → "+(cfuOk(A)?A.cfu+" CFU":"niente")+
      " · "+B.short+": "+Math.round(oreB)+" h, superato → "+(cfuOk(B)?B.cfu+" CFU":"in attesa delle ore")+
      " · "+C.short+": "+Math.round(oreC)+" h, non superato → "+(cfuOk(C)?"CFU?!":"niente"));
    out.push(D.short+": "+Math.round(oreD)+" h su "+targetH(D.cfu)+", superato → "+(cfuOk(D)?"CFU?!":"in attesa delle ore"));
    out.push("CFU conseguiti: "+(cfu.ob+cfu.sc)+" · in attesa: "+cfu.attesa);
    if(lezFatte!==lezioni)g("non tutte le lezioni si sono spuntate da sole");
    if(oreA<tg)g(A.short+" doveva arrivare alle ore richieste ("+Math.round(oreA)+"/"+tg+")");
    if(!cfuOk(A))g("esame superato con le ore fatte, ma niente CFU");
    if(oreB<tg&&cfuOk(B))g("CFU dati a "+B.short+" senza le ore");
    if(oreB>=tg&&!cfuOk(B))g(B.short+" ha le ore e l'esame ma niente CFU");
    if(cfuOk(C))g("CFU dati a un esame non superato");
    if(cfuOk(D))g("CFU dati a "+D.short+" con "+Math.round(oreD)+" ore su "+targetH(D.cfu));
    var attesi=(cfuOk(A)?A.cfu:0)+(cfuOk(B)?B.cfu:0);
    if(cfu.ob+cfu.sc!==attesi)g("CFU conseguiti "+(cfu.ob+cfu.sc)+" invece di "+attesi);
    if(cfu.attesa!==1)g("in attesa "+cfu.attesa+" invece di 1 ("+D.short+")");
    /* tornando al semestre le sue mezz'ore ci sono ancora */
    state.ctx="1";var semDopo=0;for(var q3=0;q3<SESSIONE;q3++)runsOf(giorno(q3)).forEach(function(x){semDopo+=x.len;});
    if(!semDopo)g("tornando al semestre le sue mezz'ore non ci sono piu'");
    state.ctx="S";
    notify=veroNotify;toast=vt;
  }catch(e){g("ESPLOSO "+e.message+" "+(e.stack||"").split("\n")[1]);}
  var esito=guai.length?("GUAI "+guai.length):"TRE MESI PULITI";
  document.title=esito;
  var pre=document.createElement("pre");pre.id="MIS";pre.textContent=esito+"\n"+out.join("\n")+"\n"+guai.join("\n");document.body.appendChild(pre);
})();
