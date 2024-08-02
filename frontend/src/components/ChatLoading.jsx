import { Skeleton, Stack } from '@chakra-ui/react'
import React from 'react'

const ChatLoading = () => {
    return (
        <Stack>
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
            <Skeleton h={"45px"} />
        </Stack>
    )
}

export default ChatLoading