import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Copy, Link, Edit2, Play, Check, X } from 'lucide-react';
import type { SpeakerColor } from './SpeakerLegend';
import { formatDuration } from '../../utils/format';

export type ProcessedSegment = {
  raw: string;
  rawIndex: number;
  index: number;
  speaker: string | null;
  text: string;
  startMs: number;
  endMs: number;
  isFirstInGroup: boolean;
  side: 'left' | 'right';
};

type Props = {
  segment: ProcessedSegment;
  displayName: string;
  color: SpeakerColor;
  viewMode: 'card' | 'compact';
  isCurrent: boolean;
  isFocused: boolean;
  isEditing: boolean;
  searchQuery: string;
  isActiveMatch: boolean;
  hasAudio: boolean;
  onSeek?: () => void;
  onCopyLink: (e: React.MouseEvent) => void;
  onCopyText: () => void;
  onEditStart: () => void;
  onEditSave: (newText: string) => void;
  onEditCancel: () => void;
  onShowToast: () => void;
};

function highlightText(text: string, search: string, isActiveMatch: boolean): React.ReactNode {
  if (!search.trim()) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark key={i} className={`${isActiveMatch ? 'bg-amber-300' : 'bg-amber-100'} rounded px-0.5`}>{part}</mark>
    ) : part
  );
}

