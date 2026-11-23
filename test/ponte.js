/* Prove del ponte col calendario (ponte/worker.js): la decisione, la
   lettura degli eventi iCloud e dell'XML. Gira in Chrome senza finestra
   (test/ponte.sh), senza iCloud ne' GitHub: quelli si provano solo dal vero. */
var T=[],ok=0,ko=0;
function t(n,f){try{var r=f();if(r===true)ok++;else{ko++;T.push("KO · "+n+" · "+r);}}catch(e){ko++;T.push("KO · "+n+" · eccezione: "+e.message);}}
var H=3600e3,D=864e5,dal=Date.UTC(2026,10,1);
function ev(uid,s,e,t){return {uid:uid,s:s,e:e,t:t||"Big data · Esercizi",d:""};}
function tipi(p){return p.ops.map(function(o){return o.tipo+":"+o.uid;}).join(",");}
var s0=Date.UTC(2026,10,24,8),e0=s0+2*H;

t("un blocco nuovo nell'app si crea nel calendario",function(){
  var p=decidi({eventi:[ev("agenda-a",s0,e0)]},{},[],dal);
  return tipi(p)==="crea:agenda-a"?true:tipi(p);});
t("spostato nel calendario: lo dice all'app e non lo rimette a posto",function(){
  var b={"agenda-a":Object.assign(ev("agenda-a",s0,e0),{href:"h",etag:"1"})};
  var p=decidi({eventi:[ev("agenda-a",s0,e0)]},{base:b},[{uid:"agenda-a",s:s0+H,e:e0+H,t:"Big data · Esercizi",href:"h",etag:"2"}],dal);
  var r=p.stato.riporti[0];
  if(p.ops.length)return "operazioni: "+tipi(p);
  return (r&&r.tipo==="sposta"&&r.s===s0+H)?true:JSON.stringify(p.stato.riporti);});
t("finche' l'app non l'ha letto, il giro dopo non tocca niente",function(){
  var b={"agenda-a":Object.assign(ev("agenda-a",s0,e0),{href:"h",etag:"1"})};
  var c=[{uid:"agenda-a",s:s0+H,e:e0+H,t:"x",href:"h",etag:"2"}];
  var p1=decidi({eventi:[ev("agenda-a",s0,e0)]},{base:b},c,dal);
  var p2=decidi({eventi:[ev("agenda-a",s0,e0)]},p1.stato,c,dal);
  return (!p2.ops.length&&p2.stato.riporti.length===1&&p2.stato.riporti[0].id===p1.stato.riporti[0].id)?true:tipi(p2)+" "+JSON.stringify(p2.stato.riporti);});
t("l'app l'ha spostato: via il vecchio evento, nasce il nuovo",function(){
  var b={"agenda-a":Object.assign(ev("agenda-a",s0,e0),{href:"h",etag:"1"})};
  var c=[{uid:"agenda-a",s:s0+H,e:e0+H,t:"x",href:"h",etag:"2"}];
  var p1=decidi({eventi:[ev("agenda-a",s0,e0)]},{base:b},c,dal);
  var id=p1.stato.riporti[0].id,letti={};letti[id]=true;
  var p2=decidi({eventi:[ev("agenda-b",s0+H,e0+H)],letti:letti},p1.stato,c,dal);
  return (tipi(p2).split(",").sort().join(",")==="cancella:agenda-a,crea:agenda-b"&&!p2.stato.riporti.length)?true:tipi(p2);});
t("l'app non l'ha preso (ore gia' fatte): l'evento torna com'era",function(){
  var b={"agenda-a":Object.assign(ev("agenda-a",s0,e0),{href:"h",etag:"1"})};
  var c=[{uid:"agenda-a",s:s0+H,e:e0+H,t:"x",href:"h",etag:"2"}];
  var p1=decidi({eventi:[ev("agenda-a",s0,e0)]},{base:b},c,dal);
  var letti={};letti[p1.stato.riporti[0].id]=false;
  var p2=decidi({eventi:[ev("agenda-a",s0,e0)],letti:letti},p1.stato,c,dal);
  return tipi(p2)==="aggiorna:agenda-a"?true:tipi(p2);});
t("cancellato nel calendario: lo dice all'app",function(){
  var b={"agenda-a":Object.assign(ev("agenda-a",s0,e0),{href:"h"})};
  var p=decidi({eventi:[ev("agenda-a",s0,e0)]},{base:b},[{uid:"altro",s:s0,e:e0,t:"Lavoro",href:"x",ripetuto:true}],dal);
  var r=p.stato.riporti.filter(function(x){return x.uid==="agenda-a";})[0];
  return (r&&r.tipo==="via"&&!p.ops.length)?true:tipi(p)+" "+JSON.stringify(p.stato.riporti);});
