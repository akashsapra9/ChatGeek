// Lightweight event bus for the network layer -> local layer hand-off.
// Your teammate can subscribe without touching WebSocket code.
//
// Example subscriptions (later, when we wire them):
//   bus.on("network:userDeliver", (payload) => { ... });
//   bus.on("network:publicMessage", (payload) => { ... });

const { EventEmitter } = require("events");
const bus = new EventEmitter();

// Optional: cap listener leak warnings during dev
bus.setMaxListeners(50);

module.exports = bus;
