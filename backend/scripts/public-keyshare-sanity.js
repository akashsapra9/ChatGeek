require("dotenv").config();
const WebSocket = require("ws");
const { signPayload } = require("../network/crypto/signing");

const PORT = parseInt(process.env.MESH_WS_PORT || "7081", 10);
const URL  = `ws://127.0.0.1:${PORT}`;
const PEER_ID   = process.env.DUMMY_PEER_ID || "peer_dummy";
const PEER_PUB  = process.env.DUMMY_PEER_PUBLIC_KEY_B64URL;
const PEER_PRIV = process.env.DUMMY_PEER_PRIVATE_KEY_B64URL;

function send(ws, f) { ws.send(JSON.stringify(f)); }
const now = () => Date.now();

(async () => {
  const ws = new WebSocket(URL);
  ws.on("open", async () => {
    send(ws, { type: "SERVER_HELLO_LINK", from: PEER_ID, to: "*", ts: now(),
               payload: { url: "ws://dummy", pubkey_b64url: PEER_PUB } });

    const payload = { user_id: "LOCAL-USER-UUID", wrapped_key_b64url: "<wrapped>", version: 1 };
    const sig = await signPayload(payload, PEER_PRIV);
    setTimeout(() => send(ws, { type: "PUBLIC_CHANNEL_KEY_SHARE", from: PEER_ID, to: "*", ts: now(), payload, sig }), 200);

    setTimeout(() => process.exit(0), 500);
  });
})();