t("un evento scritto a mano arriva all'app, e poi lascia il posto al blocco",function(){
  var c=[{uid:"ABC-123",s:s0,e:e0,t:"Big data · Lettura",href:"m",etag:"1"}];
  var p1=decidi({eventi:[]},{},c,dal);
  var r=p1.stato.riporti[0];
  if(!r||r.tipo!=="nuovo"||r.t!=="Big data · Lettura")return "riporto: "+JSON.stringify(r);
  var letti={};letti[r.id]=true;
  var p2=decidi({eventi:[ev("agenda-n",s0,e0,"Big data · Lettura")],letti:letti},p1.stato,c,dal);
  return tipi(p2).split(",").sort().join(",")==="cancella:ABC-123,crea:agenda-n"?true:tipi(p2);});
t("un evento a mano non riconosciuto resta dov'e' e non si richiede",function(){
  var c=[{uid:"ABC-9",s:s0,e:e0,t:"Dentista",href:"m"}];
  var p1=decidi({eventi:[]},{},c,dal);
  var letti={};letti[p1.stato.riporti[0].id]=false;
  var p2=decidi({eventi:[],letti:letti},p1.stato,c,dal);
  var p3=decidi({eventi:[]},p2.stato,c,dal);
  return (!p2.ops.length&&!p3.ops.length&&!p3.stato.riporti.length)?true:tipi(p3)+" "+JSON.stringify(p3.stato.riporti);});
t("eventi di tutto il giorno e ripetuti non si toccano",function(){
  var p=decidi({eventi:[]},{},[{uid:"G",s:s0,e:s0+D,t:"Ferie",tuttoGiorno:true},{uid:"R",s:s0,e:e0,t:"Palestra",ripetuto:true}],dal);
  return (!p.ops.length&&!p.stato.riporti.length)?true:tipi(p);});
t("un nostro evento orfano si toglie invece di diventare un blocco",function(){
  var p=decidi({eventi:[]},{},[{uid:"agenda-z",s:s0,e:e0,t:"x",href:"h"}],dal);
  return (tipi(p)==="cancella:agenda-z"&&!p.stato.riporti.length)?true:tipi(p);});
t("calendario vuoto con tanti eventi attesi: si ferma",function(){
  var b={};for(var i=0;i<8;i++)b["agenda-"+i]=Object.assign(ev("agenda-"+i,s0,e0),{href:"h"});
  try{decidi({eventi:[]},{base:b},[],dal);}catch(e){return /vuoto/.test(e.message)?true:e.message;}
  return "non si e' fermato";});
t("un evento passato oltre la finestra si dimentica, non si cancella",function(){
  var b={"agenda-v":Object.assign(ev("agenda-v",dal-10*D,dal-10*D+H),{href:"h"})};
  var p=decidi({eventi:[]},{base:b},[{uid:"agenda-q",s:s0,e:e0,t:"x",href:"q"}],dal);
  return (!p.stato.base["agenda-v"]&&tipi(p)==="cancella:agenda-q")?true:tipi(p)+" base="+Object.keys(p.stato.base);});
t("cambiato nell'app (titolo): si aggiorna",function(){
  var b={"agenda-a":Object.assign(ev("agenda-a",s0,e0),{href:"h",etag:"1"})};
  var p=decidi({eventi:[ev("agenda-a",s0,e0,"✓ Big data · Esercizi")]},{base:b},[{uid:"agenda-a",s:s0,e:e0,t:"Big data · Esercizi",href:"h",etag:"1"}],dal);
  return tipi(p)==="aggiorna:agenda-a"?true:tipi(p);});

/* ---- iCalendar ---- */
t("l'ora con TZID Europe/Rome, d'inverno e d'estate",function(){
  var i1=leggiIcs("BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nDTSTART;TZID=Europe/Rome:20261124T090000\r\nDTEND;TZID=Europe/Rome:20261124T103000\r\nSUMMARY:Big data \\, prova\r\nEND:VEVENT\r\nEND:VCALENDAR","Europe/Rome");
  var i2=leggiIcs("BEGIN:VEVENT\nUID:y\nDTSTART;TZID=\"Europe/Rome\":20260715T090000\nDURATION:PT1H30M\nSUMMARY:x\nEND:VEVENT","Europe/Rome");
  if(i1.s!==Date.UTC(2026,10,24,8))return "inverno "+new Date(i1.s).toISOString();
  if(i1.e-i1.s!==90*60e3)return "fine inverno";
  if(i1.t!=="Big data , prova")return "titolo "+i1.t;
  if(i2.s!==Date.UTC(2026,6,15,7))return "estate "+new Date(i2.s).toISOString();
  return i2.e-i2.s===90*60e3?true:"durata estate";});
