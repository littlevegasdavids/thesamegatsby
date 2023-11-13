import { Box, Button, Flex, Icon, Text } from "@chakra-ui/react";
import { Play, GithubLogo } from "@phosphor-icons/react";

const RIC = () => {
  return (
    <Box bg="white" rounded="xl" textColor="black" p={3} w="100%">
      <Flex direction="row" justifyContent="center" alignItems="center" gap={3}>
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
          Python script that optimises the excel values in an automated fashion.
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
  );
};

export default RIC;
