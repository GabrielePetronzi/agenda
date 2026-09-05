#!/bin/bash
# Banco di prova dell'agenda. Non serve niente di installato: costruisce una
# copia di index.html con la suite iniettata e la fa girare in Chrome senza
# finestra, a dieci misure di schermo diverse — perché diversi difetti
# saltano fuori solo quando la riga della griglia si stringe.
#
#   ./test/run.sh              tutte le misure
#   ./test/run.sh 1440x900     una sola
set -u
QUI="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Chrome non trovato: metti il percorso in CHROME=..."; exit 2; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 - "$QUI" "$TMP" <<'PY'
import io,sys,os
qui,tmp=sys.argv[1],sys.argv[2]
base=io.open(os.path.join(qui,"index.html"),encoding="utf-8").read()
suite=io.open(os.path.join(qui,"test","suite.js"),encoding="utf-8").read()
wrap=("<script>setTimeout(function(){\ntry{\n"+suite+
      "\n}catch(e){document.title='CRASH '+e.message;}\n},900);</script>")
io.open(os.path.join(tmp,"test.html"),"w",encoding="utf-8").write(
    base.replace("</body>",wrap+"\n</body>",1))
PY
if [ $# -gt 0 ]; then MISURE="$*"
else MISURE="2560x1440 1920x1080 1440x900 1280x800 1024x768 900x1200 760x1000 600x800 1440x700 1200x600"; fi
ROSSI=0
for M in $MISURE; do
  W=${M%x*}; H=${M#*x}
  R=$("$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=25000 \
      --window-size=$W,$H --dump-dom "file://$TMP/test.html" 2>/dev/null \
      | grep -o '<title>[^<]*' | sed 's/<title>//')
  printf '%-11s %s\n' "$M" "$R"
  case "$R" in *"TUTTI OK"*) ;; *) ROSSI=1;; esac
done
[ $ROSSI -eq 0 ] && echo "tutto verde" || echo "ci sono controlli rossi"
exit $ROSSI
