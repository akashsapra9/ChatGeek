// Build & send ACK/ERROR envelopes (transport-signed), and small reply helpers.
const bus = require("./events");
const { buildSignedEnvelope } = require("./envelope");

function refFrom(env) {
  return { type: env.type, from: env.from, ts: env.ts };
}

function ackFor(env, extra = {}) {
  return buildSignedEnvelope("ACK", env.from, { ref: refFrom(env), ...extra });
}
function errorFor(env, code, detail = "", extra = {}) {
  return buildSignedEnvelope("ERROR", env.from, { ref: refFrom(env), code, detail, ...extra });
}

function sendAck(ctx, env, extra) {
  const frame = ackFor(env, extra);
  try { ctx.link.send(frame); }
  finally {
    // Outgoing notification for observability
    bus.emit("network:tx:ack", frame.payload); // { ref, ...extra }
  }
}
function sendError(ctx, env, code, detail, extra) {
  const frame = errorFor(env, code, detail, extra);
  try { ctx.link.send(frame); }
  finally {
    // Outgoing notification for observability
    bus.emit("network:tx:error", frame.payload); // { ref, code, detail, ...extra }
  }
}

module.exports = { ackFor, errorFor, sendAck, sendError };
