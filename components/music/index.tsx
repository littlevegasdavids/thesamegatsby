import { Flex } from "@chakra-ui/react";
import MusicBox from "./MusicBox";
import { songs } from "../../songs";

const MusicContent = () => {
  return (
    <Flex direction={"column"} gap={3} justifyContent="center" w="100%">
      {songs.map((song) => (
        <MusicBox key={song.title} {...song} />
      ))}
    </Flex>
  );
};

export default MusicContent;
