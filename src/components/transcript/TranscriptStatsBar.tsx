import { useTranslation } from 'react-i18next';

type Props = {
  wordCount: number;
  readingTimeMins: number;
  speakerDistribution: { speaker: string; pct: number }[];
  getDisplayName: (speaker: string) => string;
  variant?: 'default' | 'minimal';
};

export default function TranscriptStatsBar({ wordCount, readingTimeMins, speakerDistribution, getDisplayName, variant = 'default' }: Props) {
  const { t } = useTranslation();
  if (wordCount <= 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${variant === 'minimal' ? 'text-slate-400' : 'text-slate-500'}`}>
      <span>{t('meeting.transcriptWords', { count: wordCount })}</span>
      <span>{t('meeting.transcriptReadingTime', { minutes: readingTimeMins })}</span>
      {speakerDistribution.length > 0 && (
        <span className="flex flex-wrap items-center gap-x-1">
          {speakerDistribution.map(({ speaker, pct }, i) => (
            <span key={speaker}>
              {i > 0 && ' · '}
              {getDisplayName(speaker)} {pct}%
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
