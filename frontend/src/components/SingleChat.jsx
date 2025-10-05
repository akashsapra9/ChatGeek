import React, { useEffect, useState, useRef } from "react";
import { ChatState } from "../Context/chatProvider";
import {
  Box,
  FormControl,
  IconButton,
  Input,
  Spinner,
  Text,
  useToast,
  InputGroup,
  InputRightElement,
  Button,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderFull } from "../config/chatlogics";
import ProfileModel from "./misc/profileModel";
import UpdateGroupChatModal from "./misc/UpdateGroupChatModal";
import axios from "axios";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import "./styles.css";

import {
  encryptMessage,
  decryptMessage,
  signMessage,
  verifyMessage,
} from "../utils/crypto";
import { streamFileTransfer, FileReceiver } from "../utils/fileTransfer";

const ENDPOINT = "http://localhost:5001";
var socket, selectedChatCompare;




// ------------------------------------------------------------------
// Signing helpers
// ------------------------------------------------------------------
const signDataDM = (ciphertext, from, to, ts) => `${ciphertext}${from}${to}${ts}`;
const signDataPublic = (ciphertext, from, ts) => `${ciphertext}${from}${ts}`;

// ------------------------------------------------------------------
// Normalize + decrypt USER_DELIVER frames
// ------------------------------------------------------------------
const normalizeDeliveredFrame = async (frame, myPrivKey) => {
  const { payload } = frame || {};
  if (!payload) return { ...frame, plaintext: "[invalid payload]" };

  const { ciphertext, sender, sender_pub, content_sig } = payload;
  try {
    const plaintext = await decryptMessage(ciphertext, myPrivKey);

    // Try verify
    let ok = false;
    try {
      ok = await verifyMessage(
        signDataDM(ciphertext, frame.from, frame.to, frame.ts),
        content_sig,
        sender_pub
      );
    } catch (_) {}
    if (!ok) {
      try {
        ok = await verifyMessage(
          signDataPublic(ciphertext, frame.from, frame.ts),
          content_sig,
          sender_pub
        );
      } catch (_) {}
    }

    return { ...frame, plaintext: ok ? plaintext : "[invalid signature]", sender };
  } catch (err) {
    console.error("[SOCP] decrypt failed:", err);
    return { ...frame, plaintext: "[decryption failed]", sender };
  }
};

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { selectedChat, setSelectedChat, user, privateKey } = ChatState();
  const fileInputRef = useRef(null);
  const toast = useToast();



  const myPrivKey = privateKey;
  const myPubKey = user?.pubkey;
  if (!myPrivKey) console.error("[SOCP] ❌ Missing private key");
  if (!myPubKey) console.error("[SOCP] ❌ Missing public key");

  

  const isDM = selectedChat && !selectedChat.isGroupChat && !selectedChat.isCommunity;
  const isGroup = selectedChat && selectedChat.isGroupChat;
  // const isCommunity = selectedChat && selectedChat.isCommunity;

  // ------------------------------------------------------------------
  // Fetch chat history
  // ------------------------------------------------------------------
  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      setLoading(true);

      // ✅ chat_id instead of _id
      const { data: frames } = await axios.get(
        `/api/message/${selectedChat.chat_id}`,
        config
      );

      const normalized = await Promise.all(
        (frames || []).map((f) => normalizeDeliveredFrame(f, myPrivKey))
      );
      setMessages(normalized);
      setLoading(false);

      socket.emit("join chat", selectedChat.chat_id);
    } catch (error) {
      console.error("[SOCP] fetchMessages error:", error);
      setLoading(false);
      toast({
        title: "Error Occurred",
        description: "Failed to load messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // ------------------------------------------------------------------
  // Send text message
  // ------------------------------------------------------------------
  const sendMessage = async (event) => {
    if (event.key !== "Enter" || !newMessage) return;

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const ts = Date.now();
      const from = user.user_id; // ✅ fixed
      const plaintext = newMessage;

      if (!selectedChat?.users || selectedChat.users.length < 2) {
        console.error("[SOCP] ⚠️ selectedChat.users not ready or empty:", selectedChat);
        toast({
          title: "Chat not ready",
          description: "Please reselect or reload the chat.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // ---------- Direct Message ----------
      if (isDM) {
        const dmRecipient = selectedChat.users.find(
          (u) => u.user_id !== user.user_id
        );
        const to = dmRecipient.user_id;
        const recipientPub = dmRecipient?.pubkey;
        if (!recipientPub) {
          console.error(`[SOCP] ❌ Recipient ${to} missing pubkey`);
          return;
        }

        const ciphertext = await encryptMessage(plaintext, recipientPub);
        const toSign = signDataDM(ciphertext, from, to, ts);
        const content_sig = await signMessage(toSign, myPrivKey);

        const frame = {
          type: "MSG_DIRECT",
          from,
          to,
          ts,
          payload: { ciphertext, sender_pub: myPubKey, content_sig },
          sig: "",
        };

        setNewMessage("");
        const { data } = await axios.post("/api/message", frame, config);
        socket.emit("new message", data);
        setMessages((prev) => [...prev, { ...data, plaintext }]);
        return;
      }

      // ---------- Group Message ----------
      if (isGroup) {
        const to = selectedChat.chat_id;
        const members = selectedChat.users.filter(
          (u) => u.user_id !== user.user_id
        );

        for (const member of members) {
          const recipientPub = member?.pubkey;
          if (!recipientPub) continue;

          const ciphertext = await encryptMessage(plaintext, recipientPub);
          const toSign = signDataPublic(ciphertext, from, ts);
          const content_sig = await signMessage(toSign, myPrivKey);

          const frame = {
            type: "MSG_PUBLIC_CHANNEL",
            from,
            to,
            ts,
            payload: { ciphertext, sender_pub: myPubKey, content_sig },
            sig: "",
          };

          await axios.post("/api/message", frame, config);
          socket.emit("new message", frame);
        }

        setNewMessage("");
        setMessages((prev) => [
          ...prev,
          { plaintext, from, to, ts, type: "MSG_PUBLIC_CHANNEL" },
        ]);
        return;
      }

      toast({
        title: "Unsupported Chat Type",
        description: "Community chats are disabled.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    } catch (err) {
      console.error("[SOCP][sendMessage] error:", err);
      toast({
        title: "Error Occurred",
        description: "Failed to send message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // ------------------------------------------------------------------
  // Send File
  // ------------------------------------------------------------------
  const sendFile = async () => {
    if (!selectedFile) return;

    try {
      const chatId = selectedChat?.chat_id; // ✅ fixed
      const mode = isDM ? "dm" : "public";
      const from = user.user_id;

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      if (isDM) {
        const dmRecipient = selectedChat.users.find(
          (u) => u.user_id !== user.user_id
        );
        const to = dmRecipient.user_id;
        const recipientPub = dmRecipient?.pubkey;
        if (!recipientPub) {
          console.error(`[SOCP] ❌ Recipient ${to} has no pubkey`);
          return;
        }

        for await (const frame of streamFileTransfer(
          selectedFile,
          mode,
          chatId,
          from,
          recipientPub
        )) {
          const endpoint = `/api/file/${frame.type
            .split("_")[1]
            .toLowerCase()}`;
          await axios.post(endpoint, frame, config);
          socket.emit("file send", frame);
        }

        const fileUrl = URL.createObjectURL(selectedFile);
        const newFileMsg = {
          type: "FILE",
          name: selectedFile.name,
          url: fileUrl,
          plaintext: `[File: ${selectedFile.name}]`,
          from,
          to,
          ts: Date.now(),
        };

        setMessages((prev) => [...prev, newFileMsg]);
        socket.emit("new message", newFileMsg);
        setSelectedFile(null);
        fileInputRef.current.value = "";
        toast({ title: "File sent successfully!", status: "success" });
        return;
      }

      // ---------- Group File ----------
      if (isGroup) {
        const members = selectedChat.users.filter(
          (u) => u.user_id !== user.user_id
        );

        for (const member of members) {
          const recipientPub = member?.pubkey;
          if (!recipientPub) continue;

          for await (const frame of streamFileTransfer(
            selectedFile,
            mode,
            chatId,
            from,
            recipientPub
          )) {
            const endpoint = `/api/file/${frame.type
              .split("_")[1]
              .toLowerCase()}`;
            await axios.post(endpoint, frame, config);
            socket.emit("file send", frame);
          }
        }

        const fileUrl = URL.createObjectURL(selectedFile);
        const newFileMsg = {
          type: "FILE",
          name: selectedFile.name,
          url: fileUrl,
          plaintext: `[File: ${selectedFile.name}]`,
          from,
          to: chatId,
          ts: Date.now(),
        };

        setMessages((prev) => [...prev, newFileMsg]);
        socket.emit("new message", newFileMsg);
        setSelectedFile(null);
        toast({ title: "File sent to group!", status: "success" });
      }
    } catch (err) {
      console.error("[SOCP][sendFile] error:", err);
      toast({
        title: "File send failed",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ------------------------------------------------------------------
  // Socket Lifecycle
  // ------------------------------------------------------------------
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, [user]);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const handler = async (frame) => {
      const normalized = await normalizeDeliveredFrame(frame, myPrivKey);
      setMessages((prev) => [...prev, normalized]);
    };
    socket.on("message received", handler);
    return () => socket.off("message received", handler);
  }, []);

  // ------------------------------------------------------------------
  // Typing
  // ------------------------------------------------------------------
  const typingHandler = (e) => {
    setNewMessage(e.target.value);
    if (!socketConnected) return;
    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat.chat_id);
    }
    const now = Date.now();
    setTimeout(() => {
      socket.emit("stop typing", selectedChat.chat_id);
      setTyping(false);
    }, 3000);
  };

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "20px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work Sans"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />

            {isDM && (
              <>
                {getSender(user, selectedChat.users)}
                <ProfileModel user={getSenderFull(user, selectedChat.users)} />
              </>
            )}
            {isGroup && (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessages={fetchMessages}
                />
              </>
            )}
          </Text>

          <Box
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner size="xl" w={20} h={20} alignSelf="center" margin="auto" />
            ) : (
              <ScrollableChat messages={messages} />
            )}

            {(isDM || isGroup) && (
              <FormControl onKeyDown={sendMessage} isRequired mt={3}>
                {istyping && (
                  <div className="typing" style={{ width: "5rem", marginBottom: 10 }}>
                    Typing
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                )}

                {selectedFile && (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    bg="gray.100"
                    p={2}
                    mb={2}
                    borderRadius="md"
                  >
                    <Text>{selectedFile.name}</Text>
                    <Button size="sm" colorScheme="blue" onClick={sendFile}>
                      Send attachment
                    </Button>
                  </Box>
                )}

                <InputGroup>
                  <Input
                    variant="filled"
                    bg="#fff"
                    placeholder="Enter a Message"
                    onChange={typingHandler}
                    value={newMessage}
                  />
                  <InputRightElement>
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={(e) =>
                          setSelectedFile(e.target.files?.[0] || null)
                        }
                      />
                      <span
                        role="img"
                        aria-label="attach file"
                        style={{ cursor: "pointer" }}
                        onClick={() => fileInputRef.current.click()}
                      >
                        📎
                      </span>
                    </>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
            )}
          </Box>
        </>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work Sans">
            Click on a User to start Chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
