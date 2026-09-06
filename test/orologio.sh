#!/bin/bash
# La stessa suite, ma con l'orologio spostato: infila un finto Date dentro la
# pagina prima che l'app parta, cosi' l'app crede che sia un'altra ora.
#
#   ./test/orologio.sh 0 6 12 18      la prova alle ore piu' scomode
#
# Serve perche' meta' di quello che fa l'app dipende da che ora e': il timer
# aggancia il blocco di adesso, la linea di oggi supera i blocchi passati, le
# lezioni si spuntano da sole. Un banco di prova che gira solo alle tre del
# pomeriggio non prova niente di tutto questo — e i controlli che si rompono
# di notte li ho scoperti cosi', alle 23:16, dopo averli creduti verdi.
set -u
QUI=/Users/gabrielepetronzi/Desktop/agenda
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
for OFF in "$@"; do
python3 - "$QUI" "$TMP" "$OFF" <<'PY'
import io,sys,os
qui,tmp,off=sys.argv[1],sys.argv[2],sys.argv[3]
base=io.open(os.path.join(qui,"index.html"),encoding="utf-8").read()
suite=io.open(os.path.join(qui,"test","suite.js"),encoding="utf-8").read()
shim=("<script>(function(){var OFF=%s*3600000;var V=Date;"
      "function F(){if(arguments.length===0)return new V(V.now()+OFF);"
      "return new (Function.prototype.bind.apply(V,[null].concat([].slice.call(arguments))))();}"
      "F.now=function(){return V.now()+OFF;};F.parse=V.parse;F.UTC=V.UTC;"
      "F.prototype=V.prototype;window.Date=F;})();</script>")%off
i=base.index("<script")
base=base[:i]+shim+base[i:]
wrap=("<script>setTimeout(function(){\ntry{\n"+suite+
      "\n}catch(e){document.title='CRASH '+e.message;}\n},900);</script>")
io.open(os.path.join(tmp,"t.html"),"w",encoding="utf-8").write(
    base.replace("</body>",wrap+"\n</body>",1))
PY
R=$("$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=25000 \
    --window-size=1440,900 --dump-dom "file://$TMP/t.html" 2>/dev/null \
    | grep -o '<title>[^<]*' | sed 's/<title>//')
printf 'orologio spostato di %+4s h : %s\n' "$OFF" "$R"
done
