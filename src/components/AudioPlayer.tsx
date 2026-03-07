import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume2, Download } from 'lucide-react';
import { formatDuration } from '../utils/format';

type AudioPlayerProps = {
  src: string;
  downloadFilename?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
};

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

export default function AudioPlayer({ src, downloadFilename = 'recording', onTimeUpdate, onDurationChange, audioRef: externalAudioRef }: AudioPlayerProps) {
  const { t } = useTranslation();
  const internalRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalAudioRef ?? internalRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const audio = audioRef.current;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      onTimeUpdate?.(el.currentTime);
    };
    const handleLoadedMetadata = () => {
      const d = el.duration;
      setDuration(d);
      onDurationChange?.(d);
    };
    const handleDurationChange = () => {
      const d = el.duration;
      setDuration(d);
      onDurationChange?.(d);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('durationchange', handleDurationChange);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);

    handleLoadedMetadata();

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('durationchange', handleDurationChange);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  }, [src, onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    el.currentTime = percent * duration;
  };

  const safeDuration = Number.isFinite(duration) && duration > 0 && !Number.isNaN(duration) ? duration : 0;
  const progressPercent = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;
  const durationDisplay = safeDuration > 0 ? formatDuration(safeDuration) : '—';

  return (
    <div className="flex flex-col gap-2 w-full">
      <audio ref={audioRef} src={src} preload="auto" />
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        <button
          type="button"
          onClick={togglePlay}
          className="min-w-[44px] min-h-[44px] w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors shrink-0"
          aria-label={isPlaying ? t('audio.pause') : t('audio.play')}
          title={isPlaying ? t('audio.pause') : t('audio.play')}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatDuration(currentTime)}</span>
            <span>{durationDisplay}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={safeDuration}
            className="h-1.5 bg-slate-200 rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowSpeedMenu((p) => !p)}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg min-w-[2.5rem]"
            title={t('audio.speed')}
          >
            {playbackRate}x
          </button>
          {showSpeedMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSpeedMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 min-w-[4rem]">
                {SPEED_OPTIONS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(speed);
                      setShowSpeedMenu(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-sm ${playbackRate === speed ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const a = document.createElement('a');
            a.href = src;
            a.download = `${downloadFilename.replace(/[^a-z0-9.-]/gi, '_')}.webm`;
            a.click();
          }}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          title={t('audio.download')}
          aria-label={t('audio.download')}
        >
          <Download className="w-5 h-5" />
        </button>
        <div className="w-10 shrink-0" aria-hidden="true">
          <Volume2 className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
