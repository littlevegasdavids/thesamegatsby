import {
  TabPanel,
  Box,
  Flex,
  Text,
  Icon,
  Button,
  VStack,
} from "@chakra-ui/react";
import { GithubLogo, Link, Play } from "@phosphor-icons/react";
import Image from "next/image";

const SoftwareTab = () => {
  return (
    <TabPanel>
      <VStack gap={5}>
        <Box bg="white" rounded="xl" textColor="black" p={3} w="100%">
          <Flex
            direction="row"
            justifyContent="center"
            alignItems="center"
            gap={3}
          >
            <Box
              width="10%"
              maxW="400px"
              aspectRatio={1 / 1}
              position="relative"
            >
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
              A simple single page application where a user can look at a list
              of different League Of Legends Champions and see all the relevant
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
        <Box bg="white" rounded="xl" textColor="black" p={3} w="100%">
          <Flex
            direction="row"
            justifyContent="center"
            alignItems="center"
            gap={3}
          >
            <Flex
              gap={3}
              direction="column"
              justifyContent="center"
              alignItems="center"
            >
              <Text as="b" fontSize="md">
                RIC BGO Tool (2022)
              </Text>
            </Flex>
          </Flex>
          <Flex justifyContent="center" mt={3} gap={5} direction="column">
            <Text fontSize="sm" fontStyle="italic">
              An online web-app in which employees and clients of RIC use as a
              central excel file repository that is uploaded and put through a
              Python script that optimises the excel values in an automated
              fashion.
            </Text>
            <Flex justifyContent="center" gap={3}>
              <a
                href="https://www.youtube.com/watch?v=Tj6P0CXBQiI&feature=youtu.be"
                target="_blank"
              >
                <Button bg="black" textColor="white">
                  <Icon as={Play} mr={2} />
                  Demo Video
                </Button>
              </a>
              <a
                href="https://github.com/littlevegasdavids/RIC-BGO-Tool"
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
        <Box bg="white" rounded="xl" textColor="black" p={3} w="100%">
          <Flex
            direction="row"
            justifyContent="center"
            alignItems="center"
            gap={3}
          >
            <Flex
              gap={3}
              direction="column"
              justifyContent="center"
              alignItems="center"
            >
              <Text as="b" fontSize="md">
                Shop Emporium (2022)
              </Text>
            </Flex>
          </Flex>
          <Flex justifyContent="center" mt={3} gap={5} direction="column">
            <Text fontSize="sm" fontStyle="italic">
              An ecommerce framework that I built from scratch during my gap year.
            </Text>
            <Flex justifyContent="center" gap={3}>
              <a
                href="https://github.com/littlevegasdavids/RIC-BGO-Tool"
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
      </VStack>
    </TabPanel>
  );
};

export default SoftwareTab;
