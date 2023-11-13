import {
  TabPanel,
  VStack,
} from "@chakra-ui/react";
import LeagueOfLegendsBox from "./league-of-legends";
import RIC from "./ric";
import ShopEmporium from "./shop-emporium";

const SoftwareTab = () => {
  return (
    <TabPanel>
      <VStack gap={5}>
        <LeagueOfLegendsBox />
        <RIC />
        <ShopEmporium />
      </VStack>
    </TabPanel>
  );
};

export default SoftwareTab;
