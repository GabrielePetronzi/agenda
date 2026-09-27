"""Clic veri su una pagina vera.

Apre la pagina in un Chrome senza finestra con la porta di debug e fa i
gesti col mouse del protocollo di Chrome (Input.dispatchMouseEvent): passano
dal browser come un clic del trackpad, con pointerdown, mousedown, pointerup,
click e lo spostamento del fuoco. E' la prova da fare quando un difetto
"col codice giusto" continua a esserci per chi usa l'app: gli eventi finti
della suite vanno dritti ai gestori e saltano tutto il resto.

    from clic import Pagina
    p=Pagina("https://gabrielepetronzi.github.io/agenda/?nuovo")
    p.js("render()")
    p.clic(300,400)            # clic semplice
    p.clic(300,400,meta=True)  # col tasto Cmd
    p.foto("x.png")
"""
import json,os,socket,base64,struct,subprocess,tempfile,time,urllib.request

CHROME=os.environ.get("CHROME","/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

class Pagina:
    def __init__(self,url,larghezza=1440,altezza=900,porta=9344):
        self.dir=tempfile.mkdtemp()
        self.proc=subprocess.Popen([CHROME,"--headless=new","--disable-gpu","--no-sandbox",
            "--user-data-dir="+self.dir,"--remote-debugging-port=%d"%porta,
            "--window-size=%d,%d"%(larghezza,altezza),url],
            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        ws=None
        for _ in range(100):
            time.sleep(0.2)
            try:
                lista=json.load(urllib.request.urlopen("http://localhost:%d/json"%porta))
                pag=[x for x in lista if x.get("type")=="page"]
                if pag: ws=pag[0]["webSocketDebuggerUrl"];break
            except Exception: pass
        if not ws: raise RuntimeError("Chrome non risponde")
        self._apri(ws);self.n=0
        self.cmd("Emulation.setDeviceMetricsOverride",{"width":larghezza,"height":altezza,
            "deviceScaleFactor":1,"mobile":False})
        for _ in range(100):
            time.sleep(0.2)
            if self.js("document.readyState==='complete'&&typeof state==='object'"): break
        time.sleep(1.5)

    def _apri(self,url):
        from urllib.parse import urlparse
        u=urlparse(url);self.s=socket.create_connection((u.hostname,u.port))
        k=base64.b64encode(os.urandom(16)).decode()
        self.s.send(("GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n"%(u.path,u.hostname,u.port,k)).encode())
        r=b""
        while b"\r\n\r\n" not in r: r+=self.s.recv(4096)

    def _manda(self,m):
        d=m.encode();h=bytearray([0x81]);L=len(d)
        if L<126: h.append(0x80|L)
        elif L<65536: h+=bytes([0x80|126])+struct.pack(">H",L)
        else: h+=bytes([0x80|127])+struct.pack(">Q",L)
        k=os.urandom(4);h+=k;self.s.send(bytes(h)+bytes(b^k[i%4] for i,b in enumerate(d)))
    def _leggi(self,n):
        b=b""
        while len(b)<n: b+=self.s.recv(n-len(b))
        return b
    def _ricevi(self):
        h=self._leggi(2);L=h[1]&0x7f
        if L==126: L=struct.unpack(">H",self._leggi(2))[0]
        elif L==127: L=struct.unpack(">Q",self._leggi(8))[0]
        return json.loads(self._leggi(L).decode())

    def cmd(self,metodo,param=None):
        self.n+=1;io=self.n
        self._manda(json.dumps({"id":io,"method":metodo,"params":param or {}}))
        while True:
            r=self._ricevi()
            if r.get("id")==io: return r.get("result",{})

    def js(self,espr):
        r=self.cmd("Runtime.evaluate",{"expression":espr,"returnByValue":True,"awaitPromise":True})
        if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"].get("text","")+" "+espr[:80])
        return r["result"].get("value")

    def clic(self,x,y,meta=False,ctrl=False,attesa=0.7):
        """Un clic vero, e poi la pausa di una persona: sotto i 600 ms l'app
        lo legge insieme al precedente come doppio tocco."""
        mod=(4 if meta else 0)|(2 if ctrl else 0)
        self.cmd("Input.dispatchMouseEvent",{"type":"mouseMoved","x":x,"y":y,"modifiers":mod})
        self.cmd("Input.dispatchMouseEvent",{"type":"mousePressed","x":x,"y":y,"button":"left",
            "buttons":1,"clickCount":1,"modifiers":mod})
        time.sleep(0.08)
        self.cmd("Input.dispatchMouseEvent",{"type":"mouseReleased","x":x,"y":y,"button":"left",
            "buttons":0,"clickCount":1,"modifiers":mod})
        time.sleep(attesa)

    def foto(self,file,clip=None):
        p={"format":"png"}
        if clip: p["clip"]=dict(clip,scale=1)
        d=self.cmd("Page.captureScreenshot",p)["data"]
        open(file,"wb").write(base64.b64decode(d))

    def chiudi(self):
        try:self.proc.kill()
        except Exception: pass
