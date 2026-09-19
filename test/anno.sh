#!/bin/bash
# Un anno di uno studente a tempo pieno, con l'orologio che avanza un minuto
# alla volta (test/anno.js). Ci mette una ventina di minuti: la pagina resta
# aperta in un Chrome senza finestra con la porta di debug, e il titolo dice
# a che giorno e'. Alla fine stampa il rapporto.
#   ./test/anno.sh
set -u
QUI="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'kill $PID 2>/dev/null; rm -rf "$TMP"' EXIT
python3 - "$QUI" "$TMP" <<'PY'
import io,sys,os
qui,tmp=sys.argv[1],sys.argv[2]
base=io.open(os.path.join(qui,"index.html"),encoding="utf-8").read()
s=io.open(os.path.join(qui,"test","anno.js"),encoding="utf-8").read()
io.open(os.path.join(tmp,"m.html"),"w",encoding="utf-8").write(
  base.replace("</body>","<script>setTimeout(function(){\n"+s+"\n},2200);</script>\n</body>",1))
PY
PORTA=9333
"$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$TMP/ud" --remote-debugging-port=$PORTA "file://$TMP/m.html" >/dev/null 2>&1 &
PID=$!
leggi(){ python3 - "$1" <<'PY'
import sys,json,socket,os,base64,struct
from urllib.parse import urlparse
u=urlparse(sys.argv[1]); s=socket.create_connection((u.hostname,u.port))
key=base64.b64encode(os.urandom(16)).decode()
s.send(("GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n"%(u.path,u.hostname,u.port,key)).encode())
resp=b""
while b"\r\n\r\n" not in resp: resp+=s.recv(4096)
def send(msg):
    d=msg.encode();hdr=bytearray([0x81]);L=len(d)
    if L<126: hdr.append(0x80|L)
    elif L<65536: hdr+=bytes([0x80|126])+struct.pack(">H",L)
    else: hdr+=bytes([0x80|127])+struct.pack(">Q",L)
    mask=os.urandom(4);hdr+=mask;s.send(bytes(hdr)+bytes(b^mask[i%4] for i,b in enumerate(d)))
def rd(n):
    b=b""
    while len(b)<n: b+=s.recv(n-len(b))
    return b
def recv():
    h=rd(2);L=h[1]&0x7f
    if L==126: L=struct.unpack(">H",rd(2))[0]
    elif L==127: L=struct.unpack(">Q",rd(8))[0]
    return rd(L).decode()
send(json.dumps({"id":1,"method":"Runtime.evaluate","params":{"expression":"(document.getElementById('MIS')||{}).textContent||document.title","returnByValue":True}}))
print(json.loads(recv())["result"]["result"]["value"])
PY
}
for i in $(seq 1 400); do
  sleep 6
  J=$(curl -s "http://localhost:$PORTA/json" 2>/dev/null)
  T=$(printf '%s' "$J" | python3 -c "import sys,json;x=[p for p in json.load(sys.stdin) if p.get('url','').endswith('m.html') and p.get('type')=='page'];print(x[0]['title'] if x else '')" 2>/dev/null)
  case "$T" in *"ANNO PULITO"*|*GUAI*|*CRASH*)
    WS=$(printf '%s' "$J" | python3 -c "import sys,json;x=[p for p in json.load(sys.stdin) if p.get('url','').endswith('m.html') and p.get('type')=='page'];print(x[0]['webSocketDebuggerUrl'])")
    leggi "$WS"; exit 0;;
  esac
  [ $((i%10)) -eq 0 ] && echo "…$T" >&2
done
echo "l'anno non e' finito in tempo"; exit 1
