const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Group = require("../models/groupModel");
const { v4: uuidv4 } = require("uuid");

/* ------------------------------------------------------------------
   SEND MESSAGE (SOCP v1.3 format)
------------------------------------------------------------------- */
const sendMessage = asyncHandler(async (req, res) => {
  const {
    toUserId, // recipient UUID (for DM)
    group_id, // optional (for group/public)
    ciphertext, // encrypted body
    sender_pub, // sender's RSA public key
    content_sig, // signature
    ts, // SOCP timestamp (ms)
    message_type, // 'direct' or 'public'
  } = req.body;

  // Validation
  if (!ciphertext || !content_sig || !sender_pub) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing ciphertext or signature or pubkey" });
  }

  const sender_id = req.user.user_id;
  const timestamp = ts || Date.now();

  // For DMs, ensure toUserId is defined
  if (message_type === "direct" && !toUserId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing recipient ID for DM" });
  }

  // Generate message UUID
  const message_id = uuidv4();

  // Construct database record
  const messageDoc = {
    message_id,
    group_id: group_id || "direct",
    sender_id,
    ciphertext,
    sender_pub,
    content_sig,
    timestamp,
    message_type: message_type || "direct",
    recipient_id: toUserId || null,
    version: 1,
  };

  try {
    const savedMessage = await Message.create(messageDoc);

    // Update "latestMessage" equivalent if group exists
    if (group_id) {
      await Group.updateOne(
        { group_id },
        { $set: { "meta.latest_message": message_id } }
      );
    }

    // Deliver to SOCP network
    if (!req.app.locals?.network?.sendServerDeliver) {
      console.warn("[SOCP][sendMessage] ⚠️ No network layer available");
    } else {
      const payload = {
        ciphertext,
        sender_pub,
        content_sig,
      };
      const mode = message_type === "public" ? "public" : "direct";
      await req.app.locals.network.sendServerDeliver(
        toUserId || group_id,
        payload,
        { fromUser: sender_id, mode }
      );
    }

    return res.status(200).json({ ok: true, message: savedMessage });
  } catch (err) {
    console.error("[SOCP][sendMessage] DB error:", err);
    return res.status(400).json({ ok: false, error: err.message });
  }
});

/* ------------------------------------------------------------------
   GET ALL MESSAGES IN CHAT OR GROUP
------------------------------------------------------------------- */
const allMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params; // can be group_id or 'direct'

  try {
    const messages = await Message.find({ group_id: chatId })
      .sort({ timestamp: 1 })
      .lean();

    // Optional: attach display sender info
    const enriched = await Promise.all(
      messages.map(async (m) => {
        const sender = await User.findOne({ user_id: m.sender_id }).select(
          "user_id login_email meta.display_name meta.avatar_url"
        );
        return { ...m, sender };
      })
    );

    res.status(200).json(enriched);
  } catch (err) {
    console.error("[SOCP][allMessage] DB error:", err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = { sendMessage, allMessage };
