export type AnalysisResult = {
  transcript: string;
  speakerNames?: Record<string, string>;
  summary: string;
  summaryConfidence?: number;
  actionItems: { task: string; assignee?: string; confidence?: number; completed?: boolean }[];
  keyDecisions: any[];
  sentiment: string;
  sentimentTrend?: { timeSegment: string; sentiment: string; score: number }[];
  followUpEmail: string;
  topics?: { name: string; description: string; confidence?: number }[];
  risks?: any[];
  questions?: any[];
};

export type Meeting = {
  id: string;
  date: string;
  title: string;
  analysis: AnalysisResult;
  audioBlob?: Blob;
  videoBlob?: Blob;
  analysisLanguage?: string;
  originalAnalysis?: AnalysisResult;
  translationCache?: Record<string, AnalysisResult>;
  synced?: boolean;
  mediaUrl?: string;
};
