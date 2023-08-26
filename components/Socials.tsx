import { Flex, Icon } from "@chakra-ui/react";
import {
  InstagramLogo,
  YoutubeLogo,
  SoundcloudLogo,
  GithubLogo,
} from "@phosphor-icons/react";

export default function Socials() {
  return (
    <Flex gap={3}>
      <a href="https://www.instagram.com/thesamegatsby" target="_blank">
        <Icon
          as={InstagramLogo}
          boxSize={10}
          bg="white"
          textColor="black"
          rounded="lg"
        />
      </a>
      <a href="https://www.youtube.com/@thesamegatsby" target="_blank">
        <Icon
          as={YoutubeLogo}
          boxSize={10}
          bg="white"
          textColor="black"
          rounded="lg"
        />
      </a>
      <a href="https://soundcloud.com/dejagatsby" target="_blank">
        <Icon
          as={SoundcloudLogo}
          boxSize={10}
          bg="white"
          textColor="black"
          rounded="lg"
        />
      </a>
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
    </Flex>
  );
}
