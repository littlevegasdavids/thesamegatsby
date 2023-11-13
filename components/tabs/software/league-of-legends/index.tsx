import { Box, Flex, Button, Icon, Text } from "@chakra-ui/react";
import { GithubLogo, Link } from "@phosphor-icons/react";
import Image from "next/image";

const LeagueOfLegendsBox = () => {
  return (
    <Box bg="white" rounded="xl" textColor="black" p={3} w="100%">
      <Flex direction="row" justifyContent="center" alignItems="center" gap={3}>
        <Box width="10%" maxW="400px" aspectRatio={1 / 1} position="relative">
          <Image
            src="/software/leagueIcon.png"
            alt="League Icon"
            layout="fill"
          />
        </Box>

        <Flex
          gap={3}
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <Text as="b" fontSize="md">
            League Of Legends Champions (2023)
          </Text>
        </Flex>
      </Flex>
      <Flex justifyContent="center" mt={3} gap={5} direction="column">
        <Text fontSize="sm" fontStyle="italic">
          A simple single page application where a user can look at a list of
          different League Of Legends Champions and see all the relevant
          information, stats and lore about each Champion.
        </Text>
        <Flex justifyContent="center" gap={3}>
          <a
            href="https://league-of-legends-champions-one.vercel.app/"
            target="_blank"
          >
            <Button bg="black" textColor="white">
              <Icon as={Link} mr={2} />
              Demo
            </Button>
          </a>
          <a
            href="https://github.com/littlevegasdavids/league-of-legends-champions"
            target="_blank"
          >
            <Button bg="black" textColor="white">
              <Icon as={GithubLogo} textColor="white" mr={2} />
              Github
            </Button>
          </a>
        </Flex>
      </Flex>
    </Box>
  );
};

export default LeagueOfLegendsBox;
