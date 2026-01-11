import { Flex, Tooltip, Icon } from "@chakra-ui/react";
import {
  FaGithub,
  FaInstagram,
  FaSoundcloud,
  FaTiktok,
  FaYoutube,
  FaBandcamp,
} from "react-icons/fa";

const Socials = () => {
  return (
    <Flex gap={6}>
      <Tooltip placement="top" hasArrow label="Instagram">
        <a href="https://www.instagram.com/thesamegatsby" target="_blank">
          <Icon
            as={FaInstagram}
            boxSize={10}
            bg="black"
            textColor="white"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="Youtube">
        <a href="https://www.youtube.com/@thesamegatsby" target="_blank">
          <Icon
            as={FaYoutube}
            boxSize={10}
            bg="black"
            textColor="white"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="Soundcloud">
        <a href="https://soundcloud.com/dejagatsby" target="_blank">
          <Icon
            as={FaSoundcloud}
            boxSize={10}
            bg="black"
            textColor="white"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="TikTok">
        <a href="https://www.tiktok.com/@thesamegatsby" target="_blank">
          <Icon
            as={FaTiktok}
            boxSize={10}
            bg="black"
            textColor="white"
          />
        </a>
      </Tooltip>

      <Tooltip placement="top" hasArrow label="Bandcamp">
        <a href="https://thesamegatsby.bandcamp.com" target="_blank">
          <Icon
            as={FaBandcamp}
            boxSize={10}
            bg="black"
            textColor="white"
          />
        </a>
      </Tooltip>
    </Flex>
  );
};

export default Socials;
