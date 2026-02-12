import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ManifestationSession, ManifestationSettings, ManifestationStats } from '@/types/manifestation';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';
import { getUserManifestations, saveUserManifestations } from '@/lib/firebase';

const getStorageKeys = (userId: string) => ({
  SESSIONS: `manifestation_sessions_${userId}`,
  SETTINGS: `manifestation_settings_${userId}`,
});

const DEFAULT_SETTINGS: ManifestationSettings = {
  sessionDuration: 3,
  enableVoiceRecording: false,
  enableHapticFeedback: true,
  enableMorningReminder: true,
  enableEveningReminder: false,
  reminderTime: '08:00',
};

export const [ManifestationProvider, useManifestationStore] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessions, setSessions] = useState<ManifestationSession[]>([]);
  const [settings, setSettings] = useState<ManifestationSettings>(DEFAULT_SETTINGS);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const userId = user?.id || 'default';
  const isRealUser = !!user?.id && !user.id.startsWith('dev_guest_');
  const STORAGE_KEYS = getStorageKeys(userId);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = currentUserId;
      return;
    }
    if (prevUserIdRef.current !== currentUserId) {
      console.log('[ManifestationStore] User changed, resetting');
      setSessions([]);
      setSettings(DEFAULT_SETTINGS);
      prevUserIdRef.current = currentUserId;
    }
  }, [user?.id]);

  const syncToFirebase = useCallback((newSessions: ManifestationSession[], newSettings: ManifestationSettings) => {
    if (isRealUser) {
      const serializedSessions = newSessions.map(s => ({
        ...s,
        completedAt: s.completedAt instanceof Date ? s.completedAt.toISOString() : s.completedAt,
      }));
      saveUserManifestations(userId, { sessions: serializedSessions, settings: newSettings }).catch(e =>
        console.warn('[ManifestationStore] Firebase sync failed:', e)
      );
    }
  }, [isRealUser, userId]);

  const sessionsQuery = useQuery({
    queryKey: ['manifestation-sessions', userId],
    queryFn: async () => {
      console.log('[ManifestationStore] Loading sessions for user:', userId);

      if (isRealUser) {
        try {
          const firebaseData = await getUserManifestations(userId);
          if (firebaseData && firebaseData.sessions.length > 0) {
            console.log('[ManifestationStore] Loaded from Firebase:', firebaseData.sessions.length);
            const parsed = firebaseData.sessions.map((s: any) => ({
              ...s,
              completedAt: new Date(s.completedAt),
            }));
            await safeStorageSet(STORAGE_KEYS.SESSIONS, firebaseData.sessions);
            if (firebaseData.settings) {
              await safeStorageSet(STORAGE_KEYS.SETTINGS, firebaseData.settings);
            }
            return parsed;
          }
        } catch (error) {
          console.warn('[ManifestationStore] Firebase load failed:', error);
        }
      }

      const data = await safeStorageGet(STORAGE_KEYS.SESSIONS, []);
      const parsed = data.map((session: any) => ({
        ...session,
        completedAt: new Date(session.completedAt)
      }));

      if (isRealUser && parsed.length > 0) {
        const localSettings = await safeStorageGet(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        saveUserManifestations(userId, { sessions: data, settings: localSettings }).catch(e =>
          console.warn('[ManifestationStore] Background sync failed:', e)
        );
      }

      return parsed;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['manifestation-settings', userId],
    queryFn: async () => {
      if (isRealUser) {
        try {
          const firebaseData = await getUserManifestations(userId);
          if (firebaseData?.settings) {
            console.log('[ManifestationStore] Settings loaded from Firebase');
            await safeStorageSet(STORAGE_KEYS.SETTINGS, firebaseData.settings);
            return firebaseData.settings as ManifestationSettings;
          }
        } catch (error) {
          console.warn('[ManifestationStore] Firebase settings load failed:', error);
        }
      }
      return await safeStorageGet(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    },
  });

  useEffect(() => {
    if (sessionsQuery.data) {
      setSessions(sessionsQuery.data);
    }
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveSessionsMutation = useMutation({
    mutationFn: async (newSessions: ManifestationSession[]) => {
      const serialized = newSessions.map(s => ({
        ...s,
        completedAt: s.completedAt instanceof Date ? s.completedAt.toISOString() : s.completedAt,
      }));
      await safeStorageSet(STORAGE_KEYS.SESSIONS, serialized);
      return newSessions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestation-sessions', userId] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: ManifestationSettings) => {
      await safeStorageSet(STORAGE_KEYS.SETTINGS, newSettings);
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestation-settings', userId] });
    },
  });

  const addSession = (sessionData: Omit<ManifestationSession, 'id' | 'completedAt'>) => {
    const newSession: ManifestationSession = {
      ...sessionData,
      id: Date.now().toString(),
      completedAt: new Date(),
    };
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    saveSessionsMutation.mutate(updatedSessions);
    syncToFirebase(updatedSessions, settings);
  };

  const updateSettings = (newSettings: Partial<ManifestationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettingsMutation.mutate(updatedSettings);
    syncToFirebase(sessions, updatedSettings);
  };

  const generateAffirmations = (goalTitle: string, goalDescription: string): string[] => {
    const baseAffirmations = [
      'I have already achieved my dream and live in harmony with myself',
      'Every day I become the best version of myself',
      'My energy and focus are directed towards positive changes',
      'I feel joy from every step on my path',
      'My actions naturally lead me to success and happiness',
    ];
    
    if (goalTitle.toLowerCase().includes('weight') || goalTitle.toLowerCase().includes('lose') || goalTitle.toLowerCase().includes('fit')) {
      baseAffirmations.push(
        'I feel lightness in my body and move with energy every day',
        'My healthy habits bring joy and results',
        'My body is grateful for the care and responds with positive changes'
      );
    } else if (goalTitle.toLowerCase().includes('career') || goalTitle.toLowerCase().includes('work') || goalTitle.toLowerCase().includes('job')) {
      baseAffirmations.push(
        'I attract opportunities that align with my goals',
        'My skills and talents are recognized and valued',
        'I confidently move towards professional success'
      );
    } else if (goalTitle.toLowerCase().includes('relationship') || goalTitle.toLowerCase().includes('love')) {
      baseAffirmations.push(
        'I attract healthy and harmonious relationships',
        'My love for myself is reflected in relationships with others',
        'I am open to deep and meaningful connections'
      );
    }
    
    return baseAffirmations.slice(0, 5);
  };

  const generateGratitudes = (goalTitle: string): string[] => {
    return [
      'I am grateful for the opportunity to grow and develop every day',
      'Thank you for the support of body and mind on this journey',
      'I appreciate every step that brings me closer to my dream',
      'I am grateful for the strength and motivation to keep moving forward',
      'Thank you for all the lessons and growth on my life path',
    ];
  };

  const getStats = (): ManifestationStats => {
    const now = new Date();
    const today = now.toDateString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todaySessions = sessions.filter(s => s.completedAt.toDateString() === today);
    const weekSessions = sessions.filter(s => s.completedAt >= weekStart);
    const monthSessions = sessions.filter(s => s.completedAt >= monthStart);
    
    const totalTime = sessions.reduce((total, s) => total + s.duration, 0);
    
    const sessionsWithMood = sessions.filter(s => s.moodBefore && s.moodAfter);
    const averageMoodImprovement = sessionsWithMood.length > 0
      ? sessionsWithMood.reduce((total, s) => total + (s.moodAfter! - s.moodBefore!), 0) / sessionsWithMood.length
      : 0;
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const sortedDates = [...new Set(sessions.map(s => s.completedAt.toDateString()))].sort();
    
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(now.getTime() - (sortedDates.length - 1 - i) * 24 * 60 * 60 * 1000);
      
      if (date.toDateString() === expectedDate.toDateString()) {
        tempStreak++;
        if (i === sortedDates.length - 1) currentStreak = tempStreak;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);
    
    return {
      totalSessions: sessions.length,
      totalTime,
      averageMoodImprovement,
      currentStreak,
      bestStreak,
      weekSessions: weekSessions.length,
      monthSessions: monthSessions.length,
    };
  };

  const getTodaySessions = () => {
    const today = new Date().toDateString();
    return sessions.filter(s => s.completedAt.toDateString() === today);
  };

  return {
    sessions,
    settings,
    isLoading: sessionsQuery.isLoading || settingsQuery.isLoading,
    isReady: !sessionsQuery.isLoading && !settingsQuery.isLoading,
    addSession,
    updateSettings,
    generateAffirmations,
    generateGratitudes,
    getStats,
    getTodaySessions,
  };
});
