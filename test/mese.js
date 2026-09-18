/* Un mese di uno studente a tempo pieno, weekend compresi, con l'orologio
   che avanza un minuto alla volta come nella vita: lezioni la mattina che si
   spuntano da sole, schemi ed esercizi col pomodoro, letture e ripassi
   spuntati a mano un po' dopo l'ora, tre mattine in cui si sveglia tardi, un
   giorno di malattia, la seconda settimana copiata nella terza, un esame con
   la data e il "superato", e ogni sera il portatile chiuso (salva e ricarica).
   Dopo ogni minuto guarda che le regole dell'orologio reggano; a fine mese
   fa i conti. Si inietta come test/fuzz.js e si legge il titolo. */
(function(){
  var guai=[],out=[],avvisi=[];
  function g(m){if(guai.length<40)guai.push(m);}
  try{
    var Vero=Date, base=new Vero(); base.setHours(0,0,0,0);
    /* parte dal lunedi' prossimo, cosi' le settimane sono intere */
    base=new Vero(base.getTime()+((8-base.getDay())%7||7)*86400000);
    var off=0;
    function F(){ if(arguments.length===0) return new Vero(base.getTime()+off); return new (Function.prototype.bind.apply(Vero,[null].concat([].slice.call(arguments))))(); }
    F.now=function(){return base.getTime()+off;}; F.parse=Vero.parse; F.UTC=Vero.UTC; F.prototype=Vero.prototype; window.Date=F;
    var veroNotify=notify;notify=function(t,b){avvisi.push({m:off/60000,t:t,b:b});};
    var vt=toast;toast=function(){};
    var rng=(function(x){return function(){x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};})(4242);

    state.cells={};state.pomRun=null;state.log={};state.pomLog=null;state.pomConf=null;state.exams=[];state.pass={};
    state.dayFrom=8;state.dayTo=24;setDayRange(8,24);state.span=7;state.anchor={};applySpan();render();
    var mat=items().filter(function(o){return o.kind==="c";}),A=mat[0],B=mat[1],C=mat[2];
    var GIORNI=28,giorno=function(n){return iso(addDays(new Date(base.getTime()),n));};
    var manuali={},pom={};   /* per giorno: blocchi che spunto a mano / che affido al pomodoro */
    /* la settimana tipo */
    function pianifica(n){
      var d=giorno(n),dow=(new Vero(base.getTime()+n*86400000)).getDay();
      var s=[];
      if(dow>=1&&dow<=5){
        placeRun(d,18,{i:(n%2?A:B).id,a:"LEZ",len:4},0);            /* 9-11 */
        placeRun(d,23,{i:A.id,a:"SCH",len:3},0);s.push([23,"pom"]);   /* 11:30-13 */
        placeRun(d,30,{i:B.id,a:"LET",len:3},0);s.push([30,"mano"]);  /* 15-16:30 */
        placeRun(d,34,{i:A.id,a:"ESE",len:3},0);s.push([34,"pom"]);   /* 17-18:30 */
        placeRun(d,42,{i:C.id,a:"RIP",len:1},0);s.push([42,"mano"]);  /* 21-21:30 */
      }else if(dow===6){
        placeRun(d,20,{i:A.id,a:"SCH",len:4},0);s.push([20,"pom"]);   /* 10-12 */
        placeRun(d,30,{i:B.id,a:"ESE",len:4},0);s.push([30,"mano"]);  /* 15-17 */
      }else{
        placeRun(d,20,{i:C.id,a:"RIP",len:4},0);s.push([20,"pom"]);   /* 10-12 */
        placeRun(d,32,{i:B.id,a:"LET",len:2},0);s.push([32,"mano"]);  /* 16-17 */
      }
      manuali[d]=s.filter(function(x){return x[1]==="mano";}).map(function(x){return x[0];});
      pom[d]=s.filter(function(x){return x[1]==="pom";}).map(function(x){return x[0];});
    }
    for(var n=0;n<14;n++)pianifica(n);            /* le prime due settimane a mano */
    var tardi={2:1,9:1,17:1},malato={10:1};      /* mattine perse, un giorno a letto */
    setDataEsame(A.id,giorno(25),"09:00");
    render();
    var ultimoGiorno=-1,ritardiVisti=0,spostati=0,ticcati={},giornoPromemoria={};
    var st=function(d,sl){var v=at(ck(d,sl))[0];return !!(v&&v.done);};
    for(var min=0;min<=GIORNI*1440;min++){
      off=min*60000;var t=new Date(),h=t.getHours(),mm=t.getMinutes(),n=Math.floor(min/1440),d=giorno(n);
      if(n!==ultimoGiorno){
        ultimoGiorno=n;
        if(n===14){copyWeek(0);pasteWeek(2);              /* terza settimana: copia della prima */
          for(var k=14;k<21;k++){manuali[giorno(k)]=manuali[giorno(k-14)];pom[giorno(k)]=pom[giorno(k-14)];}
          /* l'incolla riporta anche le spunte: le tolgo, e' una settimana nuova */
          for(var k2=14;k2<21;k2++)runsOf(giorno(k2)).forEach(function(r){if(r.v.done)setDoneQuiet(giorno(k2),r.start,r.lane,false);});}
        if(n===21)for(var k3=21;k3<28;k3++)pianifica(k3);
        ticcati[d]={};render();
      }
      /* ---- i gesti della giornata ---- */
      if(!malato[n]){
        (pom[d]||[]).forEach(function(sl){
          var inizio=sl*30+(tardi[n]&&sl<26?50:0);          /* se ho dormito, parto 50 minuti dopo */
          if(h*60+mm===inizio&&!state.pomRun){var s=slotDiOggi(runAt(d,sl,0).a);if(s&&s.start===sl)pomStart(runAt(d,sl,0).a,[{date:d,start:sl,lane:0}]);}
        });
        (manuali[d]||[]).forEach(function(sl){
          var r=runAt(d,sl,0);if(!r||r.done||ticcati[d][sl])return;
          var fine=(sl+r.len)*30+Math.floor(rng()*40);          /* spunto fra 0 e 40 minuti dopo la fine */
          if(h*60+mm>=fine){setDone(d,sl,0,true);ticcati[d][sl]=1;}
        });
      }
      if(h===20&&mm===0&&(tardi[n]||malato[n-1])){var prima=arretrati().length;spostaArretrati();spostati+=prima-arretrati().length;}
      if(n===25&&h===12&&mm===0){state.pass[A.id]=1;save();}
      if(h===23&&mm===30){var p=payload();var cellePrima=JSON.stringify(state.cells);adopt(JSON.parse(p));applySpan();render();
        if(JSON.stringify(state.cells)!==cellePrima)g(d+" ricaricando la sera il piano cambia");
        if(state.pomRun&&Date.now()>=state.pomRun.ends)pomAdvance(true);}
      if(h===22&&mm===0){state.semOpen=true;semSummary();
        var tx=document.getElementById("semBody")?document.getElementById("semBody").innerText:"";
        if(/NaN|undefined|Infinity/.test(tx))g(d+" nei grafici si legge NaN/undefined");}
      /* ---- quello che l'app fa da sola ogni minuto ---- */
      nowLine();autoLessons();promemoria();copiaGiorno();
      var r=state.pomRun;if(r&&!r.paused){if(Date.now()>=r.ends)pomAdvance(true);else spuntaMaturato(r);}
      /* ---- le regole dell'orologio, ogni minuto ---- */
      if(mm%5===0)runsOf(d).forEach(function(x){
        var fine=(x.start+x.len)*30,adesso=h*60+mm,ora=x.start*30;
        if(daSola(x.v.a)){
          if(x.v.done&&adesso<fine)g(d+" "+slotTime(x.start)+" "+x.v.a+" spuntato da solo prima della fine");
          if(!x.v.done&&adesso>fine+1&&!x.v.nd)g(d+" "+slotTime(x.start)+" "+x.v.a+" non spuntato da solo dopo la fine");
          if(inRitardo(d,x))g(d+" "+x.v.a+" segnato in ritardo, ma si spunta da solo");
        }else{
          var late=inRitardo(d,x);
          if(late&&adesso<fine)g(d+" "+slotTime(x.start)+" in ritardo prima della fine");
          if(!x.v.done&&!late&&adesso>fine+1)g(d+" "+slotTime(x.start)+" non fatto dopo la fine ma non in ritardo");
          if(late)ritardiVisti++;
        }
      });
      if(h===0&&mm===0&&n>0){var pt=pomToday();if(pt.min)g(d+" a mezzanotte i minuti di oggi non sono ripartiti da zero");}
    }
    /* ---- i promemoria: uno per blocco non automatico, dieci minuti prima, mai per lezione/lavoro ---- */
    var perBlocco={};
    /* solo i promemoria "fra N minuti": gli avvisi del pomodoro si ripetono a ogni sessione, ed e' giusto */
    avvisi.filter(function(a){return /^Fra /.test(a.t);}).forEach(function(a){var k=Math.floor(a.m/1440)+"|"+a.b;perBlocco[k]=(perBlocco[k]||0)+1;
      if(/Lavoro|NASPI/.test(a.t+a.b))g("promemoria per lavoro o NASPI: "+a.t+" "+a.b);
      if(/Fra 1 minuti/.test(a.t)&&/–/.test(a.b))g("promemoria all'ultimo minuto (blocco gia' cominciato?): "+a.t+" "+a.b);});
    Object.keys(perBlocco).forEach(function(k){if(perBlocco[k]>1)g("promemoria doppio: "+k);});
    /* ---- i conti di fine mese ---- */
    var piano=0,fatte=0,ritardo=0,lezioni=0,lezFatte=0;
    for(var q=0;q<GIORNI;q++)runsOf(giorno(q)).forEach(function(x){piano+=x.len;if(x.v.done)fatte+=x.len;
      if(daSola(x.v.a)){lezioni+=x.len;if(x.v.done)lezFatte+=x.len;}else if(inRitardo(giorno(q),x))ritardo+=x.len;});
    var reg=0;Object.keys(state.log).forEach(function(k){Object.keys(state.log[k]).forEach(function(z){reg+=state.log[k][z];});});
    var cfu=cfuFatti();
    for(var q2=0;q2<GIORNI+14;q2++){var ore=0;runsOf(giorno(q2)).forEach(function(x){ore+=x.len;});if(ore>16*PERQ)g(giorno(q2)+" ha "+hrs(ore)+" in un giorno");}
    out.push("mese: "+hrs(piano)+" in piano, "+hrs(fatte)+" fatte ("+Math.round(fatte/piano*100)+"%), "+hrs(ritardo)+" rimaste in ritardo, "+
      hrs(lezFatte)+" su "+hrs(lezioni)+" di lezioni/lavoro spuntate da sole");
    out.push("timer: "+Math.round(reg)+" minuti a registro · promemoria mandati "+avvisi.length+" · blocchi recuperati con Sposta avanti "+spostati);
    out.push("esame di "+A.short+" il "+giorno(25)+": superato, CFU conseguiti "+(cfu.ob+cfu.sc)+(cfu.attesa?" ("+cfu.attesa+" in attesa delle ore)":""));
    if(lezFatte!==lezioni)g("non tutte le lezioni/lavoro si sono spuntate da sole: "+hrs(lezFatte)+"/"+hrs(lezioni));
    if(reg<20*60)g("il pomodoro ha registrato solo "+Math.round(reg)+" minuti in un mese");
    notify=veroNotify;toast=vt;
  }catch(e){g("ESPLOSO "+e.message+" "+(e.stack||"").split("\n")[1]);}
  var esito=guai.length?("GUAI "+guai.length):"MESE PULITO";
  document.title=esito;
  var pre=document.createElement("pre");pre.id="MIS";pre.textContent=esito+"\n"+out.join("\n")+"\n"+guai.join("\n");document.body.appendChild(pre);
})();
