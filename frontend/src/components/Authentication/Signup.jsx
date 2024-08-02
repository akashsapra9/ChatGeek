import { Box, Button, FormControl, FormLabel, Img, Input, InputGroup, InputRightElement, VStack, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import React from 'react'
import axios from 'axios';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';

const Signup = () => {

    const [show, setShow] = useState(false);
    const [confirmShow, setConfirmShow] = useState(false);
    const [name, setName] = useState();
    const [email, setEmail] = useState();
    const [password, setPassword] = useState();
    const [ConfirmPassword, setConfirmPassword] = useState();
    const [pic, setPic] = useState("https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg");
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const history = useHistory();

    const postDetails = (pics) => {
        setLoading(true);

        if (pics === undefined) {
            toast({
                title: "Please Select an Image!",
                status: "warning",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            return;
        }

        if (pics.type !== "image/jpeg" && pics.type !== "image/png") {
            toast({
                title: "Please Select a JPEG or PNG Image!",
                status: "warning",
                duration: 5000,
                isClosable: true,
                position: "bottom",
            });
            setLoading(false);
            return;
        }

        if (pics.type === "image/jpeg" || pics.type === "image/png") {

            const data = new FormData()
            data.append("file", pics)
            data.append("upload_preset", "chatgeek")
            data.append("cloud_name", "dpcy2epyz")
            axios.post("https://api.cloudinary.com/v1_1/dpcy2epyz/image/upload", data)
                .then((response) => {
                    console.log("Cloudinary response:", response);
                    setPic(response.data.url.toString());
                    setLoading(false);
                    toast({
                        title: "Image uploaded successfully!",
                        status: "success",
                        duration: 5000,
                        isClosable: true,
                        position: "bottom",
                    });
                })
                .catch((error) => {
                    console.log("Cloudinary error:", error);
                    setLoading(false);
                });
        }
    }

    const submitHandler = async () => {
        setLoading(true);
        if (!name || !email || !password || !ConfirmPassword) {
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

        if (password !== ConfirmPassword) {
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
            const { data } = await axios.post("/api/user",
                { name, email, password, pic },
                config
            );
            toast({
                title: "Registeration Successful!",
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
                title: "Error Occured!",
                description: error.response.data.message,
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

            <label htmlFor='upload'>
                <Box w={"5rem"} h={"5rem"} cursor={"pointer"} >
                    <Img src={pic} alt='Image' />
                </Box>
            </label>

            <FormControl id='first-name' isRequired>
                <FormLabel>
                    Name
                </FormLabel>
                <Input
                    placeholder='Enter your name'
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                />
            </FormControl>


            <FormControl id='email' isRequired>
                <FormLabel>
                    Email
                </FormLabel>
                <Input
                    type={"email"}
                    placeholder='Enter your name'
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                />
            </FormControl>


            <FormControl id='password' isRequired>
                <FormLabel>
                    Password
                </FormLabel>
                <InputGroup>
                    <Input
                        type={show ? "text" : "password"}
                        placeholder='Enter your name'
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                    />
                    <InputRightElement width={"4.5rem"}>
                        <Button h={"1.5rem"} w={"3rem"} size={"sm"} onClick={handleClick}>
                            {show ? <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><g fill="none"><path d="M2.854 2.146a.5.5 0 1 0-.708.708l3.5 3.498a8.097 8.097 0 0 0-3.366 5.046a.5.5 0 1 0 .98.204a7.09 7.09 0 0 1 3.107-4.528L7.953 8.66a3.5 3.5 0 1 0 4.886 4.886l4.307 4.308a.5.5 0 0 0 .708-.708l-15-15zm9.265 10.68A2.5 2.5 0 1 1 8.673 9.38l3.446 3.447z" fill="currentColor" /><path d="M10.123 8.002l3.375 3.374a3.5 3.5 0 0 0-3.374-3.374z" fill="currentColor" /><path d="M10 6c-.57 0-1.129.074-1.666.213l-.803-.803A7.648 7.648 0 0 1 10 5c3.693 0 6.942 2.673 7.72 6.398a.5.5 0 0 1-.98.204C16.058 8.327 13.207 6 10 6z" fill="currentColor" /></g></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><g fill="none"><path d="M3.26 11.602C3.942 8.327 6.793 6 10 6c3.206 0 6.057 2.327 6.74 5.602a.5.5 0 0 0 .98-.204C16.943 7.673 13.693 5 10 5c-3.693 0-6.943 2.673-7.72 6.398a.5.5 0 0 0 .98.204z" fill="currentColor" /><path d="M10 8a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zm-2.5 3.5a2.5 2.5 0 1 1 5 0a2.5 2.5 0 0 1-5 0z" fill="currentColor" /></g></svg>}
                        </Button>
                    </InputRightElement>
                </InputGroup>
            </FormControl>


            <FormControl id='confirm-password' isRequired>
                <FormLabel>
                    Confirm Password
                </FormLabel>
                <InputGroup>
                    <Input
                        type={confirmShow ? "text" : "password"}
                        placeholder='Enter your name'
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        value={ConfirmPassword}
                    />
                    <InputRightElement width={"4.5rem"}>
                        <Button h={"1.5rem"} w={"3rem"} size={"sm"} onClick={ConfirmhandleClick}>
                            {confirmShow ? <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><g fill="none"><path d="M2.854 2.146a.5.5 0 1 0-.708.708l3.5 3.498a8.097 8.097 0 0 0-3.366 5.046a.5.5 0 1 0 .98.204a7.09 7.09 0 0 1 3.107-4.528L7.953 8.66a3.5 3.5 0 1 0 4.886 4.886l4.307 4.308a.5.5 0 0 0 .708-.708l-15-15zm9.265 10.68A2.5 2.5 0 1 1 8.673 9.38l3.446 3.447z" fill="currentColor" /><path d="M10.123 8.002l3.375 3.374a3.5 3.5 0 0 0-3.374-3.374z" fill="currentColor" /><path d="M10 6c-.57 0-1.129.074-1.666.213l-.803-.803A7.648 7.648 0 0 1 10 5c3.693 0 6.942 2.673 7.72 6.398a.5.5 0 0 1-.98.204C16.058 8.327 13.207 6 10 6z" fill="currentColor" /></g></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><g fill="none"><path d="M3.26 11.602C3.942 8.327 6.793 6 10 6c3.206 0 6.057 2.327 6.74 5.602a.5.5 0 0 0 .98-.204C16.943 7.673 13.693 5 10 5c-3.693 0-6.943 2.673-7.72 6.398a.5.5 0 0 0 .98.204z" fill="currentColor" /><path d="M10 8a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zm-2.5 3.5a2.5 2.5 0 1 1 5 0a2.5 2.5 0 0 1-5 0z" fill="currentColor" /></g></svg>}
                        </Button>
                    </InputRightElement>
                </InputGroup>
            </FormControl>


            <FormControl id='pic' mt={"1.5rem"}>
                <FormLabel>Upload your Picture Here</FormLabel>
                <Input
                    style={{ border: "none" }}
                    type="file"
                    p={1.5}
                    accept='image/*'
                    // value={pic}
                    onChange={(e) => postDetails(e.target.files[0])}
                    id='upload'
                />
            </FormControl>

            <Button
                colorScheme='blue'
                w={"100%"}
                style={{ marginTop: 15 }}
                onClick={submitHandler}
                isLoading={loading}
            >
                Signup
            </Button>

        </VStack>
    )
}

export default Signup;