import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Copy, Download, ChevronDown, ChevronUp, Printer, LayoutList, MessageSquareText } from 'lucide-react';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  viewMode: 'card' | 'compact';
  onViewModeChange: (mode: 'card' | 'compact') => void;
  onCopyAll: () => void;
  onExportTxt: () => void;
  onExportMarkdown: () => void;
  onExportSrt: () => void;
  onExportVtt: () => void;
  onPrint: () => void;
  hasAudio: boolean;
};

export default function TranscriptToolbar({
  search,
  onSearchChange,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  viewMode,
  onViewModeChange,
  onCopyAll,
  onExportTxt,
  onExportMarkdown,
  onExportSrt,
  onExportVtt,
  onPrint,
  hasAudio,
}: Props) {
  const { t } = useTranslation();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const btnClass = 'flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] sm:min-h-0';
  const isSearching = search.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('meeting.searchTranscript')}
            className="w-full pl-9 pr-24 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {isSearching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-xs text-slate-400 mr-1">
                {matchCount > 0 ? t('meeting.matchCount', { current: currentMatchIndex + 1, total: matchCount }) : t('meeting.noSearchResults')}
              </span>
              {matchCount > 1 && (
                <>
                  <button onClick={onPrevMatch} className="p-0.5 text-slate-400 hover:text-slate-600 rounded" title={t('meeting.prevMatch')}>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onNextMatch} className="p-0.5 text-slate-400 hover:text-slate-600 rounded" title={t('meeting.nextMatch')}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange('card')}
              className={`px-2.5 py-2 text-sm transition-colors min-h-[44px] sm:min-h-0 ${viewMode === 'card' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              title={t('meeting.cardView')}
            >
              <MessageSquareText className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('compact')}
              className={`px-2.5 py-2 text-sm transition-colors min-h-[44px] sm:min-h-0 ${viewMode === 'compact' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              title={t('meeting.compactView')}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <button onClick={onCopyAll} className={btnClass}>
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">{t('meeting.copyFullTranscript')}</span>
          </button>

          <div className="relative" ref={exportRef}>
            <button onClick={() => setExportOpen((o) => !o)} className={btnClass}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('meeting.exportTranscript')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 py-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                <button onClick={() => { onExportTxt(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">{t('meeting.exportTranscriptTxt')}</button>
                <button onClick={() => { onExportMarkdown(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">{t('meeting.exportTranscriptMarkdown')}</button>
                {hasAudio && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <button onClick={() => { onExportSrt(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">{t('meeting.exportSrt')}</button>
                    <button onClick={() => { onExportVtt(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">{t('meeting.exportVtt')}</button>
                  </>
                )}
              </div>
            )}
          </div>

          <button onClick={onPrint} className={btnClass}>
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">{t('meeting.printTranscript')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
