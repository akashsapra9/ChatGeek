/**
 * Extracts the logical sender ID for any SOCP frame type.
 * Works for both outgoing frames (with `.from`) and
 * incoming USER_DELIVER frames (with `.payload.sender`).
 */
export const getSenderId = (m) => {
    if (!m) return null;
    if (m.from) return m.from; // Outgoing MSG_* or FILE_* frames
    if (m.sender_id) return m.sender_id; //TODO: it should not happen. SOCP message schema
    return null;
  };
  
  /**
   * Determines whether to show avatar after this message.
   */
  export const isSameSender = (messages, m, i, userId) => {
    if (!messages || i >= messages.length - 1) return false;
  
    const curr = getSenderId(m);
    const next = getSenderId(messages[i + 1]);
  
    return curr !== userId && curr !== next;
  };
  
  /**
   * Show avatar for the last message in a sequence.
   */
  export const isLastMessage = (messages, i, userId) => {
    if (!messages || messages.length === 0) return false;
  
    const curr = getSenderId(messages[i]);
    const last = getSenderId(messages[messages.length - 1]);
  
    return curr !== userId && curr === last;
  };
  
  /**
   * Determines margin for message bubble alignment.
   */
  export const isSameSenderMargin = (messages, m, i, userId) => {
    if (!messages || messages.length === 0) return 0;
  
    const curr = getSenderId(m);
    const next = i < messages.length - 1 ? getSenderId(messages[i + 1]) : null;
    const isMine = curr === userId;
  
    if (isMine) return "auto";
    if (next === curr) return 33;
    return 0;
  };
  
  /**
   * Groups vertically stacked messages from the same sender.
   */
  export const isSameUser = (messages, m, i) => {
    if (i === 0) return false;
    const curr = getSenderId(m);
    const prev = getSenderId(messages[i - 1]);
    return curr === prev;
  };
  
  /* ------------------------------------------------------------------
     SOCP-aware replacements for getSender / getSenderpic / getSenderFull
     Users are objects of shape:
     {
       user_id: "UUID",
       login_email: "...",
       meta: { display_name, avatar_url, ... }
     }
  ------------------------------------------------------------------- */
  
  export const getSender = (loggedUser, users) => {
    if (!users || users.length < 2) return "Unknown";
    const other = users.find((u) => u.user_id !== loggedUser?.user_id);
    return other?.meta?.display_name || other?.login_email || "Unknown User";
  };
  
  export const getSenderpic = (loggedUser, users) => {
    if (!users || users.length < 2) return "";
    const other = users.find((u) => u.user_id !== loggedUser?.user_id);
    return (
      other?.meta?.avatar_url ||
      "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    );
  };
  
  export const getSenderFull = (loggedUser, users) => {
    if (!users || users.length < 2) return null;
    return users.find((u) => u.user_id !== loggedUser?.user_id) || null;
  };
  