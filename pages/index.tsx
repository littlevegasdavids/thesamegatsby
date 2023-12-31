import {
  Box,
  Flex,
  Text,
} from "@chakra-ui/react";

import type { NextPage } from "next";
import Image from "next/image";
import Socials from "../components/socials";
import TabsContent from "../components/tabs";

const Home: NextPage = () => {
  return (
    <Flex minH="100vh" alignItems="center" justifyContent="center" m={[3, 0]} py="5">
      <Box
        p={2}
        rounded="lg"
        className="CardBorder"
        shadow="2xl"
        textColor="white"
        textAlign="center"
        maxW="500px"
      >
        <Box bg="black" px={["3", "10"]} py="3" rounded="lg">
          <Flex
            flexDirection="column"
            gap={3}
            placeItems="center"
            fontSize={["sm", "xl"]}
          >
            <Image
              src="/Profile.jpeg"
              alt="profile picture"
              width={400}
              height={60}
            />
            <Text as="b" fontSize={["xl", "3xl"]} mt="-10">
              THE SAME GATSBY
            </Text>
            <Text>Cape Town, South Africa</Text>  
            <Socials />
            <TabsContent />
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

export default Home;
