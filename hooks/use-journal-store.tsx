import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import { JournalEntry, DAILY_PROMPTS } from '@/types/journal';
import { useAuth } from '@/hooks/use-auth-store';
import { getUserJournal, saveUserJournal } from '@/lib/firebase';

const getStorageKey = (userId: string) => `journal_entries_${userId}`;

export const [JournalProvider, useJournal] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const userId = user?.id || 'default';
  const isRealUser = !!user?.id && !user.id.startsWith('dev_guest_');
  const storageKey = getStorageKey(userId);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = currentUserId;
      return;
    }
    if (prevUserIdRef.current !== currentUserId) {
      console.log('[JournalStore] User changed from', prevUserIdRef.current, 'to', currentUserId, '- resetting');
      setEntries([]);
      queryClient.removeQueries({ queryKey: ['journal'] });
      prevUserIdRef.current = currentUserId;
    }
  }, [user?.id, queryClient]);

  const entriesQuery = useQuery({
    queryKey: ['journal', userId, storageKey],
    queryFn: async () => {
      console.log('[JournalStore] Loading entries for user:', userId);

      if (isRealUser) {
        try {
          const firebaseEntries = await getUserJournal(userId);
          if (firebaseEntries && firebaseEntries.length > 0) {
            console.log('[JournalStore] Loaded from Firebase:', firebaseEntries.length);
            await AsyncStorage.setItem(storageKey, JSON.stringify(firebaseEntries));
            return firebaseEntries;
          } else {
            console.log('[JournalStore] No entries in Firebase - new user');
            await AsyncStorage.removeItem(storageKey);
            return [] as JournalEntry[];
          }
        } catch (error) {
          console.warn('[JournalStore] Firebase load failed, falling back to local:', error);
        }
      }

      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const localEntries = JSON.parse(stored) as JournalEntry[];
        console.log('[JournalStore] Loaded from local:', localEntries.length);

        if (isRealUser && localEntries.length > 0) {
          console.log('[JournalStore] Syncing local entries to Firebase...');
          saveUserJournal(userId, localEntries).catch(e =>
            console.warn('[JournalStore] Background sync failed:', e)
          );
        }
        return localEntries;
      }

      return [] as JournalEntry[];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (entriesQuery.data) {
      setEntries(entriesQuery.data);
    }
  }, [entriesQuery.data]);

  const saveEntriesMutation = useMutation({
    mutationFn: async (newEntries: JournalEntry[]) => {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newEntries));
      if (isRealUser) {
        saveUserJournal(userId, newEntries).catch(e =>
          console.warn('[JournalStore] Firebase save failed:', e)
        );
      }
      return newEntries;
    },
  });

  const saveEntries = async (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    saveEntriesMutation.mutate(newEntries);
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
      console.log('[JournalStore] Error generating AI insight:', error);
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
    isLoading: entriesQuery.isLoading,
    isGeneratingInsight,
    getTodayPrompt,
    getTodayEntry,
    getRecentEntries,
    addEntry,
    getStreak,
  };
});
