// Server-only WS with handshake, verification, validation, liveness & limits.
const http = require("http");
const WebSocket = require("ws");
const meshCfg = require("./config");
const { handlers } = require("../routes/network");
const { verifyIncoming } = require("./envelope");
const { sendError } = require("./ack");
const { ERR } = require("./codes");
const { meshState } = require("./state/meshState");
const { validateEnvelope, validateByType } = require("./validators");

const FIRST_FRAME_TYPES = new Set(["SERVER_HELLO_JOIN", "SERVER_HELLO_LINK"]);
const ALLOWED_TYPES = new Set(Object.keys(handlers));

function looksLikeEnvelope(x) {
  return x && typeof x === "object"
    && typeof x.type === "string"
    && x.payload && typeof x.payload === "object"
    && typeof x.ts === "number";
}

function attach(wss) {
  wss.on("connection", (ws, req) => {
    let handshakeDone = false;

    // Per-connection link and simple token-bucket rate limiter
    const link = {
      send: (frame) => ws.send(JSON.stringify(frame)),
      ws,
      url: undefined,
      pubkey_b64url: undefined,
    };
    ws._socpLink = link;

    const rate = { tokens: 50, cap: 50, refillPerSec: 25, last: Date.now() };
    function takeToken() {
      const now = Date.now();
      const dt = (now - rate.last) / 1000;
      rate.tokens = Math.min(rate.cap, rate.tokens + dt * rate.refillPerSec);
      rate.last = now;
      if (rate.tokens < 1) return false;
      rate.tokens -= 1;
      return true;
    }

    ws.on("close", () => {
      for (const [sid, l] of meshState.servers) if (l === link) meshState.servers.delete(sid);
    });

    ws.on("message", async (buf) => {
      // Raw frame size guard (also enforced by ws server option)
      if (buf.length > meshCfg.MAX_WS_PAYLOAD_BYTES) {
        try { ws.close(1009, "payload too large"); } catch {}
        return;
      }

      let env;
      try { env = JSON.parse(buf.toString("utf8")); } catch { return; }
      if (!looksLikeEnvelope(env)) return;

      // Build ctx early so we can reply
      const ctx = { link, req };

      // Rate limit
      if (!takeToken()) {
        sendError(ctx, env, ERR.RATE_LIMIT, "too many frames");
        return;
      }

      // Only allow server message types
      if (!ALLOWED_TYPES.has(env.type)) {
        sendError(ctx, env, ERR.UNKNOWN_TYPE, "Not a server message type");
        return;
      }

      // Enforce first-frame server hello
      if (!handshakeDone) {
        if (!FIRST_FRAME_TYPES.has(env.type)) {
          try { ws.close(1008, "Expected server hello"); } catch {}
          return;
        }
        handshakeDone = true;
      }

      // Liveness
      if (env.from) meshState.lastSeen.set(env.from, Date.now());

      // Transport verification
      const v = verifyIncoming(env);
      if (!v.ok) {
        sendError(ctx, env, v.reason, "Verification failed");
        return;
      }

      // Envelope & payload validation
      const ve = validateEnvelope(env);
      if (!ve.ok) {
        sendError(ctx, env, ve.reason === "BAD_TIMESTAMP" ? ERR.BAD_TIMESTAMP : ERR.BAD_PAYLOAD, "Envelope invalid");
        return;
      }
      const vp = validateByType(env.type, env.payload);
      if (!vp.ok) {
        sendError(ctx, env, ERR.BAD_PAYLOAD, vp.reason || "Payload invalid");
        return;
      }

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
  const wss = new WebSocket.Server({
    server,
    // Enforce a max frame size at WS level too
    maxPayload: meshCfg.MAX_WS_PAYLOAD_BYTES,
  });
  attach(wss);

  server.on("error", (err) => {
    console.error("[SOCP] WS server error:", err.message);
  });

  server.listen(meshCfg.MESH_WS_PORT, () => {
    console.log(`[SOCP] Server-only WS listening on :${meshCfg.MESH_WS_PORT}`);
  });

  return { server, wss };
}

module.exports = { startMeshWebSocket, attach };
