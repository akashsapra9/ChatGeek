import { Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, VStack, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import React from 'react'
import axios from 'axios';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { CryptoUtils } from '../../utils/cryptoUtils';

const Signup = () => {

    const [show, setShow] = useState(false);
    const [confirmShow, setConfirmShow] = useState(false);
    const [userId, setUserId] = useState();
    const [displayName, setDisplayName] = useState();
    const [password, setPassword] = useState();
    const [confirmPassword, setConfirmPassword] = useState();
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const history = useHistory();

    const submitHandler = async () => {
        setLoading(true);
        if (!userId || !displayName || !password || !confirmPassword) {
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

        if (password !== confirmPassword) {
            toast({
                title: "Passwords Do Not Match!",
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

            console.log("🔑 Generating RSA-4096 key pair...");
            
            // Generate RSA-4096 key pair
            const keyPair = await CryptoUtils.generateKeyPair();
            console.log("✅ Key pair generated");

            // Generate PAKE verifier
            const pakeVerifier = CryptoUtils.generatePakeVerifier(password);
            console.log("✅ PAKE verifier generated");

            // Encrypt private key with user's password
            const encryptedPrivateKey = CryptoUtils.encryptPrivateKey(keyPair.privateKey, password);
            console.log("✅ Private key encrypted");

            const { data } = await axios.post("/api/user/register",
                {
                    user_id: userId,
                    pubkey: keyPair.publicKey,  // Actual RSA-4096 public key
                    privkey_store: encryptedPrivateKey,  // Encrypted private key
                    pake_password: pakeVerifier,  // PAKE verifier
                    meta: {
                        display_name: displayName
                    }
                },
                config
            );
            
            // Store the decrypted private key temporarily in localStorage for immediate use
            // In production, you'd decrypt it only when needed and store in memory
            const userInfo = {
                ...data.user,
                privateKey: keyPair.privateKey  // Store decrypted private key temporarily
            };
            
            toast({
                title: "Registration Successful!",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });

            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            setLoading(false);
            history.push("/chats")
        }
        catch (error) {
            console.error("❌ Registration error:", error);
            toast({
                title: "Error Occurred!",
                description: error.response?.data?.message || "Registration failed",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setLoading(false);
        }
    }

    const handleClick = () => setShow(!show);
    const ConfirmhandleClick = () => setConfirmShow(!confirmShow);

    return (
        <VStack spacing={'5px'} color={"black"}>

            <FormControl id='userId' isRequired>
                <FormLabel>
                    User ID
                </FormLabel>
                <Input
                    placeholder='Enter your User ID'
                    onChange={(e) => setUserId(e.target.value)}
                    value={userId}
                />
            </FormControl>

            <FormControl id='displayName' isRequired>
                <FormLabel>
                    Display Name
                </FormLabel>
                <Input
                    placeholder='Enter your display name'
                    onChange={(e) => setDisplayName(e.target.value)}
                    value={displayName}
                />
            </FormControl>

            <FormControl id='password' isRequired>
                <FormLabel>
                    Password
                </FormLabel>
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

            <FormControl id='confirmPassword' isRequired>
                <FormLabel>
                    Confirm Password
                </FormLabel>
                <InputGroup>
                    <Input
                        type={confirmShow ? "text" : "password"}
                        placeholder='Confirm your password'
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        value={confirmPassword}
                    />
                    <InputRightElement width={"4.5rem"}>
                        <Button h={"1.5rem"} w={"3rem"} size={"sm"} onClick={ConfirmhandleClick}>
                            {confirmShow ? "Hide" : "Show"}
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
                Sign Up
            </Button>

        </VStack>
    )
}

export default Signup;