import React from 'react'
import { Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, VStack, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { CryptoUtils } from '../../utils/cryptoUtils';
import { srpLogin } from '../../utils/srp_login';

const Login = () => {
    
    const [show, setShow] = useState(false)
    const [userId, setUserId] = useState()
    const [password, setPassword] = useState()
    const [loading, setLoading] = useState(false)
    const toast = useToast();
    const history = useHistory();
    
    const handleClick = () => setShow(!show);
    
    const submitHandler = async() => { 
        setLoading(true);
        console.log("🚀 Login started for user:", userId);
        
        if(!userId || !password) {
            toast({
                title: "Please fill all the fields!",
                status: "warning",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setLoading(false);
            return;
        }
        
        try {
            // --- SRP 6a Handshake ---
            console.log("1. Starting SRP-6a handshake…");
            const { session_id, expires, K } = await srpLogin({
                baseUrl: process.env.REACT_APP_API_BASE_URL || '',
                user_id: userId,
                password,
            });
            console.log("2. SRP OK. session_id:", session_id, "expires:", expires);

            sessionStorage.setItem('session_id', session_id);
            sessionStorage.setItem('session_expires', String(expires));
            
            // Send the session with every axios request from now on
            axios.defaults.headers.common['x-session-id'] = session_id;

            // Keep the link key in memory only
            window.__LINK_KEY__ = K;

            // --- Fetch user record using the session ---
            const config = {
                headers: {
                    "Content-type": "application/json",
                    "x-session-id": session_id,
                },
            };
            console.log("3. Fetching user profile via session…");
            const { data } = await axios.get("/api/user/me", config);

            if (!data?.user) {
                throw new Error("User profile not found");
            }

            console.log("4. User profile received, encrypted private key length:", data.user.privkey_store?.length);
            console.log("5. Attempting to decrypt private key...");

            const decryptedPrivateKey = CryptoUtils.decryptPrivateKey(
                data.user.privkey_store, 
                password
            );

            console.log("6. Private key decrypted successfully");
            console.log("7. Decrypted key starts with:", decryptedPrivateKey.substring(0, 50));

            if (!decryptedPrivateKey.includes('BEGIN RSA PRIVATE KEY')) {
                console.warn("⚠️ Decrypted key doesn't look like a valid RSA private key");
            }

            // Safer: keep the decrypted key only in memory
            window.__PRIVATE_KEY__ = decryptedPrivateKey;

            const userInfo = {
                ...data.user,
                // If you absolutely must persist the key, uncomment next line (discouraged):
                // privateKey: decryptedPrivateKey,
            };

            console.log("8. Storing user info (without private key) in localStorage...");
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            toast({
                title: "Login Successful!",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });

            setLoading(false);
            history.push("/chats");
            
        } catch(error) {
            console.error("❌ Login error details:", error);
            console.error("❌ Error response:", error.response?.data);
            
            let errorMessage = "Login failed";
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({
                title: "Error Occurred!",
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setLoading(false);
        }
    }

    return (
        <VStack spacing={'5px'} color={"black"}>

        <FormControl id='userId' isRequired>
            <FormLabel>User ID</FormLabel>
            <Input
                placeholder='Enter your User ID'
                onChange={(e) => setUserId(e.target.value)}
                value={userId}
            />
        </FormControl>

        <FormControl id='password' isRequired>
            <FormLabel>Password</FormLabel>
            <InputGroup>
                <Input
                    type={show ? "text" : "password"}
                    placeholder='Enter your password'
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                />
                <InputRightElement width={"4.5rem"}>
                    <Button h={"1.5rem"} w={"3rem"} size={"sm"} onClick={handleClick}>
                        {show ? "Hide" : "Show"}
                    </Button>
                </InputRightElement>
            </InputGroup>
        </FormControl>

        <Button
            colorScheme='blue'
            w={"100%"}
            style={{ marginTop: 15 }}
            onClick={submitHandler}
            isLoading={loading}
        >
            Login
        </Button>

        </VStack>
    )
}

export default Login;
