// Server-only SOCP handlers (no local/user socket handling here).

function onServerHelloJoin(env, ctx)      { console.log("SERVER_HELLO_JOIN", env.payload); }
function onServerWelcome(env, ctx)        { console.log("SERVER_WELCOME", env.payload); }
function onServerAnnounce(env, ctx)       { console.log("SERVER_ANNOUNCE", env.payload); }
function onServerHelloLink(env, ctx)      { console.log("SERVER_HELLO_LINK", env.payload); }

function onUserAdvertise(env, ctx)        { console.log("USER_ADVERTISE", env.payload); }
function onUserRemove(env, ctx)           { console.log("USER_REMOVE", env.payload); }

function onServerDeliver(env, ctx)        { console.log("SERVER_DELIVER", env.payload); }

function onMsgPublicChannel(env, ctx)     { console.log("MSG_PUBLIC_CHANNEL", env.payload); }
function onPublicChannelAdd(env, ctx)     { console.log("PUBLIC_CHANNEL_ADD", env.payload); }
function onPublicChannelUpdated(env, ctx) { console.log("PUBLIC_CHANNEL_UPDATED", env.payload); }
function onPublicChannelKeyShare(env,ctx) { console.log("PUBLIC_CHANNEL_KEY_SHARE", env.payload); }

function onFileStart(env, ctx)            { console.log("FILE_START", env.payload); }
function onFileChunk(env, ctx)            { console.log("FILE_CHUNK", env.payload); }
function onFileEnd(env, ctx)              { console.log("FILE_END", env.payload); }

function onHeartbeat(env, ctx)            { /* quiet */ }
function onAck(env, ctx)                  { /* quiet */ }
function onError(env, ctx)                { console.warn("ERROR", env.payload); }

const handlers = {
  // server↔server bootstraps
  SERVER_HELLO_JOIN: onServerHelloJoin,
  SERVER_WELCOME: onServerWelcome,
  SERVER_ANNOUNCE: onServerAnnounce,
  SERVER_HELLO_LINK: onServerHelloLink,

  // presence gossip (server↔server)
  USER_ADVERTISE: onUserAdvertise,
  USER_REMOVE: onUserRemove,

  // delivery (server↔server only)
  SERVER_DELIVER: onServerDeliver,

  // public channel (server↔server)
  MSG_PUBLIC_CHANNEL: onMsgPublicChannel,
  PUBLIC_CHANNEL_ADD: onPublicChannelAdd,
  PUBLIC_CHANNEL_UPDATED: onPublicChannelUpdated,
  PUBLIC_CHANNEL_KEY_SHARE: onPublicChannelKeyShare,

  // file relay
  FILE_START: onFileStart,
  FILE_CHUNK: onFileChunk,
  FILE_END: onFileEnd,

  // plumbing
  HEARTBEAT: onHeartbeat,
  ACK: onAck,
  ERROR: onError,
};

module.exports = { handlers };
