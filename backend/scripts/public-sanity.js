require("dotenv").config();
const WebSocket = require("ws");
const { signPayload } = require("../network/crypto/signing");

const PORT = parseInt(process.env.MESH_WS_PORT || "7081", 10);
const URL  = `ws://127.0.0.1:${PORT}`;
const PEER_ID   = process.env.DUMMY_PEER_ID || "peer_dummy";
const PEER_PUB  = process.env.DUMMY_PEER_PUBLIC_KEY_B64URL;
const PEER_PRIV = process.env.DUMMY_PEER_PRIVATE_KEY_B64URL;

if (!PEER_PUB || !PEER_PRIV) { console.error("Missing dummy peer keys."); process.exit(2); }

function send(ws, f) { ws.send(JSON.stringify(f)); }
const now = () => Date.now();

(async () => {
  const ws = new WebSocket(URL);
  ws.on("open", async () => {
    // Teach server our key
    send(ws, { type: "SERVER_HELLO_LINK", from: PEER_ID, to: "*", ts: now(),
               payload: { url: "ws://dummy", pubkey_b64url: PEER_PUB } });

    const payload = { ciphertext: "<opaque-public>", sender: "SENDER-UUID" };
    const sig = await signPayload(payload, PEER_PRIV);
    setTimeout(() => send(ws, { type: "MSG_PUBLIC_CHANNEL", from: PEER_ID, to: "*", ts: now(), payload, sig }), 180);

    setTimeout(() => process.exit(0), 500);
  });
})();
