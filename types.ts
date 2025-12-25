
export enum Language {
  ENGLISH = 'English',
  CANTONESE = 'Cantonese (廣東話)',
  CHINESE = 'Mandarin/Chinese (中文)',
  GERMAN = 'German (Deutsch)',
  JAPANESE = 'Japanese (日本語)'
}

export interface SummaryResult {
  transcript: string;
  summary: string[];
  classification: string;
  suggestedTitle: string;
  artistInfo?: string; // Optional: "Artist - Song" or "Unknown - Unknown" for music
}

export interface GroupSummary {
  collectiveSummary: string[];
  dataBreakdown: { label: string; count: number }[];
  overallThemes: string;
}

export interface HistoryItem extends SummaryResult {
  id: string;
  timestamp: number;
  language: Language;
  customName: string;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
}

export type AppStatus = 'idle' | 'recording' | 'processing' | 'completed' | 'error';
