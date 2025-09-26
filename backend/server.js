const express = require("express");
const dotenv = require("dotenv")
// const { chats } = require("./data/data");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

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