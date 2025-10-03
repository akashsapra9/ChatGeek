const asyncHandler = require("express-async-handler");
const Message = require('../models/messageModel');
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const sendMessage = asyncHandler(async (req, res) => {
  // NEW: accept both plaintext and encrypted bodies
  const {
    chatId,
    toUserId,              // required for DM delivery
    content,               // plaintext
    ciphertext,            // encrypted payload
    content_sig,           // signature name used by FE
    sig,                   // alt signature name
  } = req.body;

  if (!chatId) {
    console.log("Invalid request: missing chatId");
    return res.status(400).json({ ok: false, error: "chatId required" });
  }
  if (!toUserId) {
    // SOCP DM requires an explicit destination
    return res.status(400).json({ ok: false, error: "missing_toUserId" });
  }

  // Decide mode + payload we’ll forward over the network
  let mode, payloadForNetwork;

  if (ciphertext) {
    const signature = content_sig || sig;
    if (!signature) {
      return res
        .status(400)
        .json({ ok: false, error: "missing_signature_for_ciphertext" });
    }
    mode = "encrypted";
    payloadForNetwork = { ciphertext, signature };
  } else if (typeof content === "string" && content.length > 0) {
    mode = "plaintext";
    payloadForNetwork = { content };
  } else {
    return res
      .status(400)
      .json({ ok: false, error: "missing_message_body" });
  }

  // Persist like before so latestMessage works.
  // For encrypted, store a placeholder text to avoid schema changes.
  let savedMessage = null;
  try {
    const toSaveContent =
      mode === "plaintext" ? content : " Encrypted message";

    let newMessage = {
      sender: req.user._id,
      content: toSaveContent,
      chat: chatId,
    };

    savedMessage = await Message.create(newMessage);

    savedMessage = await savedMessage.populate("sender", "name pic");
    savedMessage = await savedMessage.populate("chat");
    savedMessage = await User.populate(savedMessage, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: savedMessage });
  } catch (error) {
    console.error("[sendMessage] DB error:", error);
    return res.status(400).json({ ok: false, error: error.message });
  }

  // Hand off to Finlay’s network layer
  try {
    if (!req.app.locals?.network?.sendServerDeliver) {
      return res
        .status(500)
        .json({ ok: false, error: "network_api_missing" });
    }

    await req.app.locals.network.sendServerDeliver(
      toUserId,
      payloadForNetwork,
      { chatId, mode }
    );
  } catch (e) {
    console.error("[sendMessage] network deliver failed:", e);
    return res.status(202).json({ ok: false, deliver: "failed", error: e.message });
  }

  // Response stays compatible with your frontend (plaintext path),
  // plus we include mode so FE can distinguish encrypted.
  return res.json({ ok: true, mode, message: savedMessage });
});


const allMessage = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId }).populate("sender", "name pic email")
            .populate("chat");

        res.json(messages)
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
})

module.exports = { sendMessage, allMessage };