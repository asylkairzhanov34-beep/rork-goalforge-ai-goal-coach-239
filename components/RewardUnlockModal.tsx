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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const ORB_SIZE = SCREEN_WIDTH * 0.52;

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
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0.8)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setVideoReady(false);
    setVideoKey(prev => prev + 1);

    backdropOpacity.setValue(0);
    cardScale.setValue(0.9);
    cardOpacity.setValue(0);
    orbScale.setValue(0.8);
    orbOpacity.setValue(0);
    contentOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(orbScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, 200);

    setTimeout(() => {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 400);
  }, [backdropOpacity, cardScale, cardOpacity, orbScale, orbOpacity, contentOpacity]);

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
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, cardOpacity, cardScale, onClose]);



  if (!reward) return null;

  const glowColor = reward.color || '#60A5FA';

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
          <View style={styles.cardHeader}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.headerContent, { opacity: contentOpacity }]}>
            <Text style={styles.unlockLabel}>Reward Unlocked</Text>
            <Text style={[styles.rewardName, { color: glowColor }]}>
              {reward.label.toUpperCase()}
            </Text>
            <Text style={styles.description}>
              {reward.unlockHint}
            </Text>
          </Animated.View>

          <View style={styles.orbSection}>
            <Animated.View 
              style={[
                styles.orbGlow,
                {
                  backgroundColor: glowColor,
                  opacity: Animated.multiply(orbOpacity, 0.15),
                  transform: [{ scale: orbScale }],
                }
              ]} 
            />
            
            <Animated.View 
              style={[
                styles.orbContainer,
                {
                  opacity: orbOpacity,
                  transform: [{ scale: orbScale }],
                }
              ]}
            >
              <View style={[styles.orbInner, { backgroundColor: `${glowColor}10` }]}>
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
              </View>
            </Animated.View>
          </View>

          <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
            <TouchableOpacity
              style={[styles.claimButton, { backgroundColor: glowColor }]}
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
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#000',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 28,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  unlockLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    position: 'relative',
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: ORB_SIZE - 4,
    height: ORB_SIZE - 4,
    borderRadius: (ORB_SIZE - 4) / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbVideo: {
    width: ORB_SIZE - 4,
    height: ORB_SIZE - 4,
    borderRadius: (ORB_SIZE - 4) / 2,
  },
  orbVideoHidden: {
    opacity: 0,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  claimButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.3,
  },

});
