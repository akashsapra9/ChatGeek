const cfg = require('./config');

function selfUrl() {
  return `ws://${cfg.SERVER_HOST}:${cfg.MESH_WS_PORT}`;
}

function getSelfInfo() {
  return {
    server_id: cfg.SERVER_ID,            // UUID v4
    url: selfUrl(),                     // e.g., ws://127.0.0.1:7081
    pubkey_b64url: cfg.SERVER_PUBLIC_KEY_B64URL,
  };
}

module.exports = { selfUrl, getSelfInfo };
