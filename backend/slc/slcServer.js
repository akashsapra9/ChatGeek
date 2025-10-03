const https = require("https");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { verifyAndConsume, initReplayStore } = require("./slcReplay");
const envelopeSchema = require("./schema/slcEnvelope.schema.json");
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateEnvelope = ajv.compile(envelopeSchema);
async function startSlcServer(app) {
  if (process.env.SLC_ENABLED !== "true") { console.log("[SLC] disabled"); return null; }
  await initReplayStore();
  const SLC_BIND = process.env.SLC_BIND || "127.0.0.1:9443";
  const SLC_CA = process.env.SLC_CA || "secure-keystore/localCA.crt";
  const SLC_CERT = process.env.SLC_CERT || "secure-keystore/router.crt";
  const SLC_KEY = process.env.SLC_KEY || "secure-keystore/router.key";
  const SLC_MAX_BODY = parseInt(process.env.SLC_MAX_BODY || "65536", 10);
  const SLC_ALLOWED = (process.env.SLC_ALLOWED_CLIENTS || "ui.local").split(",");
  const [host, portStr] = SLC_BIND.split(":"); const port = parseInt(portStr, 10);
  const options = { key: fs.readFileSync(path.resolve(SLC_KEY)), cert: fs.readFileSync(path.resolve(SLC_CERT)),
    ca: fs.readFileSync(path.resolve(SLC_CA)), requestCert: true, rejectUnauthorized: true, minVersion: "TLSv1.3" };
  const server = https.createServer(options, (req, res) => { if (req.method==="GET"&&req.url==="/health"){res.writeHead(200,{"content-type":"text/plain"});return res.end("ok");} res.writeHead(404); res.end(); });
  const wss = new WebSocket.Server({ server, path: "/slc" });
  const broadcast = (obj)=>{const s=JSON.stringify(obj); wss.clients.forEach(c=>{ if(c.readyState===WebSocket.OPEN){ try{c.send(s);}catch(_){} } });};
  wss.on("connection",(ws,req)=>{
    const peer=req.socket.getPeerCertificate(true); const authorized=req.client&&req.client.authorized===true;
    if(!authorized||!peer||!peer.subject||!peer.subject.CN){ try{ws.close(1008,"unauthorized");}catch(_){}
      return; }
    const clientCN=peer.subject.CN; if(!SLC_ALLOWED.includes(clientCN)){ try{ws.close(1008,"forbidden");}catch(_){}
      return; }
    console.log("[SLC] client connected:", clientCN);
    ws.on("message", async (buf)=>{
      try{
        if(!buf) return; const text=buf.toString();
        if(text.length>SLC_MAX_BODY){ ws.send(JSON.stringify({error:"payload_too_large"})); ws.close(1009,"too_big"); return; }
        const msg=JSON.parse(text);
        if(!validateEnvelope(msg)){ ws.send(JSON.stringify({error:"invalid_envelope", details: validateEnvelope.errors})); return; }
        const ok = await verifyAndConsume(clientCN, msg.nonce, msg.counter); if(!ok){ ws.send(JSON.stringify({error:"replay_or_counter_error"})); return; }
        const op=String(msg.op||"").toUpperCase(); const body=msg.body||{};
        const net=app.locals&&app.locals.network; const files=app.locals&&app.locals.fileService;
        switch(op){
          case "SEND_CHAT":
            if(!net||typeof net.sendServerDeliver!=="function"){ ws.send(JSON.stringify({ok:false,error:"network_api_missing"})); break; }
            try{ const result=await net.sendServerDeliver(body); ws.send(JSON.stringify({ok:true,result})); }catch(e){ ws.send(JSON.stringify({ok:false,error:e.message})); }
            break;
          case "ADVERTISE":
            if(!net||typeof net.advertiseUser!=="function"){ ws.send(JSON.stringify({ok:false,error:"network_api_missing"})); break; }
            try{ await net.advertiseUser(body); ws.send(JSON.stringify({ok:true})); }catch(e){ ws.send(JSON.stringify({ok:false,error:e.message})); }
            break;
          case "FILE_START":
            if(!files||typeof files.sendFileStart!=="function"){ ws.send(JSON.stringify({ok:false,error:"file_api_missing"})); break; }
            try{ await files.sendFileStart(body); ws.send(JSON.stringify({ok:true})); }catch(e){ ws.send(JSON.stringify({ok:false,error:e.message})); }
            break;
          case "FILE_CHUNK":
            if(!files||typeof files.sendFileChunk!=="function"){ ws.send(JSON.stringify({ok:false,error:"file_api_missing"})); break; }
            try{ await files.sendFileChunk(body); ws.send(JSON.stringify({ok:true})); }catch(e){ ws.send(JSON.stringify({ok:false,error:e.message})); }
            break;
          case "FILE_END":
            if(!files||typeof files.sendFileEnd!=="function"){ ws.send(JSON.stringify({ok:false,error:"file_api_missing"})); break; }
            try{ await files.sendFileEnd(body); ws.send(JSON.stringify({ok:true})); }catch(e){ ws.send(JSON.stringify({ok:false,error:e.message})); }
            break;
          default: ws.send(JSON.stringify({ok:false,error:"unknown_op"}));
        }
      }catch(e){ ws.send(JSON.stringify({ok:false,error:"server_error",message:e.message})); }
    });
  });
  if(app.locals&&app.locals.network&&typeof app.locals.network.on==="function"){
    const net=app.locals.network;
    net.on("userDeliver",(p)=>broadcast({event:"dm",payload:p}));
    net.on("presenceUpdate",(p)=>broadcast({event:"presence",payload:p}));
    net.on("publicMessage",(p)=>broadcast({event:"publicMessage",payload:p}));
    net.on("ack",(p)=>broadcast({event:"ack",payload:p}));
    net.on("error",(p)=>broadcast({event:"error",payload:p}));
  }
  if(app.locals&&app.locals.fileService&&typeof app.locals.fileService.on==="function"){
    const files=app.locals.fileService;
    files.on("file:start",(p)=>broadcast({event:"file:start",payload:p}));
    files.on("file:chunk",(p)=>broadcast({event:"file:chunk",payload:p}));
    files.on("file:end",(p)=>broadcast({event:"file:end",payload:p}));
  }
  server.listen(port, host, ()=> console.log(`[SLC] listening on wss://${host}:${port}/slc`));
  return { server, wss };
}
module.exports = { startSlcServer };
