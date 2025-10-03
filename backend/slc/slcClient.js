const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getAndIncrementCounter, initCounter } = require("./counter");
async function createSlcSocket(){
  await initCounter();
  const hostport=process.env.SLC_BIND||"127.0.0.1:9443"; const [host,port]=hostport.split(":");
  const url=`wss://${host}:${port}/slc`;
  const ws=new WebSocket(url,{
    cert: fs.readFileSync(path.resolve(process.env.SLC_CERT||"secure-keystore/ui.crt")),
    key: fs.readFileSync(path.resolve(process.env.SLC_KEY||"secure-keystore/ui.key")),
    ca: fs.readFileSync(path.resolve(process.env.SLC_CA||"secure-keystore/localCA.crt")),
    rejectUnauthorized:true
  });
  ws.on("open",()=>console.log("[SLC client] connected"));
  ws.on("error",(e)=>console.error("[SLC client] error:",e.message));
  return ws;
}
function buildEnvelope(op, body={}){
  const nonce = crypto.randomBytes(12).toString("base64");
  return { version:1, from:"ui.local", to:"router.local", nonce, counter:0, op, body };
}
module.exports = { createSlcSocket, buildEnvelope };
