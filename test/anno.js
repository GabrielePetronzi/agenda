/* Un anno accademico di uno studente a tempo pieno, con l'orologio che
   avanza un minuto alla volta. Quattordici settimane di primo semestre, due
   di vacanze di Natale, sei di sessione invernale con tre esami, quattordici
   di secondo semestre con Pasqua in mezzo, sei di sessione estiva con altri
   tre esami (le due lingue tutt'e due superate: valgono una volta sola), otto
   settimane di lavoro estivo e due di NASPI, e l'ultimo giorno il passaggio
   al secondo anno. In mezzo i due cambi dell'ora. Ogni sera il portatile
   chiuso. Alla fine: CFU, memoria del browser, tempo dei grafici. */
(function(){
  var guai=[],out=[],avvisi=[];
  function g(m){if(guai.length<40)guai.push(m);}
  try{
    var Vero=Date, base=new Vero(); base.setHours(0,0,0,0);
    base=new Vero(base.getTime()+((8-base.getDay())%7||7)*86400000);
    var off=0;
    function F(){ if(arguments.length===0) return new Vero(base.getTime()+off); return new (Function.prototype.bind.apply(Vero,[null].concat([].slice.call(arguments))))(); }
    F.now=function(){return base.getTime()+off;}; F.parse=Vero.parse; F.UTC=Vero.UTC; F.prototype=Vero.prototype; window.Date=F;
    var veroNotify=notify;notify=function(t,b){avvisi.push({m:off/60000,t:t,b:b});};
    var vt=toast;toast=function(){};
    var rng=(function(x){return function(){x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};})(777);
    try{localStorage.clear();}catch(e){}

    state.cells={};state.pomRun=null;state.log={};state.pomLog=null;state.pomConf=null;state.exams=[];state.pass={};
    state.year=1;state.ctx="1";state.dayFrom=8;state.dayTo=24;setDayRange(8,24);state.span=7;state.anchor={};applySpan();render();
    var s1=allCourses().filter(function(o){return o.year===1&&o.sem===1;}),s2=allCourses().filter(function(o){return o.year===1&&o.sem===2;});
    var A=s1[0],B=s1[1],C=s1[2],A2=s2[0],B2=s2[1],C2=s2[2];
    var lingue=allCourses().filter(function(o){return o.alt==="lin";});
    var GIORNI=364,giorno=function(n){return iso(addDays(new Date(base.getTime()),n));};
    /* le fasi, per settimana */
    function fase(w){
      if(w<14)return "sem1";if(w<16)return "natale";if(w<22)return "sess1";
      if(w<36)return (w===29?"pasqua":"sem2");if(w<42)return "sess2";if(w<50)return "lavoro";return "naspi";}
    function ctxDi(f){return f==="sem1"||f==="natale"?"1":(f==="sess1"||f==="sess2"?"S":"2");}
    var ESAMI={};ESAMI[16*7+3]=A;ESAMI[18*7+3]=B;ESAMI[20*7+3]=C;ESAMI[36*7+3]=A2;ESAMI[38*7+3]=B2;ESAMI[40*7+3]=lingue[0];ESAMI[40*7+4]=lingue[1];
    var NONSUPERATI={};NONSUPERATI[C.id]=1;
    var manuali={},pom={};
    function metti(d,sl,o,a,len,modo,s){placeRun(d,sl,{i:o.id,a:a,len:len},0);if(modo)s.push([sl,modo]);}
    function pianifica(n){
      var d=giorno(n),w=Math.floor(n/7),f=fase(w),dow=(new Vero(base.getTime()+n*86400000)).getDay(),s=[];
      var esame=ESAMI[n];
      if(f==="sem1"||f==="sem2"){
        var X=f==="sem1"?A:A2,Y=f==="sem1"?B:B2,Z=f==="sem1"?C:C2;
        if(dow>=1&&dow<=5){metti(d,18,(n%2?X:Y),"LEZ",4,null,s);metti(d,23,X,"SCH",3,"pom",s);metti(d,30,Y,"LET",3,"mano",s);metti(d,34,X,"ESE",3,"pom",s);metti(d,42,Z,"RIP",1,"mano",s);}
        else if(dow===6){metti(d,20,X,"SCH",4,"pom",s);metti(d,30,Y,"ESE",4,"mano",s);}
        else{metti(d,20,Z,"RIP",4,"pom",s);metti(d,32,Y,"LET",2,"mano",s);}
      }else if(f==="sess1"||f==="sess2"){
        var lista=f==="sess1"?[A,B,C]:[A2,B2,lingue[0]];
        var giorniEs=Object.keys(ESAMI).map(Number).filter(function(x){return x>n;}).sort(function(a,b){return a-b;});
        var mira=giorniEs.length?ESAMI[giorniEs[0]]:lista[0];
        if(!esame){metti(d,18,mira,"SCH",4,"pom",s);metti(d,23,mira,"ESE",3,"pom",s);}
        metti(d,30,lista[(lista.indexOf(mira)+1)%lista.length],"LET",4,"mano",s);
        metti(d,35,lista[(lista.indexOf(mira)+2)%lista.length],"RIP",3,"pom",s);
        if(f==="sess2"&&dow===0)metti(d,40,lingue[1],"LET",2,"mano",s);
      }else if(f==="lavoro"){
        if(dow>=1&&dow<=5)metti(d,18,{id:WORKID},"LAV",16,null,s);
        if(dow===6)metti(d,20,A2,"RIP",2,"mano",s);
      }else if(f==="naspi"){
        if(dow>=1&&dow<=5)metti(d,18,{id:NASPIID},"NAS",8,null,s);
      }
      manuali[d]=s.filter(function(x){return x[1]==="mano";}).map(function(x){return x[0];});
      pom[d]=s.filter(function(x){return x[1]==="pom";}).map(function(x){return x[0];});
    }
    var tardi={2:1,9:1,17:1,60:1,170:1,200:1},malato={10:1,180:1};
    Object.keys(ESAMI).forEach(function(n){setDataEsame(ESAMI[n].id,giorno(+n),"09:00");});
    var ultimoGiorno=-1,ctxCorrente="1",spostati=0,ticcati={},celleFase={};
    var pianificate={},min=0,partenza=Vero.now(),tempi=[];
    function fetta(){
     var fino=min+1440;
     for(;min<fino;min++){
      off=min*60000;var t=new Date(),h=t.getHours(),mm=t.getMinutes();
      var d=iso(t),n=Math.round((new Vero(d+"T00:00:00")-base)/86400000);
      if(n>=GIORNI)break;
      if(n!==ultimoGiorno){
        ultimoGiorno=n;var w=Math.floor(n/7),f=fase(w),cx=ctxDi(f);
        if(cx!==ctxCorrente){
          celleFase[ctxCorrente]=Object.keys(state.cells).length;
          state.ctx=cx;state.brush=null;state.anchor={};state.anchor[cx]=giorno(n);applySpan();render();ctxCorrente=cx;
          if(Object.keys(state.cells).length!==celleFase[ctxCorrente===cx?cx:cx]&&Object.keys(state.cells).length<celleFase[Object.keys(celleFase)[0]])g(d+" cambiando periodo sono sparite delle mezz'ore");
        }
        /* la settimana si pianifica il lunedi' (o il primo giorno della fase) */
        if(!pianificate[w]){pianificate[w]=1;for(var k=w*7;k<w*7+7&&k<GIORNI;k++)pianifica(k);}
        ticcati[d]={};render();
      }
      var fOggi=fase(Math.floor(n/7));
      if(!malato[n]){
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
      if(ESAMI[n]&&h===12&&mm===0&&!NONSUPERATI[ESAMI[n].id]){state.pass[ESAMI[n].id]=1;save();}
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
        }else{
          var late=inRitardo(d,x);
          /* un blocco agganciato al timer non e' in ritardo: lo stai facendo */
          var sotto=state.pomRun&&(state.pomRun.linked||[]).some(function(b2){
            return b2.date===d&&b2.lane===x.lane&&b2.start>=x.start&&b2.start<x.start+x.len;});
          if(late&&adesso<fine)g(d+" "+slotTime(x.start)+" in ritardo prima della fine");
          if(!x.v.done&&!late&&!sotto&&adesso>fine+1)g(d+" "+slotTime(x.start)+" non fatto dopo la fine ma non in ritardo");
        }
      });
      if(h===0&&mm===0&&n>0){var pt=pomToday();if(pt.min)g(d+" a mezzanotte i minuti di oggi non sono ripartiti da zero");}
     }
     var gg=Math.floor(min/1440);
     document.title="giorno "+gg+" · "+Math.round((Vero.now()-partenza)/1000)+"s";
     if(gg%30===0)tempi.push(gg+":"+Math.round((Vero.now()-partenza)/1000)+"s");
     if(min<=GIORNI*1440+60&&gg<GIORNI){setTimeout(fetta,0);return;}
     out.push("tempo di calcolo per giorno simulato: "+tempi.join(" "));
     fine();
    }
    function fine(){try{
    avvisi.filter(function(a){return /^Fra /.test(a.t);}).forEach(function(a){
      if(/Lavoro|NASPI/.test(a.t+a.b))g("promemoria per lavoro o NASPI: "+a.t+" "+a.b);
      if(/Fra 1 minuti/.test(a.t))g("promemoria all'ultimo minuto: "+a.t+" "+a.b);});
    /* ---- i conti dell'anno ---- */
    var piano=0,fatte=0,ritardo=0,auto=0,autoFatte=0;
    ["1","S","2"].forEach(function(cx){state.ctx=cx;for(var q=0;q<GIORNI;q++)runsOf(giorno(q)).forEach(function(x){piano+=x.len;if(x.v.done)fatte+=x.len;
      if(daSola(x.v.a)){auto+=x.len;if(x.v.done)autoFatte+=x.len;}else if(inRitardo(giorno(q),x))ritardo+=x.len;});});
    state.ctx="2";
    var reg=0;Object.keys(state.log).forEach(function(k){Object.keys(state.log[k]).forEach(function(z){reg+=state.log[k][z];});});
    var cfu=cfuFatti();
    var attesi=[A,B,A2,B2].reduce(function(a,o){return a+o.cfu;},0)+lingue[0].cfu;   /* C non superato; le lingue una volta */
    out.push("anno: "+hrs(piano)+" in piano, "+hrs(fatte)+" fatte ("+Math.round(fatte/piano*100)+"%), "+hrs(ritardo)+" rimaste in ritardo, "+hrs(autoFatte)+"/"+hrs(auto)+" di lezioni/lavoro/NASPI spuntate da sole");
    out.push("timer: "+Math.round(reg/60)+" ore a registro · promemoria "+avvisi.filter(function(a){return /^Fra /.test(a.t);}).length+" · recuperati con Sposta avanti "+spostati);
    out.push("esami superati: "+cfu.n+" · CFU "+(cfu.ob+cfu.sc)+" (attesi "+attesi+": "+[A,B,A2,B2].map(function(o){return o.short;}).join(", ")+" e le due lingue una volta sola)");
    if(cfu.ob+cfu.sc!==attesi)g("CFU "+(cfu.ob+cfu.sc)+" invece di "+attesi);
    if(autoFatte!==auto)g("non tutto quello che si spunta da solo si e' spuntato: "+hrs(autoFatte)+"/"+hrs(auto));
    var pctA=Math.round(oreFatte(A.id)/PERQ/targetH(A.cfu)*100);
    out.push(A.short+": "+Math.round(oreFatte(A.id)/PERQ)+" h su "+targetH(A.cfu)+" → "+pctA+"%");
    /* memoria del browser e grafici */
    var byte=0;try{for(var i=0;i<localStorage.length;i++){var kk=localStorage.key(i);byte+=(localStorage.getItem(kk)||"").length+kk.length;}}catch(e){}
    out.push("memoria del browser a fine anno: "+(byte/1024/1024).toFixed(2)+" MB (copie recenti "+copieLeggi().length+", del giorno "+giorniLeggi().length+") · celle salvate "+Object.keys(state.cells).length);
    if(byte>3*1024*1024)g("la memoria del browser e' a "+(byte/1024/1024).toFixed(1)+" MB: il limite e' 5");
    if(copieLeggi().length>8||giorniLeggi().length>7)g("le copie automatiche crescono: "+copieLeggi().length+" e "+giorniLeggi().length);
    var t0=Vero.now();state.semOpen=true;semSummary();var dt=Vero.now()-t0;
    out.push("grafici con un anno dentro: "+dt+" ms");
    if(dt>1500)g("i grafici ci mettono "+dt+" ms");
    /* il passaggio al secondo anno */
    var celleAnno1=Object.keys(state.cells).length,passPrima=Object.keys(state.pass).length;
    state.year=2;state.ctx="1";state.brush=null;state.anchor={};applySpan();render();picklist();
    var vuoto=0;for(var q2=0;q2<GIORNI;q2++)vuoto+=runsOf(giorno(q2)).length;
    var cfu2=cfuFatti();
    var materie2=courses().every(function(o){return o.year===undefined||true;});
    if(vuoto)g("al secondo anno la griglia mostra "+vuoto+" blocchi del primo");
    if(Object.keys(state.cells).length!==celleAnno1)g("passando al secondo anno le mezz'ore del primo sono cambiate");
    if(cfu2.ob+cfu2.sc!==cfu.ob+cfu.sc)g("al secondo anno i CFU sono cambiati: "+(cfu2.ob+cfu2.sc));
    if(!document.querySelector("#picklist .prow"))g("al secondo anno l'elenco delle materie e' vuoto");
    out.push("secondo anno: griglia vuota, "+celleAnno1+" mezz'ore del primo anno conservate, CFU "+(cfu2.ob+cfu2.sc)+", "+document.querySelectorAll("#picklist .prow").length+" materie in elenco");
    state.year=1;
    notify=veroNotify;toast=vt;
    }catch(e){g("ESPLOSO nei conti: "+e.message+" "+(e.stack||"").split("\n")[1]);}
    chiudi();
    }
    fetta();
  }catch(e){g("ESPLOSO "+e.message+" "+(e.stack||"").split("\n")[1]);chiudi();}
  function chiudi(){
    var esito=guai.length?("GUAI "+guai.length):"ANNO PULITO";
    document.title=esito;
    var pre=document.createElement("pre");pre.id="MIS";pre.textContent=esito+"\n"+out.join("\n")+"\n"+guai.join("\n");document.body.appendChild(pre);
  }
})();
