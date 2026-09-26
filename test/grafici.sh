#!/bin/bash
# Fotografa "Come sta andando" con i dati d'esempio di test/grafici.js.
#   ./test/grafici.sh [file.png] [larghezza] [chiaro|scuro]
set -u
QUI="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$QUI/bozze/g-tutti.png}"; W="${2:-1200}"; TEMA="${3:-scuro}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 - "$QUI" "$TMP" "$TEMA" <<'PY'
import io,sys,os
qui,tmp,tema=sys.argv[1],sys.argv[2],sys.argv[3]
base=io.open(os.path.join(qui,"index.html"),encoding="utf-8").read()
s=io.open(os.path.join(qui,"test","grafici.js"),encoding="utf-8").read()
t="light" if tema=="chiaro" else "dark"
# l'orologio al 9 novembre 2026 alle 16, prima che l'app parta
shim=("<script>(function(){var V=Date,B=new V(2026,10,9,16,0,0).getTime(),T=V.now();"
      "function F(){if(arguments.length===0)return new V(B+V.now()-T);"
      "return new (Function.prototype.bind.apply(V,[null].concat([].slice.call(arguments))))();}"
      "F.now=function(){return B+V.now()-T;};F.parse=V.parse;F.UTC=V.UTC;F.prototype=V.prototype;"
      "window.Date=F;})();</script>")
i=base.index("<script")
base=base[:i]+shim+base[i:]
io.open(os.path.join(tmp,"g.html"),"w",encoding="utf-8").write(
  base.replace("</body>","<script>setTimeout(function(){state.theme='"+t+"';"
    "document.documentElement.setAttribute('data-theme',state.theme);\n"+s+"\n},1500);</script>\n</body>",1))
PY
"$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=8000 \
  --window-size=$W,2600 --screenshot="$OUT" "file://$TMP/g.html" 2>/dev/null
echo "$OUT"
