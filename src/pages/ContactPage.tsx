import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

export default function ContactPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: String(name || '').trim(),
        email: String(email || '').trim(),
        subject: String(subject || '').trim(),
        message: String(message || '').trim(),
      };
      if (!payload.name || !payload.email || !payload.subject || !payload.message) {
        setError(t('contact.error'));
        return;
      }
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || t('contact.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4 font-heading">{t('contact.title')}</h1>
        <p className="text-lg text-slate-600 mb-12 font-body">{t('contact.subtitle')}</p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <p className="text-emerald-700 font-medium">{t('contact.success')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact.name')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('contact.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('contact.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact.subject')}</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('contact.subjectPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact.message')}</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                placeholder={t('contact.messagePlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {t('contact.submit')}
            </button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
