export type TimeFilterRange =
  | 'today'
  | 'week'
  | 'month'
  | '6months'
  | '1year'
  | 'custom';

export interface WorkflowItem {
  id: string;
  sheetName?: string; // Target worksheet name (default: "Untitled Worksheet")
  date: string; // YYYY-MM-DD
  work1: string; // Mandatory
  work2?: string;
  work3?: string;
  work4?: string;
  workHours?: string; // Logged hours worked (e.g., "7.5", "8")
  workDueHours?: string; // Due/Pending hours
  signature?: string; // Data URL / Base64 string
  submittedAt: string; // ISO string
}

export interface MonthSection {
  monthKey: string; // e.g., "2026-09"
  monthTitle: string; // e.g., "September 2026"
  rows: WorkflowItem[];
}

export interface VoiceState {
  isListening: boolean;
  activeField: string | null;
  transcript: string;
  error: string | null;
  lang: 'bn-BD' | 'en-US';
}

