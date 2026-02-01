import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { generateText } from '@rork-ai/toolkit-sdk';
import { JournalEntry, DAILY_PROMPTS } from '@/types/journal';

const STORAGE_KEY = 'journal_entries';

export const [JournalProvider, useJournal] = createContextHook(() => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntries = async (newEntries: JournalEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (error) {
      console.log('Error saving journal entries:', error);
    }
  };

  const getTodayPrompt = useCallback(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
  }, []);

  const getTodayEntry = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return entries.find(e => e.date === today);
  }, [entries]);

  const getRecentEntries = useCallback((count: number = 7) => {
    return [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }, [entries]);

  const generateAIInsight = async (content: string, recentEntries: JournalEntry[]): Promise<string> => {
    try {
      const recentContext = recentEntries
        .slice(0, 5)
        .map(e => `${e.date}: ${e.content}`)
        .join('\n');

      const prompt = `You are a supportive wellness coach. Based on the user's journal entry and recent history, provide a brief, encouraging insight (1-2 sentences max). Be specific and motivational. Focus on positive patterns, growth, or encouragement.

Recent entries:
${recentContext || 'No previous entries'}

Today's entry: ${content}

Provide a short, personalized insight (like "Your motivation is up 20%!" or "I notice you're building momentum!"):`;

      const insight = await generateText({
        messages: [{ role: 'user', content: prompt }]
      });

      return insight || "Great job reflecting today! 🌟";
    } catch (error) {
      console.log('Error generating AI insight:', error);
      return "Thanks for sharing! Keep up the reflection habit! ✨";
    }
  };

  const addEntry = async (content: string, mood?: JournalEntry['mood']) => {
    setIsGeneratingInsight(true);
    
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = entries.findIndex(e => e.date === today);
    
    const recentEntries = getRecentEntries(5);
    const aiInsight = await generateAIInsight(content, recentEntries);

    const newEntry: JournalEntry = {
      id: existingIndex >= 0 ? entries[existingIndex].id : Date.now().toString(),
      date: today,
      content,
      prompt: getTodayPrompt(),
      aiInsight,
      mood,
      createdAt: new Date().toISOString(),
    };

    let newEntries: JournalEntry[];
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = newEntry;
    } else {
      newEntries = [...entries, newEntry];
    }

    await saveEntries(newEntries);
    setIsGeneratingInsight(false);
    
    return newEntry;
  };

  const getStreak = useCallback(() => {
    if (entries.length === 0) return 0;
    
    const sortedDates = [...new Set(entries.map(e => e.date))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const entryDate = new Date(sortedDates[i]);
      entryDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && entryDate.getTime() === new Date(today.getTime() - 86400000).getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }, [entries]);

  return {
    entries,
    isLoading,
    isGeneratingInsight,
    getTodayPrompt,
    getTodayEntry,
    getRecentEntries,
    addEntry,
    getStreak,
  };
});
