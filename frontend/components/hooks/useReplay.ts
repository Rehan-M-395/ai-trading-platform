import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReplayState = {
  isReplay: boolean;
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
};

export function useReplay<T>(data: T[]) {
  const [isReplay, setIsReplay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [baseIndex, setBaseIndex] = useState(0);
  const [speed, setSpeed] = useState(1000); // ms per candle
  const setSpeedMs = useCallback((ms: number) => setSpeed(ms), []);

  const dataLength = data.length;
  const dataLengthRef = useRef(dataLength);
  dataLengthRef.current = dataLength;

  // Clamp indices if data length changes.
  useEffect(() => {
    if (dataLength === 0) {
      setIsReplay(false);
      setIsPlaying(false);
      setCurrentIndex(0);
      setBaseIndex(0);
      return;
    }

    setBaseIndex((prev) => Math.min(Math.max(prev, 0), dataLength - 1));
    setCurrentIndex((prev) => Math.min(Math.max(prev, 0), dataLength - 1));
  }, [dataLength]);

  // Ensure currentIndex never goes before baseIndex while replay is active.
  useEffect(() => {
    if (!isReplay) return;
    setCurrentIndex((prev) => Math.max(prev, baseIndex));
  }, [baseIndex, isReplay]);

  // Interval tick for auto-advancing.
  useEffect(() => {
    if (!isReplay || !isPlaying) return;
    if (dataLength <= 1) return;

    const id = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const len = dataLengthRef.current;
        if (len <= 1) return prev;

        const next = Math.min(prev + 1, len - 1);
        return next;
      });
    }, speed);

    return () => window.clearInterval(id);
  }, [isReplay, isPlaying, speed]);

  // Stop playing at the end of the dataset.
  useEffect(() => {
    if (!isReplay || !isPlaying) return;
    if (dataLength === 0) return;
    if (currentIndex >= dataLength - 1) setIsPlaying(false);
  }, [currentIndex, dataLength, isPlaying, isReplay]);

  const setIndex = useCallback(
    (idx: number) => {
      if (dataLength === 0) return;
      const clamped = Math.min(Math.max(idx, 0), dataLength - 1);
      setBaseIndex(clamped);
      setCurrentIndex(clamped);
    },
    [dataLength],
  );

  const play = useCallback(() => {
    if (dataLength === 0) return;
    setIsReplay(true);
    setIsPlaying(true);
  }, [dataLength]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsReplay(false);
    setIsPlaying(false);
    setBaseIndex(0);
    setCurrentIndex(dataLength > 0 ? dataLength - 1 : 0);
  }, [dataLength]);

  const forward = useCallback(() => {
    if (dataLength === 0) return;
    setIsReplay(true);
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(prev + 1, dataLength - 1));
  }, [dataLength]);

  const backward = useCallback(() => {
    if (dataLength === 0) return;
    setIsReplay(true);
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(prev - 1, baseIndex));
  }, [baseIndex, dataLength]);

  const visibleData = useMemo(() => {
    if (!isReplay) return data;
    return [
      ...data.slice(0, baseIndex),
      ...data.slice(baseIndex, currentIndex + 1),
    ];
  }, [baseIndex, currentIndex, data, isReplay]);

  return {
    // state
    isReplay,
    isPlaying,
    currentIndex,
    speed,

    // computed
    visibleData,

    // controls
    play,
    pause,
    stop,
    forward,
    backward,
    setIndex,
    setSpeed: setSpeedMs,
  } satisfies ReplayState & {
    visibleData: T[];
    play: () => void;
    pause: () => void;
    stop: () => void;
    forward: () => void;
    backward: () => void;
    setIndex: (idx: number) => void;
    setSpeed: (speed: number) => void;
  };
}

