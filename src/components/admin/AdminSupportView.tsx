import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Settings, ChevronDown, FileText, Paperclip, Smile, Send, Loader2, X, Download } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDateTime } from '../../utils/format';

type SupportConversation = {
  id: string;
  user_email: string;
  last_message: string | null;
  status: string;
  assigned_to: string | null;
  assigned_email: string | null;
  updated_at: string;
};

type SupportMessage = {
  id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  attachments?: string[];
  created_at: string;
};

type AdminSupportViewProps = {
  conversations: SupportConversation[];
  selectedConvId: string | null;
  messages: SupportMessage[];
  convDetail: { user_email: string; status?: string; assigned_to?: string | null; assigned_email?: string | null; admin_notes?: string | null; tags?: string | null } | null;
  searchInput: string;
  statusFilter: 'all' | 'open' | 'closed';
  tagFilter: string;
  convLoading: boolean;
  userTyping: boolean;
  userOnline: boolean;
  pendingAttachments: { url: string; filename?: string }[];
  input: string;
  sending: boolean;
  admins: { id: string; email: string; name?: string }[];
  menuOpen: boolean;
  emojiPickerOpen: boolean;
  loading: boolean;
  error: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelectConv: (id: string) => void;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: 'all' | 'open' | 'closed') => void;
  onTagFilterChange: (v: string) => void;
  onUpdateConv: (updates: { status?: 'open' | 'closed'; assigned_to?: string | null; admin_notes?: string | null; tags?: string | null }) => void;
  onExportConversation: (format: 'json' | 'txt') => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown: (e: React.KeyboardEvent) => void;
  onRemoveAttachment: (url: string) => void;
  onAttachFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onEmojiClick?: (emoji: string) => void;
  setMenuOpen: (v: boolean) => void;
  setEmojiPickerOpen: (v: boolean) => void;
  setInput: (v: string) => void;
};

