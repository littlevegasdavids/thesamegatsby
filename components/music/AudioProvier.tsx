"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Howl } from "howler";

type AudioContextType = {
  currentSrc: string | null;
  isPlaying: boolean;
  play: (src: string) => void;
  stop: () => void;
};

const AudioPlayerContext = createContext<AudioContextType | null>(null);

export const useAudioPlayer = () => {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used inside AudioProvider");
  return ctx;
};

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const howlRef = useRef<Howl | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const createHowl = (src: string) => {
    const howl = new Howl({
      src: [src],
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
      onend: () => {
        setIsPlaying(false);
        setCurrentSrc(null);
      },
    });

    howl.on("play", () => {
      var fadeInTime = 2000;
      var fadeOutTime = 3000;
      
      howl.fade(0, 1, fadeInTime);

      setTimeout(() => {
        howl.fade(1, 0, fadeOutTime);
      }, howl.duration() * 1000 - fadeOutTime - 100);
    });

    return howl;
  };

  const play = (src: string) => {
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }

    setCurrentSrc(src);
    const howl = createHowl(src);
    howlRef.current = howl;
    howl.play();
  };

  const stop = () => {
    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
      howlRef.current = null;
    }
    setCurrentSrc(null);
    setIsPlaying(false);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSrc,
        isPlaying,
        play,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};
