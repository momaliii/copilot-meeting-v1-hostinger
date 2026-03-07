import React, { useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';

type MediaPlayerProps = {
  audioUrl: string | null;
  videoUrl: string | null;
  downloadFilename?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  mediaRef?: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>;
};

export default function MediaPlayer({ audioUrl, videoUrl, downloadFilename = 'recording', onTimeUpdate, onDurationChange, mediaRef }: MediaPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoUrl || !onTimeUpdate || !onDurationChange) return;
    const el = (mediaRef?.current ?? internalVideoRef.current) as HTMLVideoElement | null;
    if (!el) return;
    const handleTimeUpdate = () => onTimeUpdate(el.currentTime);
    const handleLoadedMetadata = () => onDurationChange(el.duration);
    const handleDurationChange = () => onDurationChange(el.duration);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('durationchange', handleDurationChange);
    handleLoadedMetadata();
    return () => {
      if (el) {
        el.removeEventListener('timeupdate', handleTimeUpdate);
        el.removeEventListener('loadedmetadata', handleLoadedMetadata);
        el.removeEventListener('durationchange', handleDurationChange);
      }
    };
  }, [videoUrl, onTimeUpdate, onDurationChange, mediaRef]);

  if (videoUrl) {
    const setVideoRef = (el: HTMLVideoElement | null) => {
      (internalVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      if (mediaRef) (mediaRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    };
    return (
      <div className="flex flex-col gap-3 w-full">
        <video
          ref={setVideoRef}
          src={videoUrl}
          controls
          className="w-full max-h-[400px] rounded-xl bg-slate-900"
          preload="metadata"
        />
        <a
          href={videoUrl}
          download={`${downloadFilename.replace(/[^a-z0-9.-]/gi, '_')}.webm`}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Download recording
        </a>
      </div>
    );
  }
  if (audioUrl) {
    const audioElRef = mediaRef as React.RefObject<HTMLAudioElement | null> | undefined;
    return (
      <AudioPlayer
        src={audioUrl}
        downloadFilename={downloadFilename}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        audioRef={audioElRef}
      />
    );
  }
  return null;
}
