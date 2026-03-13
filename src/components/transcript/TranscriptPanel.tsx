import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Users, Search } from 'lucide-react';
import TranscriptToolbar from './TranscriptToolbar';
import TranscriptStatsBar from './TranscriptStatsBar';
import SpeakerLegend from './SpeakerLegend';
import TranscriptSegment, { type ProcessedSegment } from './TranscriptSegment';
import type { SpeakerColor } from './SpeakerLegend';
import { formatDuration } from '../../utils/format';
import type { AnalysisResult } from '../../types/meeting';

const SPEAKER_COLORS: SpeakerColor[] = [
  { border: 'border-l-blue-400', text: 'text-blue-700', bg: 'bg-blue-50/40', avatar: 'bg-blue-100 text-blue-700' },
  { border: 'border-l-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50/40', avatar: 'bg-emerald-100 text-emerald-700' },
  { border: 'border-l-violet-400', text: 'text-violet-700', bg: 'bg-violet-50/40', avatar: 'bg-violet-100 text-violet-700' },
  { border: 'border-l-amber-400', text: 'text-amber-700', bg: 'bg-amber-50/40', avatar: 'bg-amber-100 text-amber-700' },
  { border: 'border-l-rose-400', text: 'text-rose-700', bg: 'bg-rose-50/40', avatar: 'bg-rose-100 text-rose-700' },
  { border: 'border-l-cyan-400', text: 'text-cyan-700', bg: 'bg-cyan-50/40', avatar: 'bg-cyan-100 text-cyan-700' },
];

type TranscriptPanelProps = {
  analysis: AnalysisResult;
  meetingTitle: string;
  audioCurrentTime?: number;
  audioDuration?: number;
  hasAudioOrVideo?: boolean;
  seekTo?: (seconds: number) => void;
  scrollToLine?: number;
  onSpeakerRename?: (original: string, newName: string) => void;
  onTranscriptEdit?: (newTranscript: string) => void;
};

