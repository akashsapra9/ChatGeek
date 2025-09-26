require('dotenv').config();

function warnMissing(name) {
  console.warn(`[SOCP] Warning: Missing env ${name}`);
}

function get(name, fallback = undefined) {
  const v = process.env[name];
  if (v == null || v === '') {
    if (fallback === undefined) warnMissing(name);
    return fallback;
  }
  return v;
}

function toInt(name, fallback) {
  const raw = get(name, String(fallback));
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntroducers() {
  const raw = get('INTRODUCERS_JSON', '[]');
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    console.warn('[SOCP] INTRODUCERS_JSON is not valid JSON, using []');
    return [];
  }
}

module.exports = {
  SERVER_ID: get('SERVER_ID'),                              // UUID v4
  SERVER_PRIVATE_KEY_B64URL: get('SERVER_PRIVATE_KEY_B64URL'),
  SERVER_PUBLIC_KEY_B64URL: get('SERVER_PUBLIC_KEY_B64URL'),
  HEARTBEAT_MS: toInt('HEARTBEAT_MS', 15000),
  PEER_DEAD_MS: toInt('PEER_DEAD_MS', 45000),
  MESH_WS_PORT: toInt('MESH_WS_PORT', 7081),
  INTRODUCERS: parseIntroducers(),                          // [{url, pubkey_b64url}]
};
