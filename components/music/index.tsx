import { Flex } from "@chakra-ui/react";
import MusicBox from "./MusicBox";
import { songs } from "../../songs";
import { AudioProvider } from "./AudioProvier";

const MusicContent = () => {
  return (
    <Flex direction={"column"} gap={3} justifyContent="center" w="100%">
      <AudioProvider>
        {songs.map((song) => (
          <MusicBox key={song.id} {...song} />
        ))}
      </AudioProvider>
    </Flex>
  );
};

export default MusicContent;
