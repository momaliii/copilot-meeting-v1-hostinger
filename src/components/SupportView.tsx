import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, FileText, Image, Send, Smile, X, AlertCircle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDate, formatDateTime, formatTime } from '../utils/format';
import { Loader2 } from 'lucide-react';

type SupportMessage = {
  id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  attachments?: string[];
  created_at: string;
};

type SupportViewProps = {
  user: { id: string } | null;
  supportMessages: SupportMessage[];
  supportConversationLoading: boolean;
  supportConversationError: string | null;
  supportInput: string;
  setSupportInput: (v: string) => void;
  supportSending: boolean;
  supportTyping: boolean;
  supportOnline: boolean;
  supportPendingAttachments: { url: string; filename?: string }[];
  setSupportPendingAttachments: React.Dispatch<React.SetStateAction<{ url: string; filename?: string }[]>>;
  showSupportEmojiPicker: boolean;
  setShowSupportEmojiPicker: (v: boolean | ((p: boolean) => boolean)) => void;
  onSend: () => void;
  onAttachFile: (file: File) => Promise<{ url: string; filename?: string } | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSignIn: () => void;
  onRetry: () => void;
};

export default function SupportView({
  user,
  supportMessages,
  supportConversationLoading,
  supportConversationError,
  supportInput,
  setSupportInput,
  supportSending,
  supportTyping,
  supportOnline,
  supportPendingAttachments,
  setSupportPendingAttachments,
  showSupportEmojiPicker,
  setShowSupportEmojiPicker,
  onSend,
  onAttachFile,
  onInputChange,
  onSignIn,
  onRetry,
}: SupportViewProps) {
  const { t } = useTranslation();
  const supportImageInputRef = useRef<HTMLInputElement>(null);
  const supportInputRef = useRef<HTMLTextAreaElement>(null);
  const supportEmojiPickerRef = useRef<HTMLDivElement>(null);
  const supportMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supportMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages]);

  useEffect(() => {
    if (!showSupportEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (supportEmojiPickerRef.current && !supportEmojiPickerRef.current.contains(e.target as Node)) {
        setShowSupportEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSupportEmojiPicker, setShowSupportEmojiPicker]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div
        className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-0 min-h-[320px] sm:min-h-[400px]"
        style={{ maxHeight: '88vh' }}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <MessageCircle className="w-5 h-5 text-slate-500" />
          <span className="font-medium text-slate-800">{t('support.title')}</span>
          {user && supportOnline && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t('support.online')}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {!user ? (
            <div className="text-center py-12 text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-600">{t('support.signInPrompt')}</p>
              <button
                onClick={onSignIn}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                {t('support.signInCta')}
              </button>
            </div>
          ) : supportConversationLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 animate-pulse ${i % 2 === 0 ? 'bg-indigo-100' : 'bg-slate-100'}`}
                  >
                    <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : supportConversationError ? (
            <div className="text-center py-12 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
              <p className="font-medium text-slate-600">{supportConversationError}</p>
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                {t('support.retry')}
              </button>
            </div>
          ) : supportMessages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-600">{t('support.noMessages')}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[t('support.suggestedPrompt1'), t('support.suggestedPrompt2'), t('support.suggestedPrompt3')].map(
                  (prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setSupportInput(prompt)}
                      className="px-3 py-2 text-sm bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                    >
                      {prompt}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            (() => {
              const formatDateLabel = (d: Date) => {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                if (d.toDateString() === today.toDateString()) return t('support.today');
                if (d.toDateString() === yesterday.toDateString()) return t('support.yesterday');
                return formatDate(d);
              };
              let lastDate = '';
              return supportMessages.flatMap((msg) => {
                const d = new Date(msg.created_at);
                const dateKey = d.toDateString();
                const parts: React.ReactNode[] = [];
                if (dateKey !== lastDate) {
                  lastDate = dateKey;
                  parts.push(
                    <div key={`sep-${msg.id}`} className="flex justify-center py-2">
                      <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                        {formatDateLabel(d)}
                      </span>
                    </div>
                  );
                }
                parts.push(
                  <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        msg.sender_type === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      <p
                        className={`text-xs font-medium mb-1 ${msg.sender_type === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}
                      >
                        {msg.sender_type === 'user' ? t('support.you') : t('support.support')}
                      </p>
                      {(msg.attachments?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {msg.attachments!.map((url) => {
                            const ext = url.split('.').pop()?.toLowerCase() || '';
                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                            return isImage ? (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={url}
                                  alt=""
                                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${msg.sender_type === 'user' ? 'bg-indigo-500/50 hover:bg-indigo-500/70 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                              >
                                <FileText className="w-4 h-4" />
                                {url.split('/').pop() || 'Download'}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {msg.content.trim() !== ' ' && (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${msg.sender_type === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}
                        title={formatDateTime(msg.created_at)}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
                return parts;
              });
            })()
          )}
          {user && !supportConversationLoading && !supportConversationError && supportTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-bl-md px-4 py-2 text-sm">
                {t('support.supportTyping')}
              </div>
            </div>
          )}
          <div ref={supportMessagesEndRef} />
        </div>
        {user && !supportConversationLoading && !supportConversationError && (
          <div className="p-4 border-t border-slate-200 space-y-2 shrink-0">
            {supportPendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {supportPendingAttachments.map((a) => {
                  const ext = a.url.split('.').pop()?.toLowerCase() || '';
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                  return (
                    <div key={a.url} className="relative">
                      {isImage ? (
                        <img
                          src={a.url}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-slate-200 flex flex-col items-center justify-center bg-slate-50 p-1">
                          <FileText className="w-6 h-6 text-slate-500" />
                          <span className="text-[10px] truncate w-full text-center">
                            {a.filename || a.url.split('/').pop()}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSupportPendingAttachments((p) => p.filter((x) => x.url !== a.url))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={supportImageInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const result = await onAttachFile(file);
                  if (result) setSupportPendingAttachments((p) => [...p, result]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => supportImageInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                title={t('support.attachFile')}
              >
                <Image className="w-5 h-5" />
              </button>
              <div ref={supportEmojiPickerRef} className="relative flex-1 flex">
                <textarea
                  ref={supportInputRef}
                  rows={2}
                  value={supportInput}
                  onChange={onInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder={t('support.typeMessage')}
                  className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSupportEmojiPicker((p) => !p);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  title={t('support.addEmoji')}
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showSupportEmojiPicker && (
                  <div
                    className="absolute bottom-full right-0 mb-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        const input = supportInputRef.current;
                        const pos = input?.selectionStart ?? supportInput.length;
                        const before = supportInput.slice(0, pos);
                        const after = supportInput.slice(pos);
                        setSupportInput(before + emojiData.emoji + after);
                        requestAnimationFrame(() => {
                          input?.focus();
                          const newPos = pos + emojiData.emoji.length;
                          input?.setSelectionRange(newPos, newPos);
                        });
                      }}
                      width={320}
                      height={360}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={onSend}
                disabled={
                  (!supportInput.trim() && supportPendingAttachments.length === 0) || supportSending
                }
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {supportSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {t('support.send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
