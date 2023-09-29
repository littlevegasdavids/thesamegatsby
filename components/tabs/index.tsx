import { Tab, TabList, TabPanels, Tabs, TabPanel } from "@chakra-ui/react";
import MusicTab from "./music";
import VideoTab from "./videos";
import SoftwareTab from "./software";

const TabsContent = () => {
  return (
    <Tabs isFitted variant="unstyled" w="100%">
      <TabList>
        <Tab _selected={{ color: "black", bg: "white" }}>Music</Tab>
        <Tab _selected={{ color: "black", bg: "white" }}>Videos</Tab>
        <Tab _selected={{ color: "black", bg: "white" }}>Software</Tab>
      </TabList>
      <TabPanels>
        <MusicTab />
        <VideoTab />
        <SoftwareTab />
      </TabPanels>
    </Tabs>
  );
};

export default TabsContent;
