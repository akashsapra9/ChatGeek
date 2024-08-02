import React, { useEffect } from 'react'
import { Box, Container, Text } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import Login from '../components/Authentication/Login'
import Signup from '../components/Authentication/Signup'
import { useHistory } from 'react-router-dom'


const HomePage = () => {

    const history = useHistory();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("userInfo"));
        if(user)
        {
            history.push("/chats")
        }
    }, [history]);

    return (
        <Container maxW='xl' centerContent mb={"2rem"}>
            <Box display="flex" justifyContent="center" p={3} bg={"transparent"} w="100%" m="40px 0 15px 0" borderRadius="lg" borderWidth="1px" style={{ border: "none"}} >
                <Text fontSize="4xl" fontFamily="Work sans" color="white" fontWeight={"extrabold"}>
                    ChatGeek
                </Text>
            </Box>

            <Box display="flex" bg={"white"} w={"100%"} p={4} borderRadius={'lg'} borderWidth={'1px'} justifyContent="Center">
                <Tabs variant='soft-rounded' colorScheme='cyan' color={"black"} width={"100%"}>
                    <TabList mb={"1em"}>
                        <Tab width={'50%'}>Login</Tab>
                        <Tab width={'50%'}>Signup</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            <Login/>
                        </TabPanel>
                        <TabPanel>
                            <Signup/>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>
        </Container>
    )
}

export default HomePage