"""Il backup su file, coi file veri e la cancellazione vera.

Serve la cartella su un server locale (i file del browser non ci sono nelle
pagine aperte da disco) e fa quello che ti e' successo il 28 settembre:
  1. piano, backup su file acceso: il file segue le modifiche, anche dopo
     aver chiuso e riaperto la pagina;
  2. "cancella dati di navigazione" — il comando di Chrome che toglie i dati
     di un sito: memoria e database dell'app spariscono, il file no;
  3. riapertura: la barra in cima dice che la memoria era vuota; un clic su
     "Riprendi dal file di backup" rimette il piano e il backup riparte.
L'unica cosa finta e' la finestra per scegliere il file, che il protocollo
di Chrome non sa aprire: il file che restituisce e' vero.
    python3 test/file.py
"""
import sys,os,time,json,subprocess,socket
sys.path.insert(0,os.path.dirname(__file__))
from clic import Pagina
QUI=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
porta=8765
srv=subprocess.Popen([sys.executable,"-m","http.server",str(porta),"--bind","127.0.0.1"],cwd=QUI,
  stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
U="http://127.0.0.1:%d/index.html"%porta
guai=[]
try:
  p=Pagina(U,1440,900,porta=9401)
  conta=lambda:p.js("Object.keys(state.cells).length")
  def attendi(cond,sec=8):
    for _ in range(int(sec*5)):
      if p.js(cond):return True
      time.sleep(0.2)
    return False
  # 1. piano e backup su file
  p.js("""(async function(){state.cells={};var mat=items().filter(function(o){return o.kind==='c';});
    for(var g=0;g<14;g++)placeRun(iso(addDays(parse('2026-09-21'),g)),34,{i:mat[g%4].id,a:'SCH',len:4},0);
    save('piano');
    var dir=await navigator.storage.getDirectory();var h=await dir.getFileHandle('piano-agenda.json',{create:true});
    fileBk.h=h;fileBk.partitoVuoto=false;await idbScrivi(h);await fileScrivi();return fileBk.stato;})()""")
  leggi="(async function(){var d=await navigator.storage.getDirectory();var h=await d.getFileHandle('piano-agenda.json');var t=await (await h.getFile()).text();try{return Object.keys(JSON.parse(t).cells).length;}catch(e){return -1;}})()"
  n0=conta();f0=p.js(leggi)
  print("1. piano",n0,"mezz'ore · nel file",f0)
  if f0!=n0:guai.append("il file non ha il piano")
  p.cmd("Page.navigate",{"url":U+"?x=1"});time.sleep(4)
  print("   riaperta: backup",p.js("fileBk.stato"),"su",p.js("fileBk.h&&fileBk.h.name"))
  p.js("placeRun(iso(parse('2026-10-05')),34,{i:items().filter(function(o){return o.kind==='c';})[0].id,a:'LET',len:2},0);save('altro');1")
  attendi("false",3.2)
  f1=p.js(leggi);n1=conta()
  print("   modifica dopo la riapertura: piano",n1,"· nel file",f1)
  if f1!=n1:guai.append("dopo la riapertura il file non segue le modifiche")
  # 2. cancella dati di navigazione: memoria locale e database, non i file
  p.cmd("Storage.clearDataForOrigin",{"origin":"http://127.0.0.1:%d"%porta,"storageTypes":"local_storage,indexeddb,cookies,cache_storage,service_workers"})
  p.cmd("Page.navigate",{"url":U+"?x=2"});time.sleep(4)
  vuota=p.js("fileBk.partitoVuoto");barra=p.js("document.getElementById('filebar').classList.contains('on')?document.getElementById('filebar').textContent:''")
  print("2. dopo la cancellazione: piano",conta(),"mezz'ore · barra:",barra[:90])
  if not vuota or "vuota" not in barra:guai.append("dopo la cancellazione la barra non compare")
  f2=p.js(leggi)
  print("   il file c'e' ancora:",f2,"mezz'ore")
  # 3. un clic sul pulsante: la finestra di scelta restituisce il file vero
  p.js("""window.showOpenFilePicker=async function(){var d=await navigator.storage.getDirectory();return [await d.getFileHandle('piano-agenda.json')];};
    document.querySelector('#filebar [data-f="riprendi"]').click();1""")
  attendi("Object.keys(state.cells).length>=%d"%n1)
  print("3. premuto Riprendi dal file di backup: piano",conta(),"mezz'ore · backup",p.js("fileBk.stato"),"· barra",
    "accesa" if p.js("document.getElementById('filebar').classList.contains('on')") else "spenta")
  if conta()!=n1:guai.append("dal file il piano non torna")
  p.js("placeRun(iso(parse('2026-10-06')),34,{i:items().filter(function(o){return o.kind==='c';})[0].id,a:'LET',len:2},0);save('dopo');1")
  attendi("false",3.2)
  print("   e il backup e' ripartito: piano",conta(),"· nel file",p.js(leggi))
  if p.js(leggi)!=conta():guai.append("dopo il recupero il backup non riparte")
  p.js("(async function(){var d=await navigator.storage.getDirectory();await d.removeEntry('piano-agenda.json');return 1;})()")
  p.chiudi()
finally:
  srv.kill()
print("FILE: TUTTO BENE" if not guai else "FILE: "+" · ".join(guai))
sys.exit(1 if guai else 0)
