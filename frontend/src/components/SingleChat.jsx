import React, { useEffect, useState } from 'react'
import { ChatState } from '../Context/chatProvider'
import { Box, FormControl, IconButton, Input, Spinner, Text, useToast } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { getSender, getSenderFull } from '../config/chatlogics';
import ProfileModel from './misc/profileModel';
import UpdateGroupChatModal from './misc/UpdateGroupChatModal';
import axios from 'axios';
import ScrollableChat from './ScrollableChat';
import io from 'socket.io-client'
import './styles.css'
import { encryptMessage, decryptMessage, signMessage, verifyMessage } from "../utils/crypto";

const ENDPOINT = "http://localhost:5001";
// eslint-disable-next-line
var socket, selectedChatCompare;


const SingleChat = ({ fetchAgain, setFetchAgain }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState()
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);
    const [istyping, setIsTyping] = useState(false);
    const toast = useToast();

    const { selectedChat, setSelectedChat, user, notification, setNotification } = ChatState();
    // Debug: print the attributes of user object
    console.log("[DBG] User object:", user);
    // Debug: print the attributes of selectedChat object
    console.log("[DBG] SelectedChat object:", selectedChat);
    
    const fetchMessages = async () => {
        if (!selectedChat) return;

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            setLoading(true);

            const { data } = await axios.get(
                `/api/message/${selectedChat._id}`,
                config
            );

            const myPrivKey = localStorage.getItem("my_privkey");

            const decrypted = await Promise.all(
            data.map(async (m) => {
                try {
                // verify signature with sender’s pubkey
                const ok = await verifyMessage(m.ciphertext, m.content_sig, m.sender.pubkey);
                if (!ok) return { ...m, plaintext: "[invalid signature]" };

                // decrypt with my private key
                const plain = await decryptMessage(m.ciphertext, myPrivKey);
                return { ...m, plaintext: plain };
                } catch {
                return { ...m, plaintext: "[decryption failed]" };
                }
            })
            );

            setMessages(decrypted);
            setLoading(false);

            socket.emit("join chat", selectedChat._id);

        } catch (error) {
            toast({
                title: "Error Occured!",
                description: "Failed to Load the Messages",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
        }
    };

    const sendMessage = async (event) => {
        if (event.key === "Enter" && newMessage) {
            try {
                const config = {
                    headers: {
                        "Content-type": "application/json",
                        Authorization: `Bearer ${user.token}`,
                    },
                };
                setNewMessage("");
                const myPrivKey = localStorage.getItem("my_privkey");

                // pick first recipient (for group chat, loop later)
                const recipient = selectedChat.users.find(u => u._id !== user._id);

                const ciphertext = await encryptMessage(newMessage, recipient.pubkey);
                const signature = await signMessage(ciphertext, myPrivKey);

                const { data } = await axios.post(
                "/api/message",
                {
                    ciphertext,
                    content_sig: signature,
                    chatId: selectedChat._id,
                },
                config
                );

                socket.emit("new message", data);
                setMessages([...messages, { ...data, plaintext: newMessage }]);
            } catch (error) {
                toast({
                    title: "Error Occured!",
                    description: "Failed to send the Message",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                    position: "bottom",
                });
            }
        }
    };

    useEffect(() => {
        socket = io(ENDPOINT);
        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));
        socket.on("typing", () => setIsTyping(true));
        socket.on("stop typing", () => setIsTyping(false));

        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        fetchMessages();
        selectedChatCompare = selectedChat;
        // eslint-disable-next-line
    }, [selectedChat]);

    useEffect(() => {
        socket.on("message recieved", async (newMessageRecieved) => {
            const myPrivKey = localStorage.getItem("my_privkey");

            let decrypted;
            try {
            const ok = await verifyMessage(
                newMessageRecieved.ciphertext,
                newMessageRecieved.content_sig,
                newMessageRecieved.sender.pubkey
            );
            if (!ok) {
                decrypted = { ...newMessageRecieved, plaintext: "[invalid signature]" };
            } else {
                const plain = await decryptMessage(newMessageRecieved.ciphertext, myPrivKey);
                decrypted = { ...newMessageRecieved, plaintext: plain };
            }
            } catch {
            decrypted = { ...newMessageRecieved, plaintext: "[decryption failed]" };
            }

            if (
            !selectedChatCompare ||
            selectedChatCompare._id !== decrypted.chat._id
            ) {
            if (!notification.includes(decrypted)) {
                setNotification([decrypted, ...notification]);
                setFetchAgain(!fetchAgain);
            }
            } else {
            setMessages([...messages, decrypted]);
            }
        });
    });


    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        if (!socketConnected) return;

        if (!typing) {
            setTyping(true);
            socket.emit("typing", selectedChat._id);
        }
        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;
        setTimeout(() => {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength && typing) {
                socket.emit("stop typing", selectedChat._id);
                setTyping(false);
            }
        }, timerLength);
    };

    return (
        <>
            {selectedChat ? (
                <>
                    <Text
                        fontSize={{ base: "20px", md: "30px" }}
                        pb={3}
                        px={2}
                        w={"100%"}
                        fontFamily={"work sans"}
                        display={"flex"}
                        justifyContent={{ base: "space-between" }}
                        alignItems={"center"}
                    >
                        <IconButton
                            display={{ base: "flex", md: "none" }}
                            icon={<ArrowBackIcon />}
                            onClick={() => setSelectedChat("")}
                        />
                        {!selectedChat.isGroupChat && !selectedChat.isCommunity ? (
                            <>
                                {getSender(user, selectedChat.users)}
                                <ProfileModel user={getSenderFull(user, selectedChat.users)} />
                            </>
                        ) : (
                            <>
                                {selectedChat.chatName.toUpperCase()}
                                <UpdateGroupChatModal fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} fetchMessages={fetchMessages} />
                            </>
                        )}
                    </Text>
                    <Box
                        display={"flex"}
                        flexDir={"column"}
                        justifyContent={"flex-end"}
                        p={3}
                        bg={"#E8E8E8"}
                        w={"100%"}
                        h={"100%"}
                        borderRadius={"lg"}
                        overflowY={"hidden"}
                    >
                        {loading ? (
                            <Spinner
                                size={"xl"}
                                w={20}
                                h={20}
                                alignSelf={"center"}
                                margin={"auto"}
                            />
                        ) : (
                                    <ScrollableChat messages={messages} />
                        )}

                        {!selectedChat.isCommunity ? 
                        ( <FormControl
                            onKeyDown={sendMessage}
                            isRequired
                            mt={3}
                        >
                            {istyping ? (
                                <div className='typing' style={{ width: "5rem", borderRadius: "10px", marginBottom: "10px", backgroundColor: "#dedede", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                    Typing <div className="dot" />
                                        <div className="dot" />
                                        <div className="dot" />
                                </div>
                            ) : (
                                <></>
                            )}
                            <Input variant={"filled"} bg={"#fff"} placeholder='Enter a Message' onChange={typingHandler} value={newMessage} />
                        </FormControl> ) : ( <FormControl
                            onKeyDown={sendMessage}
                            isRequired
                            mt={3}
                        >
                            {istyping ? (
                                <div className='typing' style={{ width: "5rem", borderRadius: "10px", marginBottom: "10px", backgroundColor: "#dedede", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                    Typing <div className="dot" />
                                        <div className="dot" />
                                        <div className="dot" />
                                </div>
                            ) : (
                                <></>
                            )}
                            <Input variant={"filled"} bg={"#fff"} disabled={selectedChat.groupAdmin._id !== user._id} placeholder='Enter a Message' onChange={typingHandler} value={newMessage} />
                        </FormControl> )
                        }
                    </Box>
                </>
            ) : (
                <Box
                    display={"flex"}
                    alignItems={"center"}
                    justifyContent={"center"}
                    h={"100%"}
                >
                    <Text
                        fontSize={"3xl"}
                        pb={3}
                        fontFamily={"Work sans"}
                    >
                        Click on a User to start Chatting
                    </Text>
                </Box>
            )}
        </>
    )
}

export default SingleChat