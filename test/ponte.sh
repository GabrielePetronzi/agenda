#!/bin/bash
# Prove del ponte col calendario: ponte/worker.js senza la riga "export",
# piu' test/ponte.js, in Chrome senza finestra.
set -u
QUI="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 - "$QUI" "$TMP" <<'PY'
import io,sys,os
qui,tmp=sys.argv[1],sys.argv[2]
w=io.open(os.path.join(qui,"ponte","worker.js"),encoding="utf-8").read().replace("export default","const PONTE =",1)
t=io.open(os.path.join(qui,"test","ponte.js"),encoding="utf-8").read()
io.open(os.path.join(tmp,"p.html"),"w",encoding="utf-8").write(
  "<!doctype html><meta charset=utf-8><title>...</title><script>\n"+w+"\n"+t+"\n</script>")
PY
R=$("$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=5000 --dump-dom "file://$TMP/p.html" 2>/dev/null | grep -o '<title>[^<]*' | sed 's/<title>//')
echo "$R"
case "$R" in *"TUTTI OK"*) exit 0;; *) exit 1;; esac
