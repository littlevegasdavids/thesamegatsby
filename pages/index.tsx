import { Box, Flex, Text } from "@chakra-ui/react";
import type { NextPage } from "next";
import Image from "next/image";
import Socials from "../components/socials";
import MusicContent from "../components/music";

const Home: NextPage = () => {
  return (
    <Flex minH="100vh" alignItems="center" justifyContent="center" m={[3, 0]}>
      <Box
        p={2}
        rounded="lg"
        className="CardBorder"
        shadow="2xl"
        textColor="white"
        textAlign="center"
        minW={["95%", "35%"]}
        my={5}
      >
        <Box bg="black" px={["3", "10"]} py="3" rounded="lg">
          <Flex
            flexDirection="column"
            gap={3}
            placeItems="center"
            fontSize={["sm", "xl"]}
          >
            <Image
              src="/profile_pic.jpg"
              alt="profile picture"
              width={"200"}
              height={200}
            />
            <Box>
              <Text as="b" fontStyle="" fontSize={["xl", "3xl"]}>
                Déjà Gatsby
              </Text>
              <Text fontSize="lg" fontWeight="light">South Africa</Text>
              <Text fontSize="md" fontWeight="light">thesamegatsby@gmail.com</Text>
            </Box>

            <Socials />
            <MusicContent />
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

export default Home;
