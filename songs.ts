export interface Song {
  id: number;
  title: string;
  spotifyLink: string;
  appleMusicLink: string;
  youtubeLink: string;
  soundcloudLink: string;
  imgSrc: string;
  audioSrc: string;
}

export const songs: Song[] = [
  {
    id: 6,
    title: "Welcome to Vapor_City",
    spotifyLink:
      "https://open.spotify.com/track/5Shwkb85VSY33QZqMDQaqo?si=488bbdd9ee434b68",
    appleMusicLink:
      "https://music.apple.com/us/album/welcome-to-vapor-city-single/1845517676",
    youtubeLink: "https://www.youtube.com/watch?v=e-12woa2MTU",
    soundcloudLink: "https://soundcloud.com/dejagatsby/welcome-to-vapor_city",
    imgSrc: "/music/vapor_city/cover.png",
    audioSrc: "/music/vapor_city/audio.m4a",
  },
  {
    id: 5,
    title: "Give me that KaiZen",
    spotifyLink:
      "https://open.spotify.com/album/0ATTxFkDlXZgVnoXe5zQiB?si=wFosTC3rSgOVupKkE4b_FQ",
    appleMusicLink:
      "https://music.apple.com/us/album/give-me-that-kaizen-single/1803499620",
    youtubeLink:
      "https://www.youtube.com/watch?v=3NtCoWZeQFU&list=OLAK5uy_nxHhcOcMrBW07x7hwYzQkMBlJcqLLirHM&index=2",
    soundcloudLink:
      "https://soundcloud.com/dejagatsby/sets/give-me-that-kaizen",
    imgSrc: "/music/kaizen/cover.png",
    audioSrc: "/music/kaizen/audio.m4a",
  },
  {
    id: 4,
    title: "You who could be Forever",
    spotifyLink:
      "https://open.spotify.com/album/6KnDL1oCSeCVK7hpor4T3s?si=dLRxoji6QNSPbYS5zAEWoQ",
    appleMusicLink:
      "https://music.apple.com/us/album/you-who-could-be-forever-single/1750669404",
    youtubeLink: "https://www.youtube.com/watch?v=mqdVuGzM-1s",
    soundcloudLink:
      "https://soundcloud.com/dejagatsby/you-who-could-be-forever",
    imgSrc: "/music/you_who_could_be_forever/cover.png",
    audioSrc: "/music/you_who_could_be_forever/audio.m4a",
  },
  {
    id: 3,
    title: "Can't You See",
    spotifyLink:
      "https://open.spotify.com/album/4WiQgdIocMx6qgYSmxnTPG?si=vomvD2eSSb-3t1jN45mGIA",
    appleMusicLink: "https://music.apple.com/lk/song/cant-you-see/1732276178",
    youtubeLink:
      "https://www.youtube.com/watch?v=qAU3CmPXcRs&list=OLAK5uy_mdFFNJyKEaN9sPwJeztKKdCZlV_8188k8&index=2",
    soundcloudLink: "https://soundcloud.com/dejagatsby/sets/cant-you-see-ep/",
    imgSrc: "/music/cant_you_see/cover.png",
    audioSrc: "/music/cant_you_see/audio.m4a",
  },
  {
    id: 2,
    title: "UKG 333",
    spotifyLink:
      "https://open.spotify.com/track/5CeSfj7vpFfcIoHrlVTPfE?si=108d3e01c0934d14",
    appleMusicLink: "https://music.apple.com/lk/song/ukg-333/1732276177",
    youtubeLink:
      "https://www.youtube.com/watch?v=fVlgwC0v_rQ&list=OLAK5uy_mdFFNJyKEaN9sPwJeztKKdCZlV_8188k8",
    soundcloudLink:
      "https://soundcloud.com/dejagatsby/ukg-333?in=dejagatsby/sets/cant-you-see-ep",
    imgSrc: "/music/cant_you_see/cover.png",
    audioSrc: "/music/ukg_333/audio.m4a",
  },
  {
    id: 1,
    title: "Bring That Change",
    spotifyLink:
      "https://open.spotify.com/track/09QlqIRHu7X9DmGK0vdDvQ?si=2ca9d27a5ef949a5",
    appleMusicLink:
      "https://music.apple.com/za/album/bring-that-change/1708120323?i=1708120324",
    youtubeLink: "https://www.youtube.com/watch?v=aZ5cKAAMU2U",
    soundcloudLink: "https://soundcloud.com/dejagatsby/bring-that-change",
    imgSrc: "/music/bring_that_change/cover.svg",
    audioSrc: "/music/bring_that_change/audio.m4a",
  },
];