export default function AdminSupportView({
  conversations,
  selectedConvId,
  messages,
  convDetail,
  searchInput,
  statusFilter,
  tagFilter,
  convLoading,
  userTyping,
  userOnline,
  pendingAttachments,
  input,
  sending,
  admins,
  menuOpen,
  emojiPickerOpen,
  loading,
  error,
  menuRef,
  fileInputRef,
  inputRef,
  emojiPickerRef,
  messagesEndRef,
  onSelectConv,
  onSearchChange,
  onStatusFilterChange,
  onTagFilterChange,
  onUpdateConv,
  onExportConversation,
  onInputChange,
  onInputKeyDown,
  onRemoveAttachment,
  onAttachFile,
  onSend,
  onEmojiClick,
  setMenuOpen,
  setEmojiPickerOpen,
  setInput,
}: AdminSupportViewProps) {
  const { t } = useTranslation();
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');

  const AdminNotesSection = ({ convDetail: cd, onUpdateConv: upd, setMenuOpen: _ }: { convDetail: typeof convDetail; onUpdateConv: typeof onUpdateConv; setMenuOpen: (v: boolean) => void }) => {
    if (!cd) return null;
    const showNotes = notesEditing || (cd.admin_notes && cd.admin_notes.length > 0);
    const saveNotes = () => {
      upd({ admin_notes: notesDraft || null });
      setNotesEditing(false);
    };
    const saveTags = () => {
      upd({ tags: tagsDraft.trim() || null });
    };
    return (
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/50 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">{t('admin.tags')}</label>
          <input
            type="text"
            value={tagsDraft || cd.tags || ''}
            onChange={(e) => setTagsDraft(e.target.value)}
            onBlur={saveTags}
            placeholder={t('admin.tagsPlaceholder')}
            className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">{t('admin.adminNotes')}</label>
            {!notesEditing && <button onClick={() => { setNotesDraft(cd.admin_notes || ''); setNotesEditing(true); }} className="text-xs text-indigo-600 hover:underline">{showNotes ? t('admin.edit') : t('admin.add')}</button>}
          </div>
          {notesEditing ? (
            <div className="mt-1 flex gap-2">
              <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded" rows={2} placeholder={t('admin.internalNotes')} />
              <button onClick={saveNotes} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">{t('admin.save')}</button>
              <button onClick={() => { setNotesEditing(false); setNotesDraft(''); }} className="px-2 py-1 text-xs border border-slate-200 rounded">{t('admin.cancel')}</button>
            </div>
          ) : showNotes ? (
            <p className="mt-1 text-sm text-slate-700 bg-white px-2 py-1 rounded border border-slate-100">{cd.admin_notes}</p>
          ) : null}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (convDetail) {
      setNotesDraft(convDetail.admin_notes || '');
      setTagsDraft(convDetail.tags || '');
      setNotesEditing(false);
    }
  }, [selectedConvId, convDetail?.admin_notes, convDetail?.tags]);

  const formatDateLabel = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('admin.today');
    if (d.toDateString() === yesterday.toDateString()) return t('admin.yesterday');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0" style={{ maxHeight: '88vh' }}>
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-e border-slate-200 flex flex-col min-h-0 shrink-0">
          <div className="px-4 py-3 border-b border-slate-200 shrink-0 space-y-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-slate-500" />
              {t('admin.conversations')}
            </h2>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by email..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'open', 'closed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusFilterChange(s)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === s ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  {s === 'all' ? t('admin.all') : s === 'open' ? t('admin.open') : t('admin.closed')}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => onTagFilterChange(e.target.value)}
              placeholder="Filter by tag (e.g. billing)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectConv(c.id)}
                    className={`w-full text-start px-4 py-3 hover:bg-slate-50 transition-colors ${selectedConvId === c.id ? 'bg-indigo-50 border-s-2 border-indigo-600' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 truncate">{c.user_email || 'Unknown'}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${c.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {c.status || 'open'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{c.last_message || 'No messages'}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-400">{c.updated_at ? formatDateTime(c.updated_at) : ''}</span>
                      {c.assigned_email && <span className="text-[10px] text-indigo-600 truncate max-w-[80px]" title={c.assigned_email}>{c.assigned_email}</span>}
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {selectedConvId ? (
            <>
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-800 truncate">{convDetail?.user_email || 'Conversation'}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {userOnline && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    )}
                    {convDetail?.assigned_email && (
                      <span className="text-xs text-slate-500">Assigned: {convDetail.assigned_email}</span>
                    )}
                  </div>
                </div>
                <div ref={menuRef as React.RefObject<HTMLDivElement>} className="relative shrink-0">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1 text-sm text-slate-600"
                  >
                    <Settings className="w-4 h-4" />
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50">
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase">Export</div>
                      <button onClick={() => { onExportConversation('json'); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export as JSON
                      </button>
                      <button onClick={() => { onExportConversation('txt'); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export as Text
                      </button>
                      <div className="border-t border-slate-100 my-2" />
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase">Status</div>
                      <button onClick={() => { onUpdateConv({ status: 'open' }); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${convDetail?.status === 'open' ? 'text-indigo-600 font-medium' : 'text-slate-700'}`}>Open</button>
                      <button onClick={() => { onUpdateConv({ status: 'closed' }); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${convDetail?.status === 'closed' ? 'text-indigo-600 font-medium' : 'text-slate-700'}`}>Closed</button>
                      <div className="border-t border-slate-100 my-2" />
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase">Assign to</div>
                      <button onClick={() => { onUpdateConv({ assigned_to: null }); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${!convDetail?.assigned_to ? 'text-indigo-600 font-medium' : 'text-slate-700'}`}>Unassigned</button>
                      {admins.map((a) => (
                        <button key={a.id} onClick={() => { onUpdateConv({ assigned_to: a.id }); setMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${convDetail?.assigned_to === a.id ? 'text-indigo-600 font-medium' : 'text-slate-700'}`}>{a.email}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <AdminNotesSection convDetail={convDetail} onUpdateConv={onUpdateConv} setMenuOpen={setMenuOpen} />
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {convLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-slate-100 animate-pulse h-16 w-48" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {(() => {
                      let lastDate = '';
                      return messages.flatMap((msg) => {
                        const d = new Date(msg.created_at);
                        const dateKey = d.toDateString();
                        const parts: React.ReactNode[] = [];
                        if (dateKey !== lastDate) {
                          lastDate = dateKey;
                          parts.push(
                            <div key={`sep-${msg.id}`} className="flex justify-center py-2">
                              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{formatDateLabel(d)}</span>
                            </div>
                          );
                        }
                        parts.push(
                          <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.sender_type === 'admin' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                              <p className={`text-xs font-medium mb-1 ${msg.sender_type === 'admin' ? 'text-indigo-200' : 'text-slate-500'}`}>
                                {msg.sender_type === 'admin' ? 'You' : (convDetail?.user_email || 'User')}
                              </p>
                              {(msg.attachments?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {msg.attachments!.map((url) => {
                                    const ext = url.split('.').pop()?.toLowerCase() || '';
                                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                    return isImage ? (
                                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img src={url} alt="" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                                      </a>
                                    ) : (
                                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${msg.sender_type === 'admin' ? 'bg-indigo-500/50 hover:bg-indigo-500/70 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}>
                                        <FileText className="w-4 h-4" />
                                        {url.split('/').pop() || 'Download'}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                              {msg.content?.trim() !== ' ' && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                              <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-indigo-200' : 'text-slate-500'}`} title={new Date(msg.created_at).toLocaleString()}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                        return parts;
                      });
                    })()}
                    {userTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-bl-md px-4 py-2 text-sm">User is typing...</div>
                      </div>
                    )}
                    <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
                  </>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 space-y-2 shrink-0">
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((a) => {
                      const ext = a.url.split('.').pop()?.toLowerCase() || '';
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                      return (
                        <div key={a.url} className="relative">
                          {isImage ? (
                            <img src={a.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg border border-slate-200 flex flex-col items-center justify-center bg-slate-50 p-1">
                              <FileText className="w-6 h-6 text-slate-500" />
                              <span className="text-[10px] truncate w-full text-center">{a.filename || a.url.split('/').pop()}</span>
                            </div>
                          )}
                          <button type="button" onClick={() => onRemoveAttachment(a.url)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={onAttachFile} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Attach file">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div ref={emojiPickerRef as React.RefObject<HTMLDivElement>} className="relative flex-1 flex">
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={input}
                      onChange={onInputChange}
                      onKeyDown={onInputKeyDown}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setEmojiPickerOpen(!emojiPickerOpen); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" title="Add emoji">
                      <Smile className="w-5 h-5" />
                    </button>
                    {emojiPickerOpen && (
                      <div className="absolute bottom-full right-0 mb-1 z-50" onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            const pos = inputRef.current?.selectionStart ?? input.length;
                            const before = input.slice(0, pos);
                            const after = input.slice(pos);
                            setInput(before + emojiData.emoji + after);
                            requestAnimationFrame(() => {
                              inputRef.current?.focus();
                              const newPos = pos + emojiData.emoji.length;
                              inputRef.current?.setSelectionRange(newPos, newPos);
                            });
                            onEmojiClick?.(emojiData.emoji);
                          }}
                          width={320}
                          height={360}
                        />
                      </div>
                    )}
                  </div>
                  <button onClick={onSend} disabled={(!input.trim() && pendingAttachments.length === 0) || sending} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p>Select a conversation to view and reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
