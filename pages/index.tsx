import {
  Box,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import type { NextPage } from "next";
import Image from "next/image";

const Home: NextPage = () => {
  return (
    <Flex height="100vh" alignItems="center" justifyContent="center" m={[3, 0]}>
      <Box
        p={2}
        rounded="lg"
        className="CardBorder"
        shadow="2xl"
        textColor="white"
        textAlign="center"
      >
        <Box bg="black" px={["3", "10"]} py="3" rounded="lg">
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
            <Text as="b" fontSize={["xl", "3xl"]} mt="-10">
              THE SAME GATSBY
            </Text>
            <Tabs isFitted variant="unstyled" w="100%">
              <TabList>
                <Tab _selected={{ color: "black", bg: "white" }}>Music</Tab>
                <Tab _selected={{ color: "black", bg: "white" }}>Software</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Tabs isFitted align="center" variant="unstyled">
                    <TabList>
                      <Tab _selected={{ color: "black", bg: "white" }}>Songs</Tab>
                      <Tab _selected={{ color: "black", bg: "white" }}>Mixes</Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel>
                        <p>Here are my songs</p>
                      </TabPanel>
                      <TabPanel>
                        <p>Here are my mixes</p>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </TabPanel>
                <TabPanel>
                  <p>Software Tab</p>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

export default Home;
