import { Box, Text, Flex, Tooltip, Icon, Button } from "@chakra-ui/react";
import {
  SpotifyLogo,
  AppleLogo,
  YoutubeLogo,
  SoundcloudLogo,
  Play,
} from "@phosphor-icons/react";
import { FC } from "react";
import Image from "next/image";
import { Song } from "../../songs";

interface MusicBoxProps {
  title: string;
  spotifyLink: string;
  appleMusicLink: string;
  youtubeLink: string;
  soundcloudLink: string;
  imgSrc: string;
}

const MusicBox: FC<Song> = ({
  title,
  spotifyLink,
  appleMusicLink,
  youtubeLink,
  soundcloudLink,
  imgSrc,
}) => {
  return (
    <Box bg={"white"} rounded="xl" textColor="black" p={3} w="100%">
      <Flex direction="row" justifyContent="center" alignItems="center" gap={3}>
        <Box width="100%" maxW="400px" aspectRatio={1 / 1} position="relative">
          <Image src={imgSrc} alt={`${title}-image`} layout="fill" />
        </Box>
        <Flex
          gap={3}
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <Text as="b">{title}</Text>
          <Flex gap={3}>
            {spotifyLink !== "" && (
              <Tooltip placement="top" hasArrow label="Spotify">
                <a href={spotifyLink} target="_blank">
                  <Icon
                    as={SpotifyLogo}
                    boxSize={8}
                    bg={"white"}
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>
            )}

            {appleMusicLink !== "" && (
              <Tooltip placement="top" hasArrow label="Apple Music">
                <a href={appleMusicLink} target="_blank">
                  <Icon
                    as={AppleLogo}
                    boxSize={8}
                    bg={"white"}
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>
            )}
            {youtubeLink !== "" && (
              <Tooltip placement="top" hasArrow label="Youtube Music">
                <a href={youtubeLink} target="_blank">
                  <Icon
                    as={YoutubeLogo}
                    boxSize={8}
                    bg={"white"}
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>
            )}
            {soundcloudLink !== "" && (
              <Tooltip placement="top" hasArrow label="Soundcloud">
                <a href={soundcloudLink} target="_blank">
                  <Icon
                    as={SoundcloudLogo}
                    boxSize={8}
                    bg={"white"}
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>
            )}
          </Flex>
          <a href={youtubeLink} target="_blank">
            <Button bg="black" textColor="white">
              <Icon as={Play} mr={2} />
              Play
            </Button>
          </a>
        </Flex>
      </Flex>
    </Box>
  );
};

export default MusicBox;
