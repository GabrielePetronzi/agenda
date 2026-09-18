#!/bin/bash
# Un mese di uno studente a tempo pieno, con l'orologio che avanza un minuto
# alla volta (test/mese.js). Serve un budget di tempo virtuale largo: sono
# quarantamila minuti simulati.
#   ./test/mese.sh
set -u
QUI="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 - "$QUI" "$TMP" <<'PY'
import io,sys,os
qui,tmp=sys.argv[1],sys.argv[2]
base=io.open(os.path.join(qui,"index.html"),encoding="utf-8").read()
s=io.open(os.path.join(qui,"test","mese.js"),encoding="utf-8").read()
io.open(os.path.join(tmp,"m.html"),"w",encoding="utf-8").write(
  base.replace("</body>","<script>setTimeout(function(){\n"+s+"\n},2200);</script>\n</body>",1))
PY
"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=120000 --window-size=1440,900 \
  --dump-dom "file://$TMP/m.html" 2>/dev/null | python3 -c "
import sys,re,html
d=sys.stdin.read();m=re.search(r'<pre id=\"MIS\">(.*?)</pre>',d,re.S)
print(html.unescape(m.group(1)).strip() if m else 'NIENTE')"
