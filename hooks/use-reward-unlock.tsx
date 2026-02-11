import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress } from '@/hooks/use-progress';
import { useAuth } from '@/hooks/use-auth-store';
import { isRewardUnlocked, REWARDS, type Reward } from '@/constants/rewards';

const SEEN_REWARDS_KEY = '@seen_unlocked_rewards';
const OFFER_SEEN_KEY = '@subscription_offer_seen';
const CHECK_DELAY_MS = 2500;

export const [RewardUnlockProvider, useRewardUnlock] = createContextHook(() => {
  const progress = useProgress();
  const { user } = useAuth();
  const isDeveloper = user?.email === 'developer@test.local';
  const [pendingReward, setPendingReward] = useState<Reward | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const queueRef = useRef<Reward[]>([]);
  const isShowingRef = useRef(false);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingShowRef = useRef<Reward[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SEEN_REWARDS_KEY),
      AsyncStorage.getItem(OFFER_SEEN_KEY),
    ]).then(([raw, offerFlag]) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          seenIdsRef.current = new Set(ids);
        } catch {
          seenIdsRef.current = new Set();
        }
      }
      initializedRef.current = true;
      console.log('[RewardUnlock] Initialized, seenIds:', seenIdsRef.current.size);

      if (offerFlag === 'true') {
        setReady(true);
      } else {
        delayTimerRef.current = setTimeout(() => {
          console.log('[RewardUnlock] Auto-ready after delay');
          setReady(true);
        }, CHECK_DELAY_MS);
      }
    }).catch(() => {
      initializedRef.current = true;
      delayTimerRef.current = setTimeout(() => setReady(true), CHECK_DELAY_MS);
    });

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, []);

  const markOfferSeen = useCallback(() => {
    console.log('[RewardUnlock] Marking offer as seen');
    AsyncStorage.setItem(OFFER_SEEN_KEY, 'true').catch(() => {});
    if (!ready) {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      setTimeout(() => setReady(true), 800);
    }
  }, [ready]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (!progress?.isReady) return;
    if (!ready) return;

    const streak = progress.currentStreak ?? 0;
    const tasks = progress.totalCompletedTasks ?? 0;
    const focus = progress.focusTimeMinutes ?? 0;
    const todayCompleted = progress.todayCompletedTasks ?? 0;
    const todayTotal = progress.todayTotalTasks ?? 0;

    console.log('[RewardUnlock] Checking rewards: streak=', streak, 'tasks=', tasks, 'focus=', focus, 'todayDone=', todayCompleted, '/', todayTotal);

    // First reward (r1) is given just for entering the app after trial offer (ready = true)
    // Second reward (r2) is simple - complete 2 tasks total
    // Other rewards check if you meet the requirements AND completed today's plan
    const firstRewardEligible = ready;
    const secondRewardEligible = tasks >= 2; // Second reward is simple - just 2 tasks
    const otherRewardsEligible = (todayTotal > 0 && todayCompleted >= todayTotal) || tasks > 0 || isDeveloper;

    const newlyUnlocked: Reward[] = [];
    for (let i = 0; i < REWARDS.length; i++) {
      const reward = REWARDS[i];
      const alreadySeen = seenIdsRef.current.has(reward.id);

      if (alreadySeen) continue;

      if (i > 0) {
        const prevReward = REWARDS[i - 1];
        const prevSeen = seenIdsRef.current.has(prevReward.id);
        const prevQualified = isRewardUnlocked(prevReward, streak, tasks, focus);
        if (!prevSeen && !prevQualified) {
          console.log('[RewardUnlock] Sequential block: cannot unlock', reward.label, 'because', prevReward.label, 'not yet earned');
          break;
        }
      }

      // Determine eligibility based on reward index
      const isFirstReward = i === 0;
      const isSecondReward = i === 1;
      let canCheckReward = false;
      
      if (isFirstReward) {
        canCheckReward = firstRewardEligible;
      } else if (isSecondReward) {
        canCheckReward = secondRewardEligible;
      } else {
        canCheckReward = otherRewardsEligible;
      }
      
      if (!canCheckReward && !isDeveloper) {
        console.log('[RewardUnlock] Cannot check reward', reward.label, '- eligibility not met');
        break;
      }

      const qualified = isDeveloper || isRewardUnlocked(reward, streak, tasks, focus);
      if (qualified) {
        console.log('[RewardUnlock] Reward qualified:', reward.label);
        newlyUnlocked.push({ ...reward, unlocked: true });
      } else {
        break;
      }
    }

    if (newlyUnlocked.length > 0) {
      console.log('[RewardUnlock] New rewards detected, queuing for home screen:', newlyUnlocked.map(r => r.label));

      const allSeenIds = [...seenIdsRef.current, ...newlyUnlocked.map(r => r.id)];
      seenIdsRef.current = new Set(allSeenIds);
      AsyncStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify(allSeenIds)).catch(() => {});

      pendingShowRef.current = [...pendingShowRef.current, ...newlyUnlocked];
    }
  }, [progress?.isReady, progress?.currentStreak, progress?.totalCompletedTasks, progress?.focusTimeMinutes, progress?.todayCompletedTasks, progress?.todayTotalTasks, ready, isDeveloper]);

  const showPendingRewards = useCallback(() => {
    if (pendingShowRef.current.length > 0 && !isShowingRef.current) {
      console.log('[RewardUnlock] Showing queued rewards on home screen entry');
      const first = pendingShowRef.current[0];
      const rest = pendingShowRef.current.slice(1);
      pendingShowRef.current = [];
      isShowingRef.current = true;
      setPendingReward(first);
      setModalVisible(true);
      queueRef.current = rest;
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setPendingReward(null);
    isShowingRef.current = false;

    setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        isShowingRef.current = true;
        setPendingReward(next);
        setModalVisible(true);
      }
    }, 600);
  }, []);

  const triggerTestReward = useCallback((rewardIndex?: number) => {
    if (!isDeveloper) return;
    
    let idx: number;
    if (rewardIndex !== undefined) {
      idx = rewardIndex;
    } else {
      const unshownRewards = REWARDS.filter(r => !seenIdsRef.current.has(r.id));
      if (unshownRewards.length > 0) {
        const nextReward = unshownRewards[0];
        idx = REWARDS.findIndex(r => r.id === nextReward.id);
      } else {
        seenIdsRef.current = new Set();
        AsyncStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify([])).catch(() => {});
        idx = 0;
      }
    }
    
    const reward = { ...REWARDS[idx], unlocked: true };
    console.log('[RewardUnlock] DEV: Triggering test reward (sequential):', reward.label, 'index:', idx);
    
    seenIdsRef.current.add(reward.id);
    AsyncStorage.setItem(SEEN_REWARDS_KEY, JSON.stringify([...seenIdsRef.current])).catch(() => {});
    
    setPendingReward(reward);
    setModalVisible(true);
  }, [isDeveloper]);

  return {
    pendingReward,
    modalVisible,
    closeModal,
    markOfferSeen,
    showPendingRewards,
    triggerTestReward,
    isDeveloper,
  };
});
