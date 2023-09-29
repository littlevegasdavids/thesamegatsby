import {
  Box,
  Button,
  Flex,
  Icon,
  TabPanel,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  InstagramLogo,
  YoutubeLogo,
  SoundcloudLogo,
  TiktokLogo,
  GithubLogo,
  SpotifyLogo,
  AppleLogo,
  Play,
} from "@phosphor-icons/react";
import Image from "next/image";

const MusicTab = () => {
  return (
    <TabPanel>
      <Box bg="white" rounded="xl" textColor="black" p={3} w="100%">
        <Flex
          direction="row"
          justifyContent="center"
          alignItems="center"
          gap={3}
        >
          <Image
            src="/music/bring_that_change.svg"
            alt="bring that change image"
            width={200}
            height={60}
          />
          <Flex
            gap={3}
            direction="column"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="b">Bring that change</Text>
            <Flex gap={3}>
              <Tooltip placement="top" hasArrow label="Spotify">
                <a
                  href="https://open.spotify.com/track/09QlqIRHu7X9DmGK0vdDvQ?si=2ca9d27a5ef949a5"
                  target="_blank"
                >
                  <Icon
                    as={SpotifyLogo}
                    boxSize={8}
                    bg="white"
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>

              <Tooltip placement="top" hasArrow label="Apple Music">
                <a href="https://music.apple.com/za/album/bring-that-change/1708120323?i=1708120324" target="_blank">
                  <Icon
                    as={AppleLogo}
                    boxSize={8}
                    bg="white"
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>

              <Tooltip placement="top" hasArrow label="Youtube Music">
                <a
                  href="https://www.youtube.com/watch?v=aZ5cKAAMU2U"
                  target="_blank"
                >
                  <Icon
                    as={YoutubeLogo}
                    boxSize={8}
                    bg="white"
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>

              <Tooltip placement="top" hasArrow label="Soundcloud">
                <a href="https://soundcloud.com/dejagatsby/bring-that-change" target="_blank">
                  <Icon
                    as={SoundcloudLogo}
                    boxSize={8}
                    bg="white"
                    textColor="black"
                    rounded="lg"
                  />
                </a>
              </Tooltip>
            </Flex>
            <a
              href="https://www.youtube.com/watch?v=aZ5cKAAMU2U"
              target="_blank"
            >
              <Button bg="black" textColor="white">
                <Icon as={Play} mr={2} />
                Play
              </Button>
            </a>
          </Flex>
        </Flex>
      </Box>
    </TabPanel>
  );
};

export default MusicTab;
