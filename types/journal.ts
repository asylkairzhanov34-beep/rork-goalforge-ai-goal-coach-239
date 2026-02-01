export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  prompt: string;
  aiInsight?: string;
  mood?: 'great' | 'good' | 'okay' | 'low' | 'stressed';
  createdAt: string;
}

export interface JournalState {
  entries: JournalEntry[];
  isLoading: boolean;
}

export const DAILY_PROMPTS = [
  "What went well today?",
  "What are you grateful for?",
  "What's one win you had today?",
  "What made you smile today?",
  "What progress did you make?",
  "What did you learn today?",
  "What's something you're proud of?",
  "How did you grow today?",
];
