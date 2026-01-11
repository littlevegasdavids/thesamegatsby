import { Flex, SimpleGrid } from "@chakra-ui/react";
import MusicBox from "./MusicBox";
import { songs } from "../../songs";
import { AudioProvider } from "./AudioProvier";

const MusicContent = () => {
  return (
    <SimpleGrid columns={[1, 2]} gap={[3, 5]} justifyContent="center" w="100%">
      <AudioProvider>
        {songs.map((song) => (
          <MusicBox key={song.id} {...song} />
        ))}
      </AudioProvider>
    </SimpleGrid>
  );
};

export default MusicContent;
