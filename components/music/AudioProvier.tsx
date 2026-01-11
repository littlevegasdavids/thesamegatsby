"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type AudioContextType = {
  currentSrc: string | null;
  isPlaying: boolean;
  play: (src: string) => void;
  stop: () => void;
  toggle: (src: string) => void;
};

const AudioPlayerContext = createContext<AudioContextType | null>(null);

export const useAudioPlayer = () => {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used inside AudioProvider");
  return ctx;
};

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create audio ONCE (client only)
  useEffect(() => {
    audioRef.current = new Audio();

    const audio = audioRef.current;

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentSrc(null);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const play = (src: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop currently playing track
    if (currentSrc && currentSrc !== src) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Load new source if different
    if (audio.src !== src) {
      audio.src = src;
    }

    audio.play();
    setCurrentSrc(src);
    setIsPlaying(true);
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;

    setIsPlaying(false);
    setCurrentSrc(null);
  };

  const toggle = (src: string) => {
    if (src === currentSrc && isPlaying) {
      stop();
    } else {
      play(src);
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSrc,
        isPlaying,
        play,
        stop,
        toggle,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

