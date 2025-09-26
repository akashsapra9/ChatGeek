// Lightweight event bus for the network layer -> local layer hand-off.

const { EventEmitter } = require("events");
const bus = new EventEmitter();

// Cap listener leak warnings during development.
bus.setMaxListeners(50);

module.exports = bus;
