import {
  Avatar,
  Box,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  GithubLogo,
  InstagramLogo,
  SoundcloudLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import type { NextPage } from "next";
import Image from "next/image";

const Home: NextPage = () => {
  return (
    <Flex height="100vh" alignItems="center" justifyContent="center" m={[3, 0]}>
      <Box p={2} rounded="lg" className="CardBorder" shadow="2xl" textColor="white" textAlign="center">
        <Box
          bg="black"
          px={["3", "10"]}
          py="3"
          rounded="lg"
        >
          <Flex
            flexDirection="column"
            gap={5}
            placeItems="center"
            fontSize={["sm", "xl"]}
          >
            <Image
              src="/Profile.jpeg"
              alt="profile picture"
              width={400}
              height={60}
            />
            <Text as="b" fontSize={["xl","3xl"]} mt="-10">THE SAME GATSBY</Text>
            <Flex flexDirection="column" gap={0}>
              <Text>Music | Alter Ego | Software</Text>
              <Text>Cape Town, South Africa</Text>
              <Text as="b">Under Construction: Coming Soon</Text>
            </Flex>
            <Flex gap={3}>
              <a href="https://www.instagram.com/thesamegatsby" target="_blank">
                <Icon
                  as={InstagramLogo}
                  boxSize={10}
                  bg="white"
                  textColor="black"
                  rounded="lg"
                />
              </a>
              <a href="https://www.youtube.com/@thesamegatsby" target="_blank">
                <Icon
                  as={YoutubeLogo}
                  boxSize={10}
                  bg="white"
                  textColor="black"
                  rounded="lg"
                />
              </a>
              <a href="https://soundcloud.com/dejagatsby" target="_blank">
                <Icon
                  as={SoundcloudLogo}
                  boxSize={10}
                  bg="white"
                  textColor="black"
                  rounded="lg"
                />
              </a>
              <a href="https://github.com/littlevegasdavids/littlevegasdavids" target="_blank">
                <Icon
                  as={GithubLogo}
                  boxSize={10}
                  bg="white"
                  textColor="black"
                  rounded="lg"
                />
              </a>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

export default Home;
