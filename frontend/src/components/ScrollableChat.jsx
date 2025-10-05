import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import { ChatState } from "../Context/chatProvider";
import ScrollableFeed from "react-scrollable-feed";
import {
  getSenderId,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
  isLastMessage,
} from "../config/chatlogics";

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();

  // TODO: SECURITY RISKS
  // 🧠 Handle plaintext vs ciphertext
  const getPlaintext = (m) => {
    // In testing, plaintext may still be available.
    if (m.plaintext) {
      console.warn(
        "[SOCP][ScrollableChat] plaintext message detected:",
        m.message_id
      );
      return m.plaintext;
    }

    // For SOCP messages, ciphertext is always a base64url string
    if (m.ciphertext) return "[encrypted message]";
    return "[no content]";
  };

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => {
          // 🧠 Identify sender
          const senderId =
            m.sender_id || getSenderId(m) || m.sender?.user_id || "unknown";
          const isMine = senderId === user?.user_id;

          const displayName =
            m.sender_meta?.display_name ||
            m.sender?.meta?.display_name ||
            (isMine ? "You" : senderId);

          const avatarSrc =
            m.sender_meta?.avatar_url ||
            m.sender?.meta?.avatar_url ||
            "";

          return (
            <div
              key={m.message_id || m.timestamp || i}
              style={{
                display: "flex",
                justifyContent: isMine ? "flex-end" : "flex-start",
                alignItems: "center",
              }}
            >
              {(isSameSender(messages, m, i, user?.user_id) ||
                isLastMessage(messages, i, user?.user_id)) && (
                <Tooltip
                  label={displayName}
                  placement="bottom-start"
                  hasArrow
                >
                  <Avatar
                    mt="7px"
                    mr={1}
                    size="sm"
                    cursor="pointer"
                    name={displayName}
                    src={avatarSrc}
                  />
                </Tooltip>
              )}

              <span
                style={{
                  backgroundColor: isMine ? "#BEE3F8" : "#B9F5D0",
                  marginLeft: !isMine
                    ? isSameSenderMargin(messages, m, i, user?.user_id)
                    : 0,
                  marginTop: isSameUser(messages, m, i, user?.user_id)
                    ? 3
                    : 10,
                  borderRadius: "20px",
                  padding: "5px 15px",
                  maxWidth: "75%",
                  wordBreak: "break-word",
                }}
              >
                {/* ==== Detect whether this is a file or normal message ==== */}
                {m.type === "FILE" ? (
                  <a
                    href={m.url}
                    download={m.name}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span role="img" aria-label="file">
                      📎
                    </span>
                    <b>{m.name}</b>
                  </a>
                ) : (
                  getPlaintext(m)
                )}
              </span>
            </div>
          );
        })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
