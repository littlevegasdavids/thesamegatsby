import { Box, Text, Flex, Tooltip, Icon, Button, Image, AspectRatio } from "@chakra-ui/react";
import { FC } from "react";
import { Song } from "../../songs";
import { useAudioPlayer } from "./AudioProvier";
import {
  FaPlay,
  FaStop,
  FaSpotify,
  FaApple,
  FaYoutube,
  FaSoundcloud,
} from "react-icons/fa";
import { IconType } from "react-icons";

const MusicBox: FC<Song> = ({
  title,
  spotifyLink,
  appleMusicLink,
  youtubeLink,
  soundcloudLink,
  imgSrc,
  audioSrc,
}) => {
  const { play, stop, isPlaying, currentSrc } = useAudioPlayer();

  const isPlayingAudio = isPlaying && currentSrc === audioSrc;

  return (
    <Box bg={"white"} rounded="xl" textColor="black" p={3} w="100%">
      <Flex direction="row" justifyContent="center" alignItems="center" gap={3}>
        <AspectRatio
          ratio={1}
          width="100%"
          maxW={{ base: "150px", sm: "220px", md: "320px", lg: "170px" }}
        >
          <Image
            src={imgSrc}
            alt={`${title}-image`}
            objectFit="cover"
            width="100%"
            height="100%"
            borderRadius="md"
            loading="lazy"
            display="block"
          />
        </AspectRatio>
        <Flex
          gap={4}
          direction="column"
          justifyContent="center"
          alignItems="center"
        >
          <Text as="b" fontSize={["md", "lg"]}>{title}</Text>
          <Flex gap={5}>
            {spotifyLink !== "" && (
              <StreamingIcon
                icon={FaSpotify}
                link={spotifyLink}
                label="Spotify"
              />
            )}

            {appleMusicLink !== "" && (
              <StreamingIcon
                icon={FaApple}
                link={appleMusicLink}
                label="Apple Music"
              />
            )}
            {youtubeLink !== "" && (
              <StreamingIcon
                icon={FaYoutube}
                link={youtubeLink}
                label="Youtube Music"
              />
            )}
            {soundcloudLink !== "" && (
              <StreamingIcon
                icon={FaSoundcloud}
                link={soundcloudLink}
                label="Soundcloud"
              />
            )}
          </Flex>
          {audioSrc !== "" && isPlayingAudio ? (
            <>
              <Button
                bg="white"
                textColor="black"
                onClick={stop}
                border="2px solid black"
                fontWeight={"bold"}
                _hover={{
                  bg: "black",
                  textColor: "white",
                }}
              >
                <Icon as={FaStop} mr={2} />
                Stop
              </Button>
            </>
          ) : (
            <Button
              bg="black"
              textColor="white"
              onClick={() => play(audioSrc)}
              fontWeight={"bold"}
              _hover={{
                bg: "white",
                textColor: "black",
                border: "2px solid black",
              }}
            >
              <Icon as={FaPlay} mr={2} />
              Play
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

const StreamingIcon = ({
  icon,
  link,
  label,
}: {
  icon: IconType;
  link: string;
  label: "Soundcloud" | "Spotify" | "Apple Music" | "Youtube Music";
}) => {
  return (
    <Tooltip placement="top" hasArrow label={label}>
      <a href={link} target="_blank">
        <Icon
          as={icon}
          boxSize={[6, 7]}
          bg={"white"}
          textColor="black"
          rounded="full"
        />
      </a>
    </Tooltip>
  );
};

export default MusicBox;
