import { Box, Text, Flex, Button, Icon } from "@chakra-ui/react";
import { GithubLogo } from "@phosphor-icons/react";

const ShopEmporium = () => {
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
  );
};

export default ShopEmporium
