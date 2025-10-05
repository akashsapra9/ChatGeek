import React from 'react'
import { Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, VStack, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { CryptoUtils } from '../../utils/cryptoUtils';

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
            const config = {
                headers: {
                    "Content-type": "application/json"
                },
            };
            
            console.log("1. Sending login request to backend...");
            
            // First, get user data including encrypted private key
            const { data } = await axios.post("/api/user/login",
            { user_id: userId, password },
            config
            );

            console.log("2. Backend response:", data);

            if (!data.success) {
                throw new Error(data.error || "Login failed");
            }

            console.log("3. User data received, encrypted private key length:", data.user.privkey_store?.length);
            console.log("4. Attempting to decrypt private key...");

            // Decrypt the private key with the password
            const decryptedPrivateKey = CryptoUtils.decryptPrivateKey(
                data.user.privkey_store, 
                password
            );

            console.log("5. Private key decrypted successfully");
            console.log("6. Decrypted key starts with:", decryptedPrivateKey.substring(0, 50));

            // Verify this looks like a valid private key
            if (!decryptedPrivateKey.includes('BEGIN RSA PRIVATE KEY')) {
                console.warn("⚠️ Decrypted key doesn't look like a valid RSA private key");
            }

            // Store user info with decrypted private key
            const userInfo = {
                ...data.user,
                privateKey: decryptedPrivateKey
            };

            console.log("7. Storing user info in localStorage...");
            
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