export default function TranscriptPanel({
  analysis,
  meetingTitle,
  audioCurrentTime = 0,
  audioDuration = 0,
  hasAudioOrVideo = false,
  seekTo,
  scrollToLine,
  onSpeakerRename,
  onTranscriptEdit,
}: TranscriptPanelProps) {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>(() => {
    try { return (localStorage.getItem('transcript-view-mode') as 'card' | 'compact') || 'card'; } catch { return 'card'; }
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string>>(new Set());
  const [copyToast, setCopyToast] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback(() => { setCopyToast(true); setTimeout(() => setCopyToast(false), 2000); }, []);

  const handleViewModeChange = useCallback((mode: 'card' | 'compact') => {
    setViewMode(mode);
    try { localStorage.setItem('transcript-view-mode', mode); } catch {}
  }, []);

  // --- Parsing ---
  const rawLines = useMemo(() => (analysis.transcript ?? '').split('\n'), [analysis.transcript]);

  const parsedLines = useMemo(() => {
    const result: { raw: string; rawIndex: number; speaker: string | null; text: string }[] = [];
    rawLines.forEach((line, i) => {
      if (line.trim() === '') return;
      const m = line.match(/^(.+?):\s*(.*)/);
      result.push({ raw: line, rawIndex: i, speaker: m ? m[1].trim() : null, text: m ? m[2].trim() : line.trim() });
    });
    return result;
  }, [rawLines]);

  const speakers = useMemo(() => {
    const seen: string[] = [];
    parsedLines.forEach((l) => { if (l.speaker && !seen.includes(l.speaker)) seen.push(l.speaker); });
    return seen;
  }, [parsedLines]);

  const getDisplayName = useCallback((speaker: string) => analysis.speakerNames?.[speaker] ?? speaker, [analysis.speakerNames]);

  const speakerMeta = useMemo(() => {
    const meta = new Map<string, { index: number; side: 'left' | 'right'; color: SpeakerColor }>();
    const useChatAlignment = speakers.length === 2;
    speakers.forEach((s, i) => {
      meta.set(s, {
        index: i,
        side: useChatAlignment && i === 1 ? 'right' as const : 'left' as const,
        color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
      });
    });
    return meta;
  }, [speakers]);

  const getSpeakerColor = useCallback((speaker: string): SpeakerColor => {
    return speakerMeta.get(speaker)?.color ?? SPEAKER_COLORS[0];
  }, [speakerMeta]);

  // --- Segments with timing & grouping ---
  const segments: ProcessedSegment[] = useMemo(() => {
    const durationMs = (audioDuration && hasAudioOrVideo ? audioDuration : 0) * 1000;
    const n = parsedLines.length;
    return parsedLines.map((line, i) => {
      const prevSpeaker = i > 0 ? parsedLines[i - 1].speaker : null;
      const isFirstInGroup = line.speaker !== prevSpeaker || !line.speaker;
      const meta = line.speaker ? speakerMeta.get(line.speaker) : undefined;
      return {
        ...line,
        index: i,
        startMs: n > 0 ? (i / n) * durationMs : 0,
        endMs: n > 0 ? ((i + 1) / n) * durationMs : 0,
        isFirstInGroup,
        side: (meta?.side ?? 'left') as 'left' | 'right',
      };
    });
  }, [parsedLines, audioDuration, hasAudioOrVideo, speakerMeta]);

  // --- Filtering ---
  const filteredSegments = useMemo(() => {
    let result = segments;
    if (selectedSpeakers.size > 0) {
      result = result.filter((s) => s.speaker && selectedSpeakers.has(s.speaker));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((s) => s.raw.toLowerCase().includes(q));
    }
    return result;
  }, [segments, selectedSpeakers, search]);

  // --- Search match tracking ---
  const matchIndices = useMemo(() => {
    if (!search.trim()) return [];
    return filteredSegments.map((_, i) => i);
  }, [filteredSegments, search]);

  useEffect(() => { setCurrentMatchIndex(0); }, [search]);

  const scrollToSegment = useCallback((filteredIdx: number) => {
    const seg = filteredSegments[filteredIdx];
    if (!seg) return;
    const el = document.getElementById(`transcript-line-${seg.index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [filteredSegments]);

  const goNextMatch = useCallback(() => {
    if (matchIndices.length <= 1) return;
    const next = (currentMatchIndex + 1) % matchIndices.length;
    setCurrentMatchIndex(next);
    scrollToSegment(matchIndices[next]);
  }, [currentMatchIndex, matchIndices, scrollToSegment]);

  const goPrevMatch = useCallback(() => {
    if (matchIndices.length <= 1) return;
    const prev = (currentMatchIndex - 1 + matchIndices.length) % matchIndices.length;
    setCurrentMatchIndex(prev);
    scrollToSegment(matchIndices[prev]);
  }, [currentMatchIndex, matchIndices, scrollToSegment]);

  // --- Playback sync ---
  const currentSegmentIndex = useMemo(() => {
    if (!hasAudioOrVideo || audioDuration <= 0 || segments.length === 0) return -1;
    const tMs = audioCurrentTime * 1000;
    const seg = segments.find((s) => tMs >= s.startMs && tMs < s.endMs);
    return seg ? seg.index : -1;
  }, [audioCurrentTime, audioDuration, hasAudioOrVideo, segments]);

  useEffect(() => {
    if (currentSegmentIndex < 0) return;
    const el = document.getElementById(`transcript-line-${currentSegmentIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentSegmentIndex]);

  useEffect(() => {
    if (scrollToLine == null) return;
    const el = document.getElementById(`transcript-line-${scrollToLine}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToLine]);

  // --- Stats ---
  const stats = useMemo(() => {
    const allText = parsedLines.map((l) => l.text).join(' ');
    const words = allText.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const readingTimeMins = Math.ceil(wordCount / 225) || 0;
    const speakerWordCounts: Record<string, number> = {};
    parsedLines.forEach((l) => {
      if (l.speaker) {
        speakerWordCounts[l.speaker] = (speakerWordCounts[l.speaker] ?? 0) + l.text.split(/\s+/).filter((w) => w.length > 0).length;
      }
    });
    const total = Object.values(speakerWordCounts).reduce((a, b) => a + b, 0);
    const speakerDistribution = total > 0
      ? Object.entries(speakerWordCounts).map(([s, c]) => ({ speaker: s, pct: Math.round((c / total) * 100) })).sort((a, b) => b.pct - a.pct)
      : [];
    return { wordCount, readingTimeMins, speakerDistribution };
  }, [parsedLines]);

  // --- Speaker actions ---
  const toggleSpeaker = useCallback((speaker: string) => {
    setSelectedSpeakers((prev) => { const next = new Set(prev); if (next.has(speaker)) next.delete(speaker); else next.add(speaker); return next; });
  }, []);

  const copySpeakerTranscript = useCallback((speaker: string) => {
    const lines = parsedLines.filter((l) => l.speaker === speaker).map((l) => l.raw);
    navigator.clipboard.writeText(lines.join('\n\n'));
    showToast();
  }, [parsedLines, showToast]);

  // --- Editing ---
  const handleEditSave = useCallback((segIndex: number, newLine: string) => {
    if (!onTranscriptEdit) return;
    const seg = parsedLines[segIndex];
    if (!seg) return;
    const newRawLines = [...rawLines];
    newRawLines[seg.rawIndex] = newLine;
    onTranscriptEdit(newRawLines.join('\n'));
    setEditingIndex(null);
  }, [rawLines, parsedLines, onTranscriptEdit]);

  // --- Copy link ---
  const copyLinkToLine = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const hash = `#transcript-line-${index}`;
    window.location.hash = hash;
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${hash}`);
    showToast();
  }, [showToast]);

  // --- Export helpers ---
  const formatTimestamp = (ms: number) => formatDuration(ms / 1000);

  const formatSrtTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  const formatVttTime = (ms: number) => formatSrtTime(ms).replace(',', '.');

  const downloadFile = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const safeTitle = meetingTitle.replace(/[^a-z0-9]/gi, '_');
  const hasDuration = audioDuration > 0 && hasAudioOrVideo;

  const exportTxt = useCallback(() => {
    const lines = segments.map((seg) => {
      const prefix = hasDuration ? `[${formatTimestamp(seg.startMs)}] ` : '';
      return `${prefix}${seg.raw}`;
    });
    downloadFile(lines.join('\n'), `${safeTitle}_transcript.txt`, 'text/plain');
  }, [segments, hasDuration, safeTitle, downloadFile]);

  const exportMarkdown = useCallback(() => {
    const lines = segments.map((seg) => {
      const ts = hasDuration ? ` _[${formatTimestamp(seg.startMs)}]_` : '';
      if (seg.speaker) return `### ${getDisplayName(seg.speaker)}${ts}\n\n${seg.text}`;
      return seg.text;
    });
    downloadFile(`# ${t('meeting.transcript')}\n\n${lines.join('\n\n')}`, `${safeTitle}_transcript.md`, 'text/markdown');
  }, [segments, hasDuration, getDisplayName, safeTitle, downloadFile, t]);

  const exportSrt = useCallback(() => {
    const lines = segments.map((seg, i) => {
      const speaker = seg.speaker ? `${getDisplayName(seg.speaker)}: ` : '';
      return `${i + 1}\n${formatSrtTime(seg.startMs)} --> ${formatSrtTime(seg.endMs)}\n${speaker}${seg.text}\n`;
    });
    downloadFile(lines.join('\n'), `${safeTitle}_transcript.srt`, 'text/plain');
  }, [segments, getDisplayName, safeTitle, downloadFile]);

  const exportVtt = useCallback(() => {
    const lines = segments.map((seg) => {
      const speaker = seg.speaker ? `${getDisplayName(seg.speaker)}: ` : '';
      return `${formatVttTime(seg.startMs)} --> ${formatVttTime(seg.endMs)}\n${speaker}${seg.text}\n`;
    });
    downloadFile(`WEBVTT\n\n${lines.join('\n')}`, `${safeTitle}_transcript.vtt`, 'text/vtt');
  }, [segments, getDisplayName, safeTitle, downloadFile]);

  const printTranscript = useCallback(() => {
    const blocks = segments.map((seg) => {
      const color = seg.speaker ? getSpeakerColor(seg.speaker) : null;
      const bgMap: Record<string, string> = { 'bg-blue-50/40': '#eff6ff', 'bg-emerald-50/40': '#ecfdf5', 'bg-violet-50/40': '#f5f3ff', 'bg-amber-50/40': '#fffbeb', 'bg-rose-50/40': '#fff1f2', 'bg-cyan-50/40': '#ecfeff' };
      const bg = color ? (bgMap[color.bg] || '#f8fafc') : '#ffffff';
      const escaped = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      const displayName = seg.speaker ? getDisplayName(seg.speaker) : '';
      const ts = hasDuration ? `<span style="float:right;font-size:0.7rem;color:#94a3b8;font-family:monospace">${formatTimestamp(seg.startMs)}</span>` : '';
      if (seg.speaker) {
        return `<div style="margin-bottom:0.5rem;padding:0.75rem 1rem;border-radius:0.5rem;border-left:3px solid ${bg === '#eff6ff' ? '#60a5fa' : bg === '#ecfdf5' ? '#34d399' : bg === '#f5f3ff' ? '#a78bfa' : '#94a3b8'};background:${bg}">${ts}<div style="font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.8;margin-bottom:0.25rem">${escaped(displayName)}</div><div style="line-height:1.6;font-size:0.875rem">${escaped(seg.text)}</div></div>`;
      }
      return `<div style="margin-bottom:0.5rem;padding:0.75rem 1rem;border-radius:0.5rem;background:#fff;border:1px solid #e2e8f0">${ts}<div style="line-height:1.6;font-size:0.875rem">${escaped(seg.raw)}</div></div>`;
    });
    const html = `<!DOCTYPE html><html><head><title>${meetingTitle.replace(/</g, '&lt;')} - ${t('meeting.transcript')}</title><style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:800px;margin:0 auto}h1{font-size:1.25rem;margin-bottom:1.5rem}@media print{body{padding:1rem}}</style></head><body><h1>${meetingTitle.replace(/</g, '&lt;')}</h1><h2 style="font-size:1rem;margin-bottom:1rem;color:#64748b">${t('meeting.transcript')}</h2>${blocks.join('')}</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); w.close(); };
  }, [segments, getSpeakerColor, getDisplayName, hasDuration, meetingTitle, t]);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(analysis.transcript || '');
    showToast();
  }, [analysis.transcript, showToast]);

  // --- Keyboard navigation ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingIndex !== null) return;
    const len = filteredSegments.length;
    if (len === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, len - 1);
      setFocusedIndex(next);
      const seg = filteredSegments[next];
      document.getElementById(`transcript-line-${seg.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
      setFocusedIndex(prev);
      const seg = filteredSegments[prev];
      document.getElementById(`transcript-line-${seg.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (e.key === 'Enter' && focusedIndex !== null) {
      e.preventDefault();
      const seg = filteredSegments[focusedIndex];
      if (seekTo) seekTo(seg.startMs / 1000);
    } else if ((e.key === 'e' || e.key === 'E') && focusedIndex !== null && onTranscriptEdit) {
      e.preventDefault();
      setEditingIndex(filteredSegments[focusedIndex].index);
    } else if (e.key === 'Escape') {
      setFocusedIndex(null);
    }
  }, [editingIndex, filteredSegments, focusedIndex, seekTo, onTranscriptEdit]);

  // --- Virtualizer ---
  const useVirtual = filteredSegments.length > 30;
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filteredSegments.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => viewMode === 'compact' ? 36 : 72,
    overscan: 8,
  });

  // --- Recalculate grouping for filtered list ---
  const processedFiltered = useMemo(() => {
    return filteredSegments.map((seg, i) => {
      const prevSpeaker = i > 0 ? filteredSegments[i - 1].speaker : null;
      return { ...seg, isFirstInGroup: seg.speaker !== prevSpeaker || !seg.speaker };
    });
  }, [filteredSegments]);

  const renderSegment = useCallback((seg: ProcessedSegment, filteredIdx: number) => {
    const isActiveMatch = search.trim().length > 0 && matchIndices.length > 0 && matchIndices[currentMatchIndex] === filteredIdx;
    const color = seg.speaker ? getSpeakerColor(seg.speaker) : SPEAKER_COLORS[0];
    return (
      <TranscriptSegment
        key={seg.index}
        segment={seg}
        displayName={seg.speaker ? getDisplayName(seg.speaker) : ''}
        color={color}
        viewMode={viewMode}
        isCurrent={seg.index === currentSegmentIndex}
        isFocused={focusedIndex !== null && filteredIdx === focusedIndex}
        isEditing={editingIndex === seg.index}
        searchQuery={search}
        isActiveMatch={isActiveMatch}
        hasAudio={hasDuration}
        onSeek={seekTo ? () => seekTo(seg.startMs / 1000) : undefined}
        onCopyLink={(e) => copyLinkToLine(seg.index, e)}
        onCopyText={() => { navigator.clipboard.writeText(seg.text); showToast(); }}
        onEditStart={() => setEditingIndex(seg.index)}
        onEditSave={(newLine) => handleEditSave(seg.index, newLine)}
        onEditCancel={() => setEditingIndex(null)}
        onShowToast={showToast}
      />
    );
  }, [search, matchIndices, currentMatchIndex, getSpeakerColor, getDisplayName, viewMode, currentSegmentIndex, focusedIndex, editingIndex, hasAudioOrVideo, seekTo, copyLinkToLine, showToast, handleEditSave]);

  return (
    <div className="relative" ref={containerRef} tabIndex={-1} onKeyDown={handleKeyDown} style={{ outline: 'none' }}>
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg animate-in fade-in zoom-in-95">
          {t('meeting.transcriptCopied')}
        </div>
      )}

      <div className="space-y-4">
        <div className="sticky top-0 z-10 bg-white py-3 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 border-b border-slate-200 space-y-3">
          <TranscriptToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setFocusedIndex(null); }}
            matchCount={matchIndices.length}
            currentMatchIndex={currentMatchIndex}
            onNextMatch={goNextMatch}
            onPrevMatch={goPrevMatch}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onCopyAll={copyAll}
            onExportTxt={exportTxt}
            onExportMarkdown={exportMarkdown}
            onExportSrt={exportSrt}
            onExportVtt={exportVtt}
            onPrint={printTranscript}
            hasAudio={hasDuration}
          />
          <TranscriptStatsBar
            wordCount={stats.wordCount}
            readingTimeMins={stats.readingTimeMins}
            speakerDistribution={stats.speakerDistribution}
            getDisplayName={getDisplayName}
          />
          <SpeakerLegend
            speakers={speakers}
            selectedSpeakers={selectedSpeakers}
            getDisplayName={getDisplayName}
            getSpeakerColor={getSpeakerColor}
            onToggleSpeaker={toggleSpeaker}
            onSelectAll={() => setSelectedSpeakers(new Set(speakers))}
            onClearFilter={() => setSelectedSpeakers(new Set())}
            onRenameSpeaker={onSpeakerRename}
            onCopySpeakerTranscript={copySpeakerTranscript}
          />
        </div>

        <div className="flex-1 min-h-0 pt-2">
          {processedFiltered.length > 0 ? (
            useVirtual ? (
              <div
                ref={scrollRef}
                className="flex-1 overflow-auto min-h-[300px] max-h-[70vh] rounded-lg"
              >
                <div
                  className="flex flex-col"
                  style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const seg = processedFiltered[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {renderSegment(seg, virtualRow.index)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col max-h-[70vh] overflow-y-auto px-1" ref={scrollRef}>
                {processedFiltered.map((seg, i) => renderSegment(seg, i))}
              </div>
            )
          ) : search.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">{t('meeting.noSearchResults')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">{t('meeting.noTranscript')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
