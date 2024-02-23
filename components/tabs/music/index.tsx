import { Flex } from "@chakra-ui/react";
import MusicBox from "./MusicBox";
import { useState } from "react";

const MusicContent = () => {
  return (
    <Flex direction={"column"} gap={3} justifyContent="center" w="100%">
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
