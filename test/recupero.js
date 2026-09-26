/* Il pomeriggio di recupero, provato come lo vivi tu.

   La mattina salta: il blocco di Big data resta non fatto e l'ora passa. Alle
   tre del pomeriggio scegli l'attivita', premi il vero pulsante Avvia e lasci
   andare il timer sessione dopo sessione, pause comprese, senza toccare altro.
   L'orologio avanza un minuto per ogni secondo, e a far girare il pomodoro e'
   il suo vero giro di ogni secondo (pomLoop), non una copia: quello che vedi
   qui e' quello che fa l'app sul tuo portatile.

   A ogni fine sessione stampa lo stato dei blocchi (■ fatto, □ da fare), e a
   sera controlla che il mattino sia spuntato. */
(function(){
  var Vero=Date,base=new Vero();base.setHours(0,0,0,0);
  var off=0;
  function F(){if(arguments.length===0)return new Vero(base.getTime()+off);
    return new (Function.prototype.bind.apply(Vero,[null].concat([].slice.call(arguments))))();}
  F.now=function(){return base.getTime()+off;};F.parse=Vero.parse;F.UTC=Vero.UTC;F.prototype=Vero.prototype;
  window.Date=F;
  var detto=[];
  toast=function(m){detto.push(m);};
  notify=function(){};
  var out=[],guai=[];
  var oggi=iso(new Date());
  var mat=items().filter(function(o){return o.kind==="c";});
  var BD=mat.filter(function(o){return /big data/i.test(o.n||o.name||"");})[0]||mat[0];
  var hh=function(sl){return slotTime(sl);};

  function stato(bl){
    return bl.map(function(b){
      var s="";for(var i=0;i<b.len;i++){var v=at(ck(oggi,b.sl+i))[0];s+=(v&&v.done)?"■":"□";}
      return hh(b.sl)+" "+b.nome+" "+s;}).join("   ");
  }
  function tutti(bl){return bl.every(function(b){
    for(var i=0;i<b.len;i++){var v=at(ck(oggi,b.sl+i))[0];if(!v||!v.done)return false;}return true;});}

  var SCENARI=[
    {t:"A · Big data, schema 9–11 saltato. Alle 15 avvio Schema",act:"SCH",
      bl:[{sl:18,len:4,a:"SCH",nome:"mattina"}],mira:[0]},
    {t:"B · Big data, due blocchi di schema saltati (9–10:30 e 11–12:30). Alle 15 avvio Schema",act:"SCH",
      bl:[{sl:18,len:3,a:"SCH",nome:"primo"},{sl:22,len:3,a:"SCH",nome:"secondo"}],mira:[0,1]},
    {t:"C · schema 9–11 saltato, e in piano c'e' anche lo schema delle 17–18:30. Alle 15 avvio Schema",act:"SCH",
      bl:[{sl:18,len:4,a:"SCH",nome:"mattina"},{sl:34,len:3,a:"SCH",nome:"pomeriggio"}],mira:[0,1]},
    {t:"D · lettura 9–11 saltata (sessioni da 27'). Alle 15 avvio Lettura",act:"LET",
      bl:[{sl:18,len:4,a:"LET",nome:"mattina"}],mira:[0]},
    {t:"E · videolezione 9–10 saltata e videolezione 11–12 saltata. Alle 15 avvio Videolezione",act:"VID",
      bl:[{sl:18,len:2,a:"VID",nome:"prima"},{sl:22,len:2,a:"VID",nome:"seconda"}],mira:[0,1]}
  ];

  var k=-1,sc=null,fase=null,sess=0,FINE=21*60;
  function prossimo(){
    k++;
    if(k>=SCENARI.length){chiudi();return;}
    sc=SCENARI[k];
    if(state.pomRun)pomStop(true);
    state.cells={};state.log={};state.pomLog=null;state.pomConf={};
    setDayRange(8,24);state.anchor[state.ctx]=iso(monday(new Date()));applySpan();
    off=15*60*60000;                       /* le tre del pomeriggio */
    sc.bl.forEach(function(b){placeRun(oggi,b.sl,{i:BD.id,a:b.a,len:b.len},0);});
    render();
    out.push("");out.push(sc.t);
    out.push("  15:00 prima di avviare   "+stato(sc.bl));
    /* il gesto vero: scegli l'attivita' e premi Avvia */
    state.act=sc.act;pomPanel();
    var go=document.querySelector("#pomtools .pomgo");
    if(!go){guai.push(sc.t+": non trovo il pulsante Avvia");prossimo();return;}
    detto=[];go.click();
    var bar=document.getElementById("pombar").textContent;
    var riga=(bar.match(/(spunta [^·]*|nessun blocco agganciato)/)||["?"])[0];
    out.push("  15:00 premo Avvia        la barra dice: \""+riga.trim()+"\"");
    fase="work";sess=1;
    setTimeout(passo,500);
  }
  function passo(){
    off+=60000;
    setTimeout(guarda,1000);               /* un secondo: il giro vero del timer passa */
  }
  function guarda(){
    var r=state.pomRun,ora=Math.round(off/60000);
    var hm=String(Math.floor(ora/60)).padStart(2,"0")+":"+String(ora%60).padStart(2,"0");
    if(r&&fase==="work"&&r.phase!=="work"){
      out.push("  "+hm+" fine sessione "+sess+"   "+stato(sc.bl));
    }
    if(r&&fase!=="work"&&r.phase==="work")sess++;
    if(!r&&fase){
      out.push("  "+hm+" il timer si e' fermato da solo"+(detto.length?" (\""+detto[detto.length-1]+"\")":"")+"   "+stato(sc.bl));
      fase=null;
    }
    if(r)fase=r.phase;
    if(ora>=FINE||(!r&&!fase)){
      var ok=sc.mira.every(function(i){return tutti([sc.bl[i]]);});
      out.push("  a sera: "+stato(sc.bl)+"  →  "+(ok?"OK, tutto spuntato":"NO"));
      if(!ok)guai.push(sc.t);
      prossimo();return;
    }
    passo();
  }
  function chiudi(){
    window.Date=Vero;
    var esito=guai.length?"RECUPERO: "+guai.length+" SCENARI NON RIUSCITI":"RECUPERO: TUTTI GLI SCENARI OK";
    document.title=esito;
    var pre=document.createElement("pre");pre.id="MIS";
    pre.textContent=esito+"\n"+out.join("\n")+(guai.length?"\n\nnon riusciti:\n"+guai.join("\n"):"");
    document.body.appendChild(pre);
  }
  prossimo();
})();
