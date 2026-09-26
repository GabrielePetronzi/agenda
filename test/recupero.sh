#!/bin/bash
# Il pomeriggio di recupero (test/recupero.js), minuto per minuto col vero
# giro del timer. Di norma gira sul file PUBBLICATO, scaricato adesso dal
# sito: e' quello che hai tu. Con --locale gira su index.html di qui.
#   ./test/recupero.sh            il sito
#   ./test/recupero.sh --locale   la copia locale
set -u
QUI="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [ "${1:-}" = "--locale" ]; then cp "$QUI/index.html" "$TMP/app.html"
else curl -s "https://gabrielepetronzi.github.io/agenda/?v=$RANDOM" -o "$TMP/app.html"; fi
grep -o 'const VERSIONE="[^"]*"' "$TMP/app.html"
python3 - "$QUI" "$TMP" <<'PY'
import io,sys,os
qui,tmp=sys.argv[1],sys.argv[2]
base=io.open(os.path.join(tmp,"app.html"),encoding="utf-8").read()
s=io.open(os.path.join(qui,"test","recupero.js"),encoding="utf-8").read()
io.open(os.path.join(tmp,"r.html"),"w",encoding="utf-8").write(
  base.replace("</body>","<script>setTimeout(function(){\n"+s+"\n},2200);</script>\n</body>",1))
PY
"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=2500000 --window-size=1440,900 \
  --dump-dom "file://$TMP/r.html" 2>/dev/null | python3 -c "
import sys,re,html
d=sys.stdin.read();m=re.search(r'<pre id=\"MIS\">(.*?)</pre>',d,re.S)
print(html.unescape(m.group(1)).strip() if m else 'NIENTE')"