t("UTC, righe piegate, tutto il giorno, ripetuti",function(){
  var a=leggiIcs("BEGIN:VEVENT\r\nUID:agenda-1@agen\r\n da\r\nDTSTART:20261124T080000Z\r\nDTEND:20261124T100000Z\r\nSUMMARY:x\r\nEND:VEVENT","Europe/Rome");
  var g=leggiIcs("BEGIN:VEVENT\r\nUID:g\r\nDTSTART;VALUE=DATE:20261124\r\nSUMMARY:x\r\nEND:VEVENT","Europe/Rome");
  var r=leggiIcs("BEGIN:VEVENT\r\nUID:r\r\nDTSTART:20261124T080000Z\r\nDTEND:20261124T090000Z\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT","Europe/Rome");
  if(a.uid!=="agenda-1@agenda")return "uid piegato: "+a.uid;
  if(a.s!==Date.UTC(2026,10,24,8)||a.e!==Date.UTC(2026,10,24,10))return "utc";
  if(!g.tuttoGiorno)return "tutto il giorno";
  return r.ripetuto?true:"ripetuto";});
t("l'evento scritto dal ponte si rilegge uguale",function(){
  var e=ev("agenda-x@agenda",s0,e0,"Linguaggi, interpreti; compilatori · Esercizi");e.d="Esercizi · 2 h\nnota lunga lunga lunga lunga lunga lunga lunga lunga lunga lunga lunga lunga";
  var txt=icsEvento(e),l=leggiIcs(txt,"Europe/Rome");
  var lunghe=txt.split("\r\n").filter(function(r){return new TextEncoder().encode(r).length>75;});
  if(lunghe.length)return "riga lunga";
  return (l.uid===e.uid&&l.s===e.s&&l.e===e.e&&l.t===e.t)?true:JSON.stringify(l);});

/* ---- XML ---- */
t("l'XML di iCloud, con e senza prefissi",function(){
  var x1='<?xml version="1.0"?><multistatus xmlns="DAV:"><response><href>/123/calendars/abc/ev1.ics</href><propstat><prop>'+
    '<getetag>"C=1@U=2"</getetag><calendar-data xmlns="urn:ietf:params:xml:ns:caldav">BEGIN:VCALENDAR&#13;\nBEGIN:VEVENT&#13;\nUID:u1&#13;\nDTSTART:20261124T080000Z&#13;\nDTEND:20261124T090000Z&#13;\nSUMMARY:A &amp; B&#13;\nEND:VEVENT&#13;\nEND:VCALENDAR</calendar-data>'+
    '</prop></propstat></response><response><href>/123/calendars/abc/ev2.ics</href><propstat><prop><getetag>"x"</getetag>'+
    '<calendar-data xmlns="urn:ietf:params:xml:ns:caldav"><![CDATA[BEGIN:VEVENT\r\nUID:u2\r\nDTSTART:20261124T100000Z\r\nDTEND:20261124T110000Z\r\nSUMMARY:<b>\r\nEND:VEVENT]]></calendar-data></prop></propstat></response></multistatus>';
  var x2='<d:multistatus xmlns:d="DAV:"><d:response><d:href>/p/</d:href><d:propstat><d:prop><d:current-user-principal><d:href>/123/principal/</d:href></d:current-user-principal></d:prop></d:propstat></d:response></d:multistatus>';
  var rs=risposte(x1);
  if(rs.length!==2)return "risposte: "+rs.length;
  var e1=leggiIcs(testo(dentro(rs[0],"calendar-data")),"Europe/Rome"),e2=leggiIcs(testo(dentro(rs[1],"calendar-data")),"Europe/Rome");
  if(!e1||e1.uid!=="u1"||e1.t!=="A & B")return "primo: "+JSON.stringify(e1);
  if(!e2||e2.uid!=="u2"||e2.t!=="<b>")return "secondo: "+JSON.stringify(e2);
  if(testo(dentro(rs[0],"getetag"))!=='"C=1@U=2"')return "etag";
  var pr=testo(dentro(dentro(x2,"current-user-principal"),"href"));
  return pr==="/123/principal/"?true:"principal: "+pr;});

document.title=ko?("FALLITI "+ko+" su "+(ok+ko)+" || "+T.join(" || ")):("TUTTI OK "+ok+" controlli");
