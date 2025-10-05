import React, { useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  VStack,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { CryptoUtils } from "../../utils/cryptoUtils";
import { ChatState } from "../../Context/chatProvider";

const Login = () => {
  const [show, setShow] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const history = useHistory();

  const { setUser, setPrivateKey } = ChatState();

  const handleClick = () => setShow(!show);

  const submitHandler = async () => {
    setLoading(true);
    console.log("[DEBUG][Login.jsx] Login started for email:", loginEmail);

    if (!loginEmail || !password) {
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
          "Content-type": "application/json",
        },
      };

      console.log("1️⃣ Sending login request to backend...");
      const { data } = await axios.post(
        "/api/user/login",
        { login_email: loginEmail, password },
        config
      );

      console.log("2️⃣ Backend response:", data);

      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }

      console.log(
        "3️⃣ Encrypted private key length:",
        data.user.privkey_store?.length
      );

      // Decrypt private key with password
      const decryptedPrivateKey = CryptoUtils.decryptPrivateKey(
        data.user.privkey_store,
        password
      );
      console.log("4️⃣ Private key decrypted successfully");

      if (!decryptedPrivateKey.includes("BEGIN RSA PRIVATE KEY")) {
        console.warn("⚠️ Decrypted key doesn't look like a valid RSA private key");
      }

      // ✅ store decrypted key only in memory
      setPrivateKey(decryptedPrivateKey);

      // ✅ store non-sensitive info only in localStorage
      localStorage.setItem("userInfo", JSON.stringify(data.user));
      setUser(data.user);

      toast({
        title: "Login Successful!",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });

      setLoading(false);
      history.push("/chats");
    } catch (error) {
      console.error("❌ Login error:", error);
      const msg =
        error.response?.data?.error || error.message || "Login failed";

      toast({
        title: "Error Occurred!",
        description: msg,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  return (
    <VStack spacing="5px" color="black">
      <FormControl id="loginEmail" isRequired>
        <FormLabel>Email</FormLabel>
        <Input
          placeholder="Enter your email"
          onChange={(e) => setLoginEmail(e.target.value)}
          value={loginEmail}
        />
      </FormControl>

      <FormControl id="password" isRequired>
        <FormLabel>Password</FormLabel>
        <InputGroup>
          <Input
            type={show ? "text" : "password"}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.5rem" w="3rem" size="sm" onClick={handleClick}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        colorScheme="blue"
        w="100%"
        mt={4}
        onClick={submitHandler}
        isLoading={loading}
      >
        Login
      </Button>
    </VStack>
  );
};

export default Login;
