import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Text, useDisclosure } from '@chakra-ui/react';
import { ViewIcon } from '@chakra-ui/icons';
import { IconButton } from '@chakra-ui/react';
import { Image } from '@chakra-ui/react'
import React from 'react'

const ProfileModel = ({ user, children }) => {

    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <div>
            {
                children ? (<span onClick={onOpen}>{children}</span>) : (
                    <IconButton
                        display={{ base: "flex" }}
                        icon={<ViewIcon />}
                        onClick={onOpen}
                    />
                )
            }
            <Modal isOpen={isOpen} onClose={onClose} size={"lg"} isCentered>
                <ModalOverlay />
                <ModalContent h={"410px"}>
                    <ModalHeader
                        display={"flex"}
                        fontFamily={"work sans"}
                        fontSize={"40px"}
                        justifyContent={"center"}
                    >{user.name}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody 
                    display={"flex"} 
                    flexDir={"column"}
                    alignItems={"center"}
                    justifyContent={"space-between"}
                    >
                        <Image
                            borderRadius={"full"}
                            boxSize={"150px"}
                            src={user.pic}
                            alt={user.name}
                        />
                        <Text
                            fontSize={{ base: "20px", md: "30px" }}
                            fontFamily={"work sans"}
                        >
                            Email: {user.email}
                        </Text>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme='blue' mr={3} onClick={onClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    )
}

export default ProfileModel;