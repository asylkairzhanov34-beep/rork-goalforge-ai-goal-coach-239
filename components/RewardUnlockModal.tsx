import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.58;

interface RewardUnlockModalProps {
  visible: boolean;
  reward: Reward | null;
  onClose: () => void;
}

const RewardUnlockModalInner: React.FC<RewardUnlockModalProps> = ({ visible, reward, onClose }) => {
  const [videoReady, setVideoReady] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef<Video>(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0.7)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const footerSlide = useRef(new Animated.Value(20)).current;

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setVideoReady(false);
    setVideoKey(prev => prev + 1);

    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    orbScale.setValue(0.7);
    orbOpacity.setValue(0);
    headerOpacity.setValue(0);
    footerOpacity.setValue(0);
    headerSlide.setValue(-20);
    footerSlide.setValue(20);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 40,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(headerSlide, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 150);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(orbScale, {
          toValue: 1,
          tension: 35,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, 300);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(footerSlide, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 550);
  }, [backdropOpacity, cardScale, cardOpacity, orbScale, orbOpacity, headerOpacity, footerOpacity, headerSlide, footerSlide]);

  useEffect(() => {
    if (visible && reward) {
      playEntrance();
    }
  }, [visible, reward, playEntrance]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.92, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, cardOpacity, cardScale, onClose]);

  if (!reward) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
            <Text style={styles.unlockLabel}>Reward Unlocked</Text>
            <Text style={styles.rewardName}>
              {reward.label.toUpperCase()}
            </Text>
            <Text style={styles.description}>
              {reward.unlockHint}
            </Text>
          </Animated.View>

          <View style={styles.orbSection}>
            <Animated.View
              style={[
                styles.orbContainer,
                {
                  opacity: orbOpacity,
                  transform: [{ scale: orbScale }],
                }
              ]}
            >
              <Video
                ref={videoRef}
                key={videoKey}
                source={{ uri: reward.video }}
                style={[styles.orbVideo, !videoReady && styles.orbVideoHidden]}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
                onReadyForDisplay={() => setVideoReady(true)}
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerSlide }] }]}>
            <TouchableOpacity
              style={styles.claimButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={styles.claimButtonText}>Claim Reward</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const RewardUnlockModal = React.memo(RewardUnlockModalInner);
RewardUnlockModal.displayName = 'RewardUnlockModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  unlockLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  rewardName: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: 3,
    marginBottom: 14,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbVideo: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orbVideoHidden: {
    opacity: 0,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
    width: '100%',
  },
  claimButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
