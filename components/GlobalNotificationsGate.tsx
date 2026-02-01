import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { BellRing, ChevronRight, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';

type PermissionState = {
  status: Notifications.PermissionStatus | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
};

const STORAGE_HYDRATION_BUFFER_MS = 900;

export function GlobalNotificationsGate() {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [permission, setPermission] = useState<PermissionState>({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
  });
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const fade = useRef<Animated.Value>(new Animated.Value(0)).current;
  const translateY = useRef<Animated.Value>(new Animated.Value(18)).current;
  const scale = useRef<Animated.Value>(new Animated.Value(0.98)).current;

  const isBlocked = useMemo(() => {
    if (!isReady) return false;
    if (Platform.OS === 'web') return false;
    if (dismissed) return false;
    return !permission.granted;
  }, [isReady, permission.granted, dismissed]);

  const refreshPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermission({ status: 'undetermined', granted: false, canAskAgain: true });
      return;
    }

    try {
      const res = await Notifications.getPermissionsAsync();
      console.log('[NotificationsGate] getPermissionsAsync:', res);
      setPermission({
        status: res.status,
        granted: res.granted ?? res.status === 'granted',
        canAskAgain: res.canAskAgain ?? res.status !== 'denied',
      });
    } catch (e) {
      console.error('[NotificationsGate] Failed to get permissions:', e);
      setPermission({ status: 'undetermined', granted: false, canAskAgain: true });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setIsReady(true);
    }, STORAGE_HYDRATION_BUFFER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    refreshPermission();
  }, [isReady, refreshPermission]);

  useEffect(() => {
    const nextVisible = isBlocked;
    setVisible(nextVisible);

    if (nextVisible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 180, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      translateY.setValue(18);
      scale.setValue(0.98);
    }
  }, [fade, isBlocked, scale, translateY]);

  const vibrate = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, []);

  const handleEnable = useCallback(async () => {
    if (Platform.OS === 'web') return;

    await vibrate();
    if (isRequesting) return;

    setIsRequesting(true);
    try {
      const res = await Notifications.requestPermissionsAsync();
      console.log('[NotificationsGate] requestPermissionsAsync:', res);
      await refreshPermission();

      if (res.status !== 'granted') {
        // If they denied or system blocked, offer settings.
        if (Platform.OS === 'ios') {
          // Expo doesn't expose a universal open-notification-settings API; fallback to app settings.
          Linking.openURL('app-settings:').catch(err => {
            console.error('[NotificationsGate] Failed to open settings:', err);
          });
        }
      }
    } catch (e) {
      console.error('[NotificationsGate] Permission request failed:', e);
    } finally {
      setIsRequesting(false);
    }
  }, [isRequesting, refreshPermission, vibrate]);

  const handleNotNow = useCallback(async () => {
    await vibrate();
    setDismissed(true);
    setVisible(false);
  }, [vibrate]);

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay} testID="global-notifications-gate">
        <View style={styles.backdrop} />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fade,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <BellRing size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} testID="global-notifications-gate-title">
                Enable notifications
              </Text>
              <Text style={styles.subtitle}>
                We use reminders for timers, tasks, and daily check-ins.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleNotNow}
              activeOpacity={0.7}
              style={styles.closeBtn}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              testID="global-notifications-gate-close"
            >
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.callout}>
            <Text style={styles.calloutText}>
              You can change this anytime in Settings → Notifications.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, isRequesting ? styles.primaryBtnDisabled : null]}
            onPress={handleEnable}
            disabled={isRequesting}
            activeOpacity={0.9}
            testID="global-notifications-gate-enable"
          >
            <Text style={styles.primaryBtnText}>{isRequesting ? 'Requesting…' : 'Enable'}</Text>
            <ChevronRight size={18} color="#000" />
          </TouchableOpacity>

          <Text style={styles.footnote}>
            If you decline, reminders may not work properly.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 26,
    backgroundColor: 'rgba(18,18,18,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    padding: 18,
    gap: 14,
    ...theme.shadows.large,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callout: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  calloutText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800' as const,
  },
  footnote: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
