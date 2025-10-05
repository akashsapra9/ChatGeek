const express = require("express");
const dotenv = require("dotenv");
const { EventEmitter } = require("events");

dotenv.config();

// Core setup
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const bus = require("./network/events");
const fileRoutes = require("./routes/fileRoutes");

// Import models for public channel initialization
const Group = require("./models/groupModel");
const GroupMember = require("./models/groupMemberModel");

//! TEMP: For debugging.
const { meshState } = require("./network/state/meshState");
meshState.userLocations.set("LOCAL-USER-UUID", "local");
console.log("[SOCP][DEV] Hosted local user: LOCAL-USER-UUID");

// Load SOCP config early (does not start anything yet)
const meshCfg = require("./network/config");
console.log("[SOCP] Config loaded", {
  serverId: meshCfg.SERVER_ID,
  hasPrivateKey: Boolean(meshCfg.SERVER_PRIVATE_KEY_B64URL),
  hasPublicKey: Boolean(meshCfg.SERVER_PUBLIC_KEY_B64URL),
  heartbeatMs: meshCfg.HEARTBEAT_MS,
  peerDeadMs: meshCfg.PEER_DEAD_MS,
  meshWsPort: meshCfg.MESH_WS_PORT,
  introducers: meshCfg.INTRODUCERS.length,
});

// ===== Express app =====
const app = express();

// ===== Public Channel Initialization Function =====
const initializePublicChannel = async () => {
  try {
    const publicChannelExists = await Group.findOne({ group_id: "public" });

    if (!publicChannelExists) {
      await Group.create({
        group_id: "public",
        creator_id: "system",
        name: "Public Channel",
        meta: {
          description: "Network-wide public channel",
        },
        version: 1,
      });
      console.log("[SOCP] Public channel initialized in database");
    } else {
      console.log("[SOCP] Public channel already exists in database");
    }

    // Optional: Log public channel members count
    const memberCount = await GroupMember.countDocuments({
      group_id: "public",
    });
    console.log(`[SOCP] Public channel has ${memberCount} members`);
  } catch (error) {
    console.error("[SOCP] Failed to initialize public channel:", error);
  }
};

// ===== Database Connection with Public Channel Init =====
connectDB()
  .then(() => {
    // Initialize public channel after successful DB connection
    initializePublicChannel();
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

app.use(express.json());

// Basic health
app.get("/", (_req, res) => res.send("API is Running"));

// ===== Routes =====
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/file", fileRoutes);

// File routes — only mount if present
try {
  console.log("[HTTP] /api/file mounted");
} catch (e) {
  console.log(
    "[HTTP] /api/file not mounted (routes/fileRoutes.js not found yet)"
  );
}

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Debug event taps (safe to keep)
bus.on("network:presenceUpdate", (evt) =>
  console.log("[DBG] presenceUpdate ->", evt)
);
bus.on("network:userDeliver", (p) =>
  console.log("[DBG] network:userDeliver ->", p)
);
bus.on("network:publicMessage", (p) =>
  console.log("[DBG] publicMessage ->", p)
);
bus.on("network:publicKeyShare", (p) =>
  console.log("[DBG] publicKeyShare ->", p)
);
bus.on("network:fileStart", (p) => console.log("[DBG] fileStart", p));
bus.on("network:fileChunk", (p) => console.log("[DBG] fileChunk", p));
bus.on("network:fileEnd", (p) => console.log("[DBG] fileEnd", p));
bus.on("network:ack", (p) => console.log("[DBG] ACK   <-", p));
bus.on("network:error", (p) => console.log("[DBG] ERROR <-", p));
bus.on("network:tx:error", (p) => console.log("[DBG] TX ERROR ->", p));
bus.on("network:tx:ack", (p) => console.log("[DBG] TX ACK   ->", p));

// SLC facades: app.locals.network & app.locals.fileService
const { advertiseUser, removeUser } = require("./network/presence");
const {
  sendServerDeliver,
  broadcastPublicMessage,
} = require("./network/delivery");
const {
  sendFileStart,
  sendFileChunk,
  sendFileEnd,
} = require("./network/files");

// helper: bridge selected events from our internal bus to a public EventEmitter
function makeBridge(emitter, mappings) {
  const bound = [];
  for (const [srcEvt, dstEvt] of mappings) {
    const h = (payload) => emitter.emit(dstEvt, payload);
    bus.on(srcEvt, h);
    bound.push([srcEvt, h]);
  }
  emitter.shutdown = () => bound.forEach(([src, h]) => bus.off(src, h));
  return emitter;
}

// app.locals.network
const networkEmitter = new EventEmitter();
networkEmitter.sendServerDeliver = sendServerDeliver;
networkEmitter.broadcastPublicMessage =
  broadcastPublicMessage ||
  (async (opaque) => bus.emit("network:publicMessage", opaque));
networkEmitter.advertiseUser = advertiseUser;
networkEmitter.removeUser = removeUser;

makeBridge(networkEmitter, [
  ["network:userDeliver", "userDeliver"],
  ["network:presenceUpdate", "presenceUpdate"],
  ["network:publicMessage", "publicMessage"],
  ["network:publicKeyShare", "publicKeyShare"],
  ["network:publicUpdate", "publicUpdate"],
  ["network:ack", "ack"],
  ["network:error", "error"],
]);

app.locals.network = networkEmitter;

// app.locals.fileService
const fileEmitter = new EventEmitter();
fileEmitter.sendFileStart = sendFileStart;
fileEmitter.sendFileChunk = sendFileChunk;
fileEmitter.sendFileEnd = sendFileEnd;

makeBridge(fileEmitter, [
  ["network:fileStart", "fileStart"],
  ["network:fileChunk", "fileChunk"],
  ["network:fileEnd", "fileEnd"],
]);

app.locals.fileService = fileEmitter;

console.log(
  "[SOCP] SLC facades ready: app.locals.network & app.locals.fileService"
);

// Start SLC (after app.locals are ready)
try {
  if (process.env.SLC_ENABLED === "true") {
    const { startSlcServer } = require("./slc/slcServer");
    startSlcServer(app);
    console.log("[SLC] started (mTLS loopback)");
  } else {
    console.log("[SLC] disabled (set SLC_ENABLED=true to enable)");
  }
} catch (e) {
  console.warn("[SLC] not started:", e?.message);
}

// Start HTTP server + Socket.IO
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server started on PORT: ${PORT}`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
  },
});

io.on("connection", (socket) => {
  console.log("Connected to Socket.io");

  // When client emits "setup" with its user data
  socket.on("setup", (userData) => {
    socket.join(userData.user_id); // ✅ use user_id now
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room:", room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;
    if (!chat?.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      // ✅ skip sender
      if (user.user_id === newMessageRecieved.sender.user_id) return;

      // ✅ emit to each recipient’s user_id room
      socket.in(user.user_id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
  });
});

// SOCP background services
try {
  const { startMeshWebSocket } = require("./network/wsServer");
  startMeshWebSocket();
  try {
    const { bootstrapIntroducers } = require("./network/peerClient");
    bootstrapIntroducers();
  } catch (e) {
    console.warn("[SOCP] Introducer bootstrap skipped:", e?.message);
  }
} catch (e) {
  console.warn("[SOCP] WS init skipped:", e?.message);
}

try {
  const { startHeartbeats } = require("./network/heartbeat");
  startHeartbeats();
  console.log("[SOCP] Heartbeats started");
} catch (e) {
  console.warn("[SOCP] Heartbeats init skipped:", e?.message);
}
