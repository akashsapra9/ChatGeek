const mongoose = require("mongoose");

const chatSchema = mongoose.Schema(
  {
    chat_id: {
      type: String,
      required: true,
      unique: true,
      default: () => require("uuid").v4(), // optional auto-uuid
    },
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    isCommunity: { type: Boolean, default: false },

    // store UUIDs, not ObjectIds
    users: [
      {
        type: String, // user_id strings
        required: true,
      },
    ],

    latestMessage: {
      type: String, // message_id (UUID)
      required: false,
    },

    groupAdmin: {
      type: String, // user_id of admin
      required: false,
    },

    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
