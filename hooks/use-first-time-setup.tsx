import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import {
  FirstTimeProfile,
  FirstTimeProfileSerialized,
  FirstTimeSetupState,
} from '@/types/first-time-setup';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { useAuth } from '@/hooks/use-auth-store';
import { saveUserProfile, getUserProfile, updateUserProfile } from '@/lib/firebase';

const getFirstTimeSetupKey = (userId: string) => `first_time_setup_${userId}`;

type FirestoreTimestampLike = {
  toDate?: () => Date;
};

export const [FirstTimeSetupProvider, useFirstTimeSetup] = createContextHook(() => {
  const auth = useAuth();
  const user = auth?.user;
  const [state, setState] = useState<FirstTimeSetupState>({
    profile: null,
    currentStep: 0,
    isLoading: true,
  });

  const FIRST_TIME_SETUP_KEY = getFirstTimeSetupKey(user?.id || 'default');

  const serializeProfile = useCallback((profile: FirstTimeProfile): FirstTimeProfileSerialized => {
    return {
      ...profile,
      birthdate: profile.birthdate?.toISOString(),
    };
  }, []);

  const deserializeProfile = useCallback((raw: unknown): FirstTimeProfile | null => {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const obj = raw as Record<string, unknown>;

    const nickname = typeof obj.nickname === 'string' ? obj.nickname : '';
    const isCompleted = typeof obj.isCompleted === 'boolean' ? obj.isCompleted : false;

    const rawBirthdate = obj.birthdate as unknown;

    let birthdate: Date | null = null;
    if (rawBirthdate instanceof Date) {
      birthdate = rawBirthdate;
    } else if (typeof rawBirthdate === 'string') {
      const parsed = new Date(rawBirthdate);
      if (!Number.isNaN(parsed.getTime())) {
        birthdate = parsed;
      }
    } else if (rawBirthdate && typeof rawBirthdate === 'object') {
      const maybeTimestamp = rawBirthdate as FirestoreTimestampLike;
      if (typeof maybeTimestamp.toDate === 'function') {
        try {
          const asDate = maybeTimestamp.toDate();
          if (asDate instanceof Date && !Number.isNaN(asDate.getTime())) {
            birthdate = asDate;
          }
        } catch (e) {
          console.warn('[FirstTimeSetupProvider] Failed to convert Firestore Timestamp to Date:', e);
        }
      }
    }

    if (!nickname) {
      return null;
    }

    const avatar = typeof obj.avatar === 'string' ? obj.avatar : undefined;
    const primaryGoal = obj.primaryGoal as FirstTimeProfile['primaryGoal'];
    const productivityTime = obj.productivityTime as FirstTimeProfile['productivityTime'];

    return {
      nickname,
      birthdate: birthdate || undefined,
      avatar,
      primaryGoal,
      productivityTime,
      isCompleted,
    };
  }, []);

  const loadProfile = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('[FirstTimeSetupProvider] Loading profile...');

      let stored: FirstTimeProfile | null = null;

      if (user?.id) {
        console.log('[FirstTimeSetupProvider] Loading from Firebase for user:', user.id);
        const firebaseProfile = await getUserProfile(user.id);

        if (firebaseProfile?.firstTimeSetup) {
          console.log('[FirstTimeSetupProvider] Firebase profile found');
          stored = deserializeProfile(firebaseProfile.firstTimeSetup);

          if (stored) {
            await safeStorageSet(FIRST_TIME_SETUP_KEY, serializeProfile(stored));
          }
        } else {
          console.log('[FirstTimeSetupProvider] No Firebase profile, checking local storage');
          const local = await safeStorageGet<FirstTimeProfileSerialized | null>(FIRST_TIME_SETUP_KEY, null);
          stored = deserializeProfile(local);
        }
      } else {
        console.log('[FirstTimeSetupProvider] No user, loading from local storage');
        const local = await safeStorageGet<FirstTimeProfileSerialized | null>(FIRST_TIME_SETUP_KEY, null);
        stored = deserializeProfile(local);
      }

      console.log('[FirstTimeSetupProvider] Profile loaded:', stored ? 'Yes' : 'No');

      requestAnimationFrame(() => {
        setState({
          profile: stored,
          currentStep: 0,
          isLoading: false,
        });
      });
    } catch (error) {
      console.error('[FirstTimeSetupProvider] Error loading profile:', error);
      requestAnimationFrame(() => {
        setState({
          profile: null,
          currentStep: 0,
          isLoading: false,
        });
      });
    }
  }, [FIRST_TIME_SETUP_KEY, deserializeProfile, serializeProfile, user?.id]);

  const updateProfile = useCallback(
    async (updates: Partial<FirstTimeProfile>) => {
      let merged: FirstTimeProfile | null = null;

      setState((prev) => {
        merged = {
          ...(prev.profile ?? {}),
          ...updates,
        } as FirstTimeProfile;

        if (merged.birthdate && (!(merged.birthdate instanceof Date) || Number.isNaN(merged.birthdate.getTime()))) {
          console.warn('[FirstTimeSetupProvider] Invalid birthdate in updateProfile, removing it');
          merged.birthdate = undefined;
        }

        if (typeof merged.nickname !== 'string') {
          merged.nickname = prev.profile?.nickname ?? '';
        }

        if (typeof merged.isCompleted !== 'boolean') {
          merged.isCompleted = prev.profile?.isCompleted ?? false;
        }

        return {
          ...prev,
          profile: merged,
        };
      });

      if (merged) {
        const serialized = serializeProfile(merged);
        console.log('[FirstTimeSetupProvider] Persisting profile update to storage');
        await safeStorageSet(FIRST_TIME_SETUP_KEY, serialized);

        if (user?.id) {
          console.log('[FirstTimeSetupProvider] Syncing profile to Firebase');
          await updateUserProfile(user.id, {
            firstTimeSetup: serialized,
          }).catch((error) => {
            console.error('[FirstTimeSetupProvider] Failed to sync to Firebase:', error);
          });
        }
      }
    },
    [FIRST_TIME_SETUP_KEY, serializeProfile, user?.id]
  );

  const completeSetup = useCallback(async () => {
    let completed: FirstTimeProfile | null = null;

    setState((prev) => {
      if (!prev.profile) {
        console.warn('[FirstTimeSetupProvider] completeSetup called with no profile - ignoring');
        return prev;
      }

      completed = {
        ...prev.profile,
        isCompleted: true,
      };

      return {
        ...prev,
        profile: completed,
      };
    });

    if (completed) {
      const serialized = serializeProfile(completed);
      console.log('[FirstTimeSetupProvider] Persisting completed setup to storage');
      await safeStorageSet(FIRST_TIME_SETUP_KEY, serialized);

      if (user?.id) {
        console.log('[FirstTimeSetupProvider] Saving completed setup to Firebase');
        await saveUserProfile(user.id, {
          firstTimeSetup: serialized,
          email: user.email,
          displayName: (completed as FirstTimeProfile).nickname,
          createdAt: new Date().toISOString(),
        }).catch((error) => {
          console.error('[FirstTimeSetupProvider] Failed to save to Firebase:', error);
        });
      }
    } else {
      console.warn('[FirstTimeSetupProvider] completeSetup: no profile available after setState');
    }
  }, [FIRST_TIME_SETUP_KEY, serializeProfile, user?.id, user?.email]);

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const resetSetup = useCallback(async () => {
    await safeStorageSet(FIRST_TIME_SETUP_KEY, null);
    setState({
      profile: null,
      currentStep: 0,
      isLoading: false,
    });
  }, [FIRST_TIME_SETUP_KEY]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadProfile();
      } catch (error) {
        console.error('[FirstTimeSetupProvider] Init error:', error);
        setState({
          profile: null,
          currentStep: 0,
          isLoading: false,
        });
      }
    };

    init();
  }, [loadProfile]);

  return useMemo(
    () => ({
      ...state,
      updateProfile,
      completeSetup,
      setStep,
      resetSetup,
    }),
    [state, updateProfile, completeSetup, setStep, resetSetup]
  );
});
