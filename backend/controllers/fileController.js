const asyncHandler = require('express-async-handler');

// Michelle sends a SOCP-like envelope. We accept both flat and envelope forms.
// Flat form:
//   { chatId, toUserId, fileId, fileName, fileSize, totalChunks }
// Envelope form (already unwrapped by FE is fine too):
//   { type, from, to, ts, payload:{ file_id, index?, ciphertext? }, sig }

exports.fileStart = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const chatId   = b.chatId ?? b.payload?.chatId;
  const toUserId = b.toUserId ?? b.to ?? b.payload?.toUserId;
  const fileId   = b.fileId ?? b.payload?.file_id;
  const fileName = b.fileName ?? b.payload?.name ?? b.payload?.file_name;
  const fileSize = b.fileSize ?? b.payload?.size;
  const totalChunks = b.totalChunks ?? b.payload?.totalChunks;

  if (!chatId || !toUserId || !fileId || !fileName || !fileSize || !totalChunks) {
    return res.status(400).json({ ok:false, error:'missing_fields' });
  }

  await req.app.locals.fileService.sendFileStart(toUserId, {
    chatId, file_id:fileId, name:fileName, size:fileSize, totalChunks
  });

  res.json({ ok:true });
});

exports.fileChunk = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const chatId   = b.chatId ?? b.payload?.chatId;
  const toUserId = b.toUserId ?? b.to ?? b.payload?.toUserId;
  const fileId   = b.fileId ?? b.payload?.file_id;
  const seq      = b.seq ?? b.payload?.index;
  const chunk    = b.chunk ?? b.payload?.ciphertext;

  if (!chatId || !toUserId || !fileId || (seq === undefined) || !chunk) {
    return res.status(400).json({ ok:false, error:'missing_fields' });
  }

  await req.app.locals.fileService.sendFileChunk(toUserId, {
    chatId, file_id:fileId, index:seq, ciphertext:chunk
  });

  res.json({ ok:true });
});

exports.fileEnd = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const chatId   = b.chatId ?? b.payload?.chatId;
  const toUserId = b.toUserId ?? b.to ?? b.payload?.toUserId;
  const fileId   = b.fileId ?? b.payload?.file_id;
  const checksum = b.checksum ?? b.payload?.sha256;

  if (!chatId || !toUserId || !fileId || !checksum) {
    return res.status(400).json({ ok:false, error:'missing_fields' });
  }

  await req.app.locals.fileService.sendFileEnd(toUserId, {
    chatId, file_id:fileId, sha256:checksum
  });

  res.json({ ok:true });
});