export default function TranscriptSegment({
  segment,
  displayName,
  color,
  viewMode,
  isCurrent,
  isFocused,
  isEditing,
  searchQuery,
  isActiveMatch,
  hasAudio,
  onSeek,
  onCopyLink,
  onCopyText,
  onEditStart,
  onEditSave,
  onEditCancel,
  onShowToast,
}: Props) {
  const { t } = useTranslation();
  const [editValue, setEditValue] = useState(segment.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) setEditValue(segment.text);
  }, [isEditing, segment.text]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const timestamp = formatDuration(segment.startMs / 1000);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isRight = segment.side === 'right';

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      const newLine = segment.speaker ? `${segment.speaker}: ${trimmed}` : trimmed;
      onEditSave(newLine);
    } else {
      onEditCancel();
    }
  };

  const actionsButton = (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="p-0.5 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {menuOpen && (
        <div className="absolute top-0 left-full ml-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
          <button onClick={(e) => { e.stopPropagation(); onCopyText(); onShowToast(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Copy className="w-3.5 h-3.5" /> {t('meeting.copyText')}
          </button>
          <button onClick={(e) => { onCopyLink(e); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Link className="w-3.5 h-3.5" /> {t('meeting.copyLinkToLine')}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEditStart(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5" /> {t('meeting.editSegment')}
          </button>
          {hasAudio && onSeek && (
            <button onClick={(e) => { e.stopPropagation(); onSeek(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Play className="w-3.5 h-3.5" /> {t('meeting.playFromHere')}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const highlight = isCurrent ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-300/40' : isFocused ? 'ring-1 ring-inset ring-indigo-500' : '';
  const groupMargin = segment.isFirstInGroup ? 'mt-2' : 'mt-px';

  // --- Compact view ---
  if (viewMode === 'compact') {
    return (
      <div
        id={`transcript-line-${segment.index}`}
        className={`group flex items-start gap-2 px-2 py-0.5 rounded hover:bg-slate-50/80 transition-colors ${highlight} ${groupMargin} ${onSeek ? 'cursor-pointer' : ''}`}
        onClick={onSeek}
        onDoubleClick={(e) => { e.stopPropagation(); onEditStart(); }}
        role={onSeek ? 'button' : undefined}
      >
        {hasAudio && (
          <span className="text-[10px] text-slate-400 font-mono pt-0.5 shrink-0 w-8 text-right select-none">{timestamp}</span>
        )}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-1.5">
              <textarea ref={editRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onEditCancel(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave(); }} className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[2rem]" rows={2} />
              <div className="flex gap-1.5">
                <button onClick={handleSave} className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"><Check className="w-3 h-3" />{t('meeting.saveEdit')}</button>
                <button onClick={onEditCancel} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 flex items-center gap-1"><X className="w-3 h-3" />{t('meeting.cancelEdit')}</button>
              </div>
            </div>
          ) : (
            <span className="text-sm leading-snug text-slate-700">
              {segment.isFirstInGroup && segment.speaker && <strong className={`${color.text} mr-1`}>{displayName}:</strong>}
              {highlightText(segment.text, searchQuery, isActiveMatch)}
            </span>
          )}
        </div>
        {!isEditing && actionsButton}
      </div>
    );
  }

  // --- Card view ---
  const alignClass = isRight ? 'sm:self-end sm:max-w-[78%]' : 'sm:self-start sm:max-w-[78%]';
  const borderSide = isRight ? 'border-r-[3px]' : 'border-l-[3px]';
  const borderColor = isRight ? color.border.replace('border-l-', 'border-r-') : color.border;

  return (
    <div
      id={`transcript-line-${segment.index}`}
      className={`w-full ${alignClass} ${groupMargin} group ${isEditing ? 'relative z-20' : ''}`}
    >
      <div
        className={`${borderSide} ${borderColor} ${segment.isFirstInGroup ? color.bg : 'bg-white/60'} rounded-md px-3 py-1.5 transition-all hover:shadow-sm ${highlight} ${onSeek ? 'cursor-pointer' : ''} ${isEditing ? 'ring-2 ring-indigo-300 ring-inset shadow-md' : ''}`}
        onClick={onSeek}
        onDoubleClick={(e) => { e.stopPropagation(); onEditStart(); }}
        role={onSeek ? 'button' : undefined}
      >
        {/* Header: avatar + name + timestamp + actions */}
        {segment.isFirstInGroup && segment.speaker && (
          <div className={`flex items-center gap-1.5 mb-1 ${isRight ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full ${color.avatar} flex items-center justify-center text-[10px] font-bold shrink-0`}>
              {avatarLetter}
            </div>
            <span className={`text-xs font-bold ${color.text} uppercase tracking-wide leading-none`}>{displayName}</span>
            <div className={`flex items-center gap-1 ${isRight ? 'mr-auto' : 'ml-auto'}`}>
              {hasAudio && (
                <span className="text-[10px] text-slate-400 font-mono select-none cursor-pointer hover:text-indigo-600 transition-colors" onClick={(e) => { e.stopPropagation(); onSeek?.(); }}>{timestamp}</span>
              )}
              {!isEditing && actionsButton}
            </div>
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <div className="space-y-1.5 mt-0.5 bg-white/90 rounded p-2 -mx-1 border border-indigo-100">
            <textarea ref={editRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onEditCancel(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave(); }} className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[2.5rem]" rows={2} />
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleSave} className="px-2.5 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"><Check className="w-3 h-3" />{t('meeting.saveEdit')}</button>
              <button onClick={onEditCancel} className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded hover:bg-slate-200 flex items-center gap-1"><X className="w-3 h-3" />{t('meeting.cancelEdit')}</button>
            </div>
          </div>
        ) : (
          <div className={`text-sm leading-snug text-slate-800 ${segment.isFirstInGroup && segment.speaker ? 'pl-[30px]' : ''} ${isRight ? 'sm:text-right' : ''}`}>
            {highlightText(segment.text, searchQuery, isActiveMatch)}
          </div>
        )}

        {/* Continuation actions: only visible on hover */}
        {!segment.isFirstInGroup && !isEditing && (
          <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isRight ? 'justify-start' : 'justify-end'}`}>
            {hasAudio && (
              <span className="text-[10px] text-slate-300 font-mono select-none cursor-pointer hover:text-indigo-600 transition-colors" onClick={(e) => { e.stopPropagation(); onSeek?.(); }}>{timestamp}</span>
            )}
            {actionsButton}
          </div>
        )}
      </div>
    </div>
  );
}
