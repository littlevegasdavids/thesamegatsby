import { Flex, Tooltip, Icon } from "@chakra-ui/react";
import {
  GithubLogo,
  InstagramLogo,
  SoundcloudLogo,
  TiktokLogo,
  YoutubeLogo,
  Parallelogram
} from "@phosphor-icons/react";

const Socials = () => {
  return (
    <Flex gap={4}>
      <Tooltip placement="top" hasArrow label="Instagram">
        <a href="https://www.instagram.com/thesamegatsby" target="_blank">
          <Icon
            as={InstagramLogo}
            boxSize={10}
            bg="white"
            textColor="black"
            rounded="lg"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="Youtube">
        <a href="https://www.youtube.com/@thesamegatsby" target="_blank">
          <Icon
            as={YoutubeLogo}
            boxSize={10}
            bg="white"
            textColor="black"
            rounded="lg"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="Soundcloud">
        <a href="https://soundcloud.com/dejagatsby" target="_blank">
          <Icon
            as={SoundcloudLogo}
            boxSize={10}
            bg="white"
            textColor="black"
            rounded="lg"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="TikTok">
        <a href="https://www.tiktok.com/@thesamegatsby" target="_blank">
          <Icon
            as={TiktokLogo}
            boxSize={10}
            bg="white"
            textColor="black"
            rounded="lg"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="Bandcamp">
        <a href="https://thesamegatsby.bandcamp.com" target="_blank">
          <Icon
            as={Parallelogram}
            boxSize={10}
            bg="white"
            textColor="black"
            rounded="lg"
          />
        </a>
      </Tooltip>

      {/* <Tooltip placement="top" hasArrow label="Github">
        <a
          href="https://github.com/littlevegasdavids/littlevegasdavids"
          target="_blank"
        >
          <Icon
            as={GithubLogo}
            boxSize={10}
            bg="white"
            textColor="black"
            rounded="lg"
          />
        </a>
      </Tooltip> */}
    </Flex>
  );
};

export default Socials;
