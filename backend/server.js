const express = require("express");
const dotenv = require("dotenv")
// const { chats } = require("./data/data");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { EventEmitter } = require("events");
const bus = require("./network/events");

//! TEMP: For debugging.
const { meshState } = require("./network/state/meshState");
meshState.userLocations.set("LOCAL-USER-UUID", "local");
console.log("[SOCP][DEV] Hosted local user: LOCAL-USER-UUID");

bus.on("network:presenceUpdate", (evt) => console.log("[DBG] presenceUpdate ->", evt));
bus.on("network:userDeliver", (p) => console.log("[DBG] network:userDeliver ->", p));
bus.on("network:publicMessage", (p) => console.log("[DBG] publicMessage ->", p));
bus.on("network:publicKeyShare", (p) => console.log("[DBG] publicKeyShare ->", p));
bus.on("network:fileStart", (p)=> console.log("[DBG] fileStart", p));
bus.on("network:fileChunk", (p)=> console.log("[DBG] fileChunk", p));
bus.on("network:fileEnd",   (p)=> console.log("[DBG] fileEnd", p));
bus.on("network:ack",   (p) => console.log("[DBG] ACK   <-", p));
bus.on("network:error", (p) => console.log("[DBG] ERROR <-", p));
bus.on("network:tx:error", (p) => console.log("[DBG] TX ERROR ->", p));
bus.on("network:tx:ack",   (p) => console.log("[DBG] TX ACK   ->", p));
//! END TEMP

const app = express()
dotenv.config();
connectDB();

// Load SOCP config early (does not start anything yet)
const meshCfg = require('./network/config');
console.log('[SOCP] Config loaded', {
  serverId: meshCfg.SERVER_ID,
  hasPrivateKey: Boolean(meshCfg.SERVER_PRIVATE_KEY_B64URL),
  hasPublicKey: Boolean(meshCfg.SERVER_PUBLIC_KEY_B64URL),
  heartbeatMs: meshCfg.HEARTBEAT_MS,
  peerDeadMs: meshCfg.PEER_DEAD_MS,
  meshWsPort: meshCfg.MESH_WS_PORT,
  introducers: meshCfg.INTRODUCERS.length,
});

app.use(express.json());

app.get('/', (req, res) => {
    res.send("API is Running");
});

app.use('/api/user', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/message', messageRoutes)

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, console.log(`Server started on PORT: ${PORT}`));

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000",
    },
})

io.on("connection", (socket) => {
    console.log("Connected to Socket.io");

    socket.on('setup', (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on('join chat', (room) => {
        socket.join(room);
        console.log('User Joined Room: ' + room);
    });
    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new message", (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id == newMessageRecieved.sender._id) return;

            socket.in(user._id).emit("message recieved", newMessageRecieved);
        });
    });

    socket.off("setup", () => {
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
    });

});

// === SLC facades: app.locals.network & app.locals.fileService ===
const { advertiseUser, removeUser } = require("./network/presence");
const { sendServerDeliver } = require("./network/delivery");
const { sendFileStart, sendFileChunk, sendFileEnd } = require("./network/files");

// helper: bridge selected events from our internal bus to a public EventEmitter
function makeBridge(emitter, mappings) {
  const bound = [];
  for (const [srcEvt, dstEvt] of mappings) {
    const h = (payload) => emitter.emit(dstEvt, payload);
    bus.on(srcEvt, h);
    bound.push([srcEvt, h]);
  }
  // optional cleanup method if you ever need to tear down
  emitter.shutdown = () => bound.forEach(([src, h]) => bus.off(src, h));
  return emitter;
}

// ---- app.locals.network ----
// exposes: sendServerDeliver, advertiseUser, and removeUser; emits events for SLC to consume
const networkEmitter = new EventEmitter();
networkEmitter.sendServerDeliver = sendServerDeliver;
networkEmitter.advertiseUser = advertiseUser;
networkEmitter.removeUser = removeUser;

// Re-emit the network events SLC is likely to care about:
makeBridge(networkEmitter, [
  ["network:userDeliver",    "userDeliver"],     // direct messages for local users
  ["network:presenceUpdate", "presenceUpdate"],  // USER_ADVERTISE / USER_REMOVE
  ["network:publicMessage",  "publicMessage"],   // public channel fanout
  ["network:publicKeyShare", "publicKeyShare"],  // key shares for local users
  ["network:publicUpdate",   "publicUpdate"],    // channel metadata (add/updated)
  ["network:ack",            "ack"],             // incoming ACKs (optional)
  ["network:error",          "error"],           // incoming ERRORs (optional)
]);

app.locals.network = networkEmitter;

// ---- app.locals.fileService ----
// exposes: sendFileStart, sendFileChunk, sendFileEnd; emits file events
const fileEmitter = new EventEmitter();
fileEmitter.sendFileStart = sendFileStart;
fileEmitter.sendFileChunk = sendFileChunk;
fileEmitter.sendFileEnd   = sendFileEnd;

makeBridge(fileEmitter, [
  ["network:fileStart", "fileStart"],
  ["network:fileChunk", "fileChunk"],
  ["network:fileEnd",   "fileEnd"],
]);

app.locals.fileService = fileEmitter;

// Log completion.
console.log("[SOCP] SLC facades ready: app.locals.network & app.locals.fileService");

// === SOCP: start WebSocket listener (dedicated port) ===
try {
  const { startMeshWebSocket } = require("./network/wsServer");
  startMeshWebSocket();
  // === SOCP: dial introducers (if configured) ===
  try {
    const { bootstrapIntroducers } = require('./network/peerClient');
    bootstrapIntroducers();
  } catch (e) {
    console.warn('[SOCP] Introducer bootstrap skipped:', e?.message);
  }
} catch (e) {
  console.warn("[SOCP] WS init skipped:", e?.message);
}

// === SOCP: start heartbeats & liveness monitor ===
try {
  const { startHeartbeats } = require("./network/heartbeat");
  startHeartbeats();
  console.log("[SOCP] Heartbeats started");
} catch (e) {
  console.warn("[SOCP] Heartbeats init skipped:", e?.message);
}
