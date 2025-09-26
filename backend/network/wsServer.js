// Server-only WebSocket listener (no local/user sockets here).
// First frame MUST be a server hello: SERVER_HELLO_JOIN or SERVER_HELLO_LINK.

const http = require("http");
const WebSocket = require("ws");
const meshCfg = require("./config");
const { handlers } = require("../routes/network");

const FIRST_FRAME_TYPES = new Set(["SERVER_HELLO_JOIN", "SERVER_HELLO_LINK"]);
const ALLOWED_TYPES = new Set(Object.keys(handlers)); // restrict to server-only types

function looksLikeEnvelope(x) {
  return x && typeof x === "object"
    && typeof x.type === "string"
    && x.payload && typeof x.payload === "object"
    && typeof x.ts === "number";
}

function attach(wss) {
  wss.on("connection", (ws, req) => {
    let handshakeDone = false;

    ws.on("message", async (buf) => {
      let env;
      try { env = JSON.parse(buf.toString("utf8")); } catch { return; }
      if (!looksLikeEnvelope(env)) return;
      if (!ALLOWED_TYPES.has(env.type)) return; // ignore non server-only types

      if (!handshakeDone) {
        if (!FIRST_FRAME_TYPES.has(env.type)) {
          // hard-drop if the first frame isn't a server hello
          try { ws.close(1008, "Expected server hello"); } catch {}
          return;
        }
        handshakeDone = true;
      }

      const ctx = {
        link: { send: (frame) => ws.send(JSON.stringify(frame)) },
        req,
      };

      const fn = handlers[env.type];
      if (typeof fn === "function") {
        try { await fn(env, ctx); }
        catch (e) { console.warn("[SOCP] Handler error:", e?.message); }
      }
    });
  });
}

function startMeshWebSocket() {
  const server = http.createServer();
  const wss = new WebSocket.Server({ server });
  attach(wss);

  server.listen(meshCfg.MESH_WS_PORT, () => {
    console.log(`[SOCP] Server-only WS listening on :${meshCfg.MESH_WS_PORT}`);
  });

  return { server, wss };
}

module.exports = { startMeshWebSocket, attach };
