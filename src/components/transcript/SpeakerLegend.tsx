import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Copy } from 'lucide-react';

export type SpeakerColor = {
  border: string;
  text: string;
  bg: string;
  avatar: string;
};

type Props = {
  speakers: string[];
  selectedSpeakers: Set<string>;
  getDisplayName: (speaker: string) => string;
  getSpeakerColor: (speaker: string) => SpeakerColor;
  onToggleSpeaker: (speaker: string) => void;
  onSelectAll: () => void;
  onClearFilter: () => void;
  onRenameSpeaker?: (original: string, newName: string) => void;
  onCopySpeakerTranscript: (speaker: string) => void;
  variant?: 'default' | 'minimal';
};

export default function SpeakerLegend({
  speakers,
  selectedSpeakers,
  getDisplayName,
  getSpeakerColor,
  onToggleSpeaker,
  onSelectAll,
  onClearFilter,
  onRenameSpeaker,
  onCopySpeakerTranscript,
  variant = 'default',
}: Props) {
  const { t } = useTranslation();
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (speakers.length === 0) return null;

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== editingSpeaker && onRenameSpeaker && editingSpeaker) {
      onRenameSpeaker(editingSpeaker, trimmed);
    }
    setEditingSpeaker(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {t('meeting.speakerLegend')}:
      </span>
      {speakers.map((speaker) => {
        const color = getSpeakerColor(speaker);
        const isSelected = selectedSpeakers.has(speaker);
        const displayName = getDisplayName(speaker);
        const isEditing = editingSpeaker === speaker;

        return (
          <div key={speaker} className="flex items-center gap-1.5">
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') { setEditingSpeaker(null); setEditValue(''); }
                }}
                autoFocus
                className="px-2 py-1 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24"
              />
            ) : (
              <>
                <button
                  onClick={() => onToggleSpeaker(speaker)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${variant === 'minimal' ? `bg-slate-50 ${color.text} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:bg-slate-100'}` : `border ${color.bg} ${color.text} border-current/20 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:opacity-90'}`}`}
                  title={t('meeting.filterBySpeaker')}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${variant === 'minimal' ? `bg-slate-100 ${color.text}` : color.avatar}`}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  {displayName}
                </button>
                {onRenameSpeaker && (
                  <button
                    onClick={() => { setEditingSpeaker(speaker); setEditValue(displayName); }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title={t('meeting.renameSpeaker')}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
            {!isEditing && (
              <button
                onClick={() => onCopySpeakerTranscript(speaker)}
                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                title={t('meeting.copySpeakerTranscript', { speaker: displayName })}
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
      {speakers.length > 1 && (
        <>
          <button onClick={onSelectAll} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            {t('meeting.selectAllSpeakers')}
          </button>
          <button onClick={onClearFilter} className="text-xs font-medium text-slate-500 hover:text-slate-700">
            {t('meeting.clearSpeakerFilter')}
          </button>
        </>
      )}
    </div>
  );
}
