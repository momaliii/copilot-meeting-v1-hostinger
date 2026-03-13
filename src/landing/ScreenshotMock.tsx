import { useState } from 'react';
import { Users, FileText, CheckSquare, Activity } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useBranding } from '../contexts/BrandingContext';

export default function ScreenshotMock() {
  const { siteName } = useBranding();
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'actions' | 'sentiment'>('summary');
  const reduceMotion = useReducedMotion();

  const tabs: { id: 'transcript' | 'summary' | 'actions' | 'sentiment'; label: string }[] = [
    { id: 'transcript', label: 'Transcript' },
    { id: 'summary', label: 'Summary' },
    { id: 'actions', label: 'Action Items' },
    { id: 'sentiment', label: 'Sentiment' }
  ];

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Soft gradient glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[2rem] blur-2xl opacity-25"></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col ring-1 ring-slate-100">
        {/* Window Chrome */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          </div>
          <div className="text-xs font-medium text-slate-500">{siteName} — Preview</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            AI Analysis
          </div>
        </div>

        <div className="px-5 pt-4 bg-slate-50/50 border-b border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 bg-slate-50/50 min-h-[270px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'transcript' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Transcript</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-semibold text-slate-900">Speaker A:</span> <span className="text-slate-600">We should ship the MVP this week and test with 10 users.</span></p>
                    <p><span className="font-semibold text-slate-900">Speaker B:</span> <span className="text-slate-600">Agreed. Let&apos;s prioritize calendar attach and better error handling.</span></p>
                    <p><span className="font-semibold text-slate-900">Speaker A:</span> <span className="text-slate-600">I&apos;ll share owners and deadlines after this call.</span></p>
                  </div>
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Summary</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The team aligned on MVP scope, agreed to run a 10-user pilot this week, and prioritized calendar attach and reliability fixes as the next release focus.
                  </p>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Action Items</span>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
                      <span>Launch pilot with 10 users by Friday.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
                      <span>Finalize calendar summary attachment flow.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
                      <span>Share rollout checklist and owners.</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === 'sentiment' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-violet-500" />
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Sentiment</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">Positive</div>
                    <div className="text-xs text-slate-500 mt-1">Trend: improving across final 20 mins</div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-medium text-slate-400">Score</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+42</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[70%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
