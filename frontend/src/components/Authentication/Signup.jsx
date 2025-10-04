import { Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, VStack, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import React from 'react'
import axios from 'axios';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';

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

            // SOCP: Generate cryptographic keys on client side
            // For now, we'll use placeholder keys - in production, generate real RSA-4096 keys
            const placeholderKeys = {
                pubkey: `placeholder_public_key_${userId}_${Date.now()}`,
                privkey_store: `placeholder_encrypted_private_key_${userId}_${Date.now()}`,
                pake_verifier: `placeholder_pake_verifier_${userId}_${Date.now()}`
            };

            const { data } = await axios.post("/api/user/register",
                {
                    user_id: userId,
                    pubkey: placeholderKeys.pubkey,
                    privkey_store: placeholderKeys.privkey_store,
                    pake_password: placeholderKeys.pake_verifier,
                    meta: {
                        display_name: displayName
                        // SOCP: Only allowed meta fields are display_name, pronouns, age, avatar_url, extras
                        // No picture upload - avatar_url would be a URL string if provided
                    }
                },
                config
            );
            
            toast({
                title: "Registration Successful!",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });

            localStorage.setItem('userInfo', JSON.stringify(data));
            setLoading(false);
            history.push("/chats")
        }
        catch (error) {
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
                    placeholder='Enter your User ID (UUID format recommended)'
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