import { getUserProfile } from '@/lib/firebase';
import { safeStorageSet } from '@/utils/storage-helper';

export interface RestorationResult {
  success: boolean;
  restoredFields: string[];
  error?: string;
}

export async function restoreAllUserDataFromFirebase(userId: string): Promise<RestorationResult> {
  const restoredFields: string[] = [];

  try {
    console.log('[FirebaseRestore] ======= FULL DATA RESTORATION START =======');
    console.log('[FirebaseRestore] User ID:', userId);

    const firebaseDoc = await getUserProfile(userId);

    if (!firebaseDoc) {
      console.log('[FirebaseRestore] No Firebase document found - new user or no data');
      return { success: true, restoredFields: [] };
    }

    console.log('[FirebaseRestore] Firebase document found, restoring all fields...');

    if (firebaseDoc.firstTimeSetup) {
      await safeStorageSet(`first_time_setup_${userId}`, firebaseDoc.firstTimeSetup);
      restoredFields.push('firstTimeSetup');
      console.log('[FirebaseRestore] ✅ firstTimeSetup restored');
    }

    if (firebaseDoc.profile) {
      await safeStorageSet(`user_profile_${userId}`, firebaseDoc.profile);
      restoredFields.push('profile');
      console.log('[FirebaseRestore] ✅ profile restored');
    }

    if (firebaseDoc.goals && Array.isArray(firebaseDoc.goals) && firebaseDoc.goals.length > 0) {
      await safeStorageSet(`goals_${userId}`, firebaseDoc.goals);
      restoredFields.push(`goals (${firebaseDoc.goals.length})`);
      console.log('[FirebaseRestore] ✅ goals restored:', firebaseDoc.goals.length);
    }

    if (firebaseDoc.tasks && Array.isArray(firebaseDoc.tasks) && firebaseDoc.tasks.length > 0) {
      await safeStorageSet(`daily_tasks_${userId}`, firebaseDoc.tasks);
      restoredFields.push(`tasks (${firebaseDoc.tasks.length})`);
      console.log('[FirebaseRestore] ✅ tasks restored:', firebaseDoc.tasks.length);
    }

    if (firebaseDoc.journalEntries && Array.isArray(firebaseDoc.journalEntries) && firebaseDoc.journalEntries.length > 0) {
      await safeStorageSet(`journal_entries_${userId}`, firebaseDoc.journalEntries);
      restoredFields.push(`journal (${firebaseDoc.journalEntries.length})`);
      console.log('[FirebaseRestore] ✅ journal entries restored:', firebaseDoc.journalEntries.length);
    }

    if (firebaseDoc.challenges && Array.isArray(firebaseDoc.challenges) && firebaseDoc.challenges.length > 0) {
      await safeStorageSet(`active_challenges_${userId}`, firebaseDoc.challenges);
      restoredFields.push(`challenges (${firebaseDoc.challenges.length})`);
      console.log('[FirebaseRestore] ✅ challenges restored:', firebaseDoc.challenges.length);
    }

    if (firebaseDoc.challengeStats) {
      await safeStorageSet(`challenge_stats_${userId}`, firebaseDoc.challengeStats);
      restoredFields.push('challengeStats');
      console.log('[FirebaseRestore] ✅ challenge stats restored');
    }

    if (firebaseDoc.pomodoroSessions && Array.isArray(firebaseDoc.pomodoroSessions) && firebaseDoc.pomodoroSessions.length > 0) {
      await safeStorageSet(`pomodoro_sessions_${userId}`, firebaseDoc.pomodoroSessions);
      restoredFields.push(`pomodoro (${firebaseDoc.pomodoroSessions.length})`);
      console.log('[FirebaseRestore] ✅ pomodoro sessions restored:', firebaseDoc.pomodoroSessions.length);
    }

    if (firebaseDoc.timerSessions && Array.isArray(firebaseDoc.timerSessions) && firebaseDoc.timerSessions.length > 0) {
      await safeStorageSet(`timerSessions_${userId}`, firebaseDoc.timerSessions);
      restoredFields.push(`timer (${firebaseDoc.timerSessions.length})`);
      console.log('[FirebaseRestore] ✅ timer sessions restored:', firebaseDoc.timerSessions.length);
    }

    if (firebaseDoc.manifestationSessions && Array.isArray(firebaseDoc.manifestationSessions)) {
      await safeStorageSet(`manifestation_sessions_${userId}`, firebaseDoc.manifestationSessions);
      restoredFields.push(`manifestation sessions (${firebaseDoc.manifestationSessions.length})`);
      console.log('[FirebaseRestore] ✅ manifestation sessions restored');
    }

    if (firebaseDoc.manifestationSettings) {
      await safeStorageSet(`manifestation_settings_${userId}`, firebaseDoc.manifestationSettings);
      restoredFields.push('manifestation settings');
      console.log('[FirebaseRestore] ✅ manifestation settings restored');
    }

    if (firebaseDoc.focusShieldSettings) {
      const focusData = {
        settings: firebaseDoc.focusShieldSettings,
        stats: firebaseDoc.focusShieldStats || null,
      };
      await safeStorageSet(`@focus_shield_data_${userId}`, focusData);
      restoredFields.push('focusShield settings');
      console.log('[FirebaseRestore] ✅ focus shield settings restored');
    }

    if (firebaseDoc.focusShieldSessions && Array.isArray(firebaseDoc.focusShieldSessions)) {
      await safeStorageSet(`@focus_shield_sessions_${userId}`, firebaseDoc.focusShieldSessions);
      restoredFields.push(`focusShield sessions (${firebaseDoc.focusShieldSessions.length})`);
      console.log('[FirebaseRestore] ✅ focus shield sessions restored');
    }

    if (firebaseDoc.focusShieldLogs && Array.isArray(firebaseDoc.focusShieldLogs)) {
      await safeStorageSet(`@focus_shield_logs_${userId}`, firebaseDoc.focusShieldLogs);
      restoredFields.push(`focusShield logs (${firebaseDoc.focusShieldLogs.length})`);
      console.log('[FirebaseRestore] ✅ focus shield logs restored');
    }

    if (firebaseDoc.chatHistory && Array.isArray(firebaseDoc.chatHistory) && firebaseDoc.chatHistory.length > 0) {
      await safeStorageSet(`chat_history_v2_${userId}`, firebaseDoc.chatHistory);
      restoredFields.push(`chat (${firebaseDoc.chatHistory.length})`);
      console.log('[FirebaseRestore] ✅ chat history restored:', firebaseDoc.chatHistory.length);
    }

    if (firebaseDoc.subscription) {
      await safeStorageSet(`subscription_data_${userId}`, firebaseDoc.subscription);
      restoredFields.push('subscription');
      console.log('[FirebaseRestore] ✅ subscription data restored');
    }

    console.log('[FirebaseRestore] ======= RESTORATION COMPLETE =======');
    console.log('[FirebaseRestore] Restored fields:', restoredFields.join(', '));

    return { success: true, restoredFields };
  } catch (error: any) {
    console.error('[FirebaseRestore] ❌ Restoration failed:', error?.message || error);
    return { success: false, restoredFields, error: error?.message || 'Unknown error' };
  }
}
