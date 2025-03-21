import { Flex } from "@chakra-ui/react";
import MusicBox from "./MusicBox";
import { useState } from "react";

const MusicContent = () => {
  return (
    <Flex direction={"column"} gap={3} justifyContent="center" w="100%">
      <MusicBox
        title={"Give me that KaiZen"}
        spotifyLink={
          ""
        }
        appleMusicLink={
          "https://music.apple.com/us/album/give-me-that-kaizen-single/1803499620"
        }
        youtubeLink={
          "https://www.youtube.com/watch?v=3NtCoWZeQFU&list=OLAK5uy_nxHhcOcMrBW07x7hwYzQkMBlJcqLLirHM&index=2"
        }
        soundcloudLink={
          "https://soundcloud.com/dejagatsby/sets/give-me-that-kaizen"
        }
        imgSrc={"/music/kaizen.png"}
        bg={"white"}
      />
      <MusicBox
        title={"You who could be Forever"}
        spotifyLink={
          "https://open.spotify.com/album/6KnDL1oCSeCVK7hpor4T3s?si=dLRxoji6QNSPbYS5zAEWoQ"
        }
        appleMusicLink={
          "https://music.apple.com/us/album/you-who-could-be-forever-single/1750669404"
        }
        youtubeLink={
          "https://www.youtube.com/watch?v=mqdVuGzM-1s"
        }
        soundcloudLink={
          "https://soundcloud.com/dejagatsby/you-who-could-be-forever"
        }
        imgSrc={"/music/you_who_could_be_forever.png"}
        bg={"white"}
      />
      <MusicBox
        title={"Can't You See EP"}
        spotifyLink={
          "https://open.spotify.com/album/4WiQgdIocMx6qgYSmxnTPG?si=vomvD2eSSb-3t1jN45mGIA"
        }
        appleMusicLink={
          "https://music.apple.com/za/album/cant-you-see-ep/1732276175"
        }
        youtubeLink={
          "https://www.youtube.com/watch?v=fVlgwC0v_rQ&list=OLAK5uy_mdFFNJyKEaN9sPwJeztKKdCZlV_8188k8&index=1"
        }
        soundcloudLink={
          "https://soundcloud.com/dejagatsby/sets/cant-you-see-ep/"
        }
        imgSrc={"/music/can't_you_see.png"}
        bg={"white"}
      />
      <MusicBox
        title={"Bring That Change"}
        spotifyLink={
          "https://open.spotify.com/track/09QlqIRHu7X9DmGK0vdDvQ?si=2ca9d27a5ef949a5"
        }
        appleMusicLink={
          "https://music.apple.com/za/album/bring-that-change/1708120323?i=1708120324"
        }
        youtubeLink={"https://www.youtube.com/watch?v=aZ5cKAAMU2U"}
        soundcloudLink={"https://soundcloud.com/dejagatsby/bring-that-change"}
        imgSrc={"/music/bring_that_change.svg"}
        bg={"white"}
      />
    </Flex>
  );
};

export default MusicContent;
