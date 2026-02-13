import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { useNotifications } from '@/hooks/use-notifications';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';

const SMART_NOTIF_SCHEDULED_KEY = 'smart_ai_notifications_scheduled';
const SMART_NOTIF_LAST_DATE_KEY = 'smart_ai_notifications_last_date';

function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useSmartNotifications() {
  const { permission, scheduleSmartAINotifications } = useNotifications();
  const { profile } = useFirstTimeSetup();
  const scheduledRef = useRef(false);

  const scheduleIfNeeded = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!permission.granted) {
      console.log('[SmartNotif] No notification permission, skipping');
      return;
    }
    if (!profile?.isCompleted) {
      console.log('[SmartNotif] Profile not completed, skipping');
      return;
    }
    if (scheduledRef.current) {
      console.log('[SmartNotif] Already scheduled this session, skipping');
      return;
    }

    const lastDate = await safeStorageGet<string | null>(SMART_NOTIF_LAST_DATE_KEY, null);
    const today = getTodayDateKey();

    if (lastDate === today) {
      console.log('[SmartNotif] Already scheduled today, skipping');
      scheduledRef.current = true;
      return;
    }

    const productivityTime = profile.productivityTime || 'morning';
    console.log(`[SmartNotif] Scheduling smart AI notifications for productivityTime: ${productivityTime}`);

    const result = await scheduleSmartAINotifications(productivityTime);
    if (result) {
      scheduledRef.current = true;
      await safeStorageSet(SMART_NOTIF_LAST_DATE_KEY, today);
      await safeStorageSet(SMART_NOTIF_SCHEDULED_KEY, true);
      console.log('[SmartNotif] Smart AI notifications scheduled successfully');
    }
  }, [permission.granted, profile?.isCompleted, profile?.productivityTime, scheduleSmartAINotifications]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scheduleIfNeeded();
    }, 3000);
    return () => clearTimeout(timer);
  }, [scheduleIfNeeded]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduledRef.current = false;
        scheduleIfNeeded();
      }
    });

    return () => subscription.remove();
  }, [scheduleIfNeeded]);
}
