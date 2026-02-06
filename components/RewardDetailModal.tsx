import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Lock, Flame, Target, Clock, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Reward, RewardProgress } from '@/constants/rewards';
import { formatFocusTime } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.55;

interface RewardDetailModalProps {
  visible: boolean;
  reward: Reward | null;
  progress: RewardProgress | null;
  currentStreak: number;
  completedTasks: number;
  focusMinutes: number;
  onClose: () => void;
  isCurrentReward?: boolean;
}

const RewardDetailModalInner: React.FC<RewardDetailModalProps> = ({
  visible,
  reward,
  progress,
  currentStreak,
  completedTasks,
  focusMinutes,
  onClose,
  isCurrentReward = false,
}) => {
  const insets = useSafeAreaInsets();
  const [videoReady, setVideoReady] = useState(false);
  
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(100)).current;
  const orbScale = useRef(new Animated.Value(0.8)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  const loopRefs = useRef<Animated.CompositeAnimation[]>([]);

  const stopAllLoops = useCallback(() => {
    loopRefs.current.forEach(loop => loop?.stop());
    loopRefs.current = [];
  }, []);

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setVideoReady(false);
    backdropOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(100);
    orbScale.setValue(0.8);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(orbScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: -6, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 6, duration: 2000, useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    loopRefs.current.push(floatLoop);

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    loopRefs.current.push(glowLoop);
  }, [backdropOpacity, contentOpacity, contentTranslateY, orbScale, orbFloat, glowPulse]);

  useEffect(() => {
    if (visible && reward) {
      playEntrance();
    } else {
      stopAllLoops();
    }
    return () => stopAllLoops();
  }, [visible, reward, playEntrance, stopAllLoops]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    stopAllLoops();
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 50, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, contentOpacity, contentTranslateY, onClose, stopAllLoops]);

  if (!reward) return null;

  const glowColor = reward.color || '#FFD700';
  const isUnlocked = reward.unlocked;
  const req = reward.requirement;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', `${glowColor}08`, 'rgba(0,0,0,0.98)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.handleContainer, { top: insets.top + 10 }]}>
          <View style={styles.handle} />
        </View>

        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 10 }]} 
          onPress={handleClose} 
          activeOpacity={0.7}
        >
          <BlurView intensity={30} tint="dark" style={styles.closeButtonBlur}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.shareButton, { top: insets.top + 10 }]} 
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <BlurView intensity={30} tint="dark" style={styles.shareButtonBlur}>
            <Share2 size={18} color="rgba(255,255,255,0.7)" />
          </BlurView>
        </TouchableOpacity>

        <Animated.View style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }
        ]}>
          <Text style={[styles.rewardName, { color: glowColor }]}>
            {reward.label.toUpperCase()}
          </Text>
          
          <Text style={styles.achievementText}>{reward.achievement}</Text>

          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeIcon}>🏆</Text>
            <Text style={[styles.ownedBadgeText, { color: glowColor }]}>
              Owned by {reward.ownedBy}
            </Text>
          </View>

          <View style={styles.orbSection}>
            <Animated.View style={[styles.orbGlow, {
              opacity: glowPulse,
              backgroundColor: glowColor,
            }]} />
            
            <Animated.View style={[
              styles.orbContainer,
              {
                transform: [
                  { scale: orbScale },
                  { translateY: orbFloat },
                ],
              }
            ]}>
              <View style={[styles.orbBorder, { borderColor: `${glowColor}40` }]}>
                {!isUnlocked && (
                  <View style={styles.lockedOverlay}>
                    <Lock size={40} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
                <Video
                  source={{ uri: reward.video }}
                  style={[styles.orbVideo, !videoReady && styles.orbVideoHidden]}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={visible}
                  isLooping
                  isMuted
                  onReadyForDisplay={() => setVideoReady(true)}
                />
              </View>
            </Animated.View>
          </View>

          {isUnlocked && reward.unlockedAt && (
            <View style={styles.unlockedInfo}>
              <Check size={16} color="#4ADE80" />
              <Text style={styles.unlockedText}>
                Unlocked on {formatDate(reward.unlockedAt)}
              </Text>
            </View>
          )}

          {!isUnlocked && progress && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Progress to unlock</Text>
              
              <View style={styles.progressItems}>
                <View style={styles.progressItem}>
                  <View style={styles.progressIconWrap}>
                    <Flame size={16} color={currentStreak >= req.streakDays ? '#4ADE80' : glowColor} />
                  </View>
                  <View style={styles.progressItemContent}>
                    <View style={styles.progressItemHeader}>
                      <Text style={styles.progressItemLabel}>Days Streak</Text>
                      <Text style={[
                        styles.progressItemValue,
                        currentStreak >= req.streakDays && styles.progressItemValueComplete
                      ]}>
                        {currentStreak}/{req.streakDays}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressBarFill,
                        { 
                          width: `${progress.streakProgress}%`,
                          backgroundColor: currentStreak >= req.streakDays ? '#4ADE80' : glowColor,
                        }
                      ]} />
                    </View>
                  </View>
                  {currentStreak >= req.streakDays && (
                    <Check size={14} color="#4ADE80" style={styles.checkIcon} />
                  )}
                </View>

                <View style={styles.progressItem}>
                  <View style={styles.progressIconWrap}>
                    <Target size={16} color={completedTasks >= req.completedTasks ? '#4ADE80' : glowColor} />
                  </View>
                  <View style={styles.progressItemContent}>
                    <View style={styles.progressItemHeader}>
                      <Text style={styles.progressItemLabel}>Tasks Completed</Text>
                      <Text style={[
                        styles.progressItemValue,
                        completedTasks >= req.completedTasks && styles.progressItemValueComplete
                      ]}>
                        {completedTasks}/{req.completedTasks}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressBarFill,
                        { 
                          width: `${progress.tasksProgress}%`,
                          backgroundColor: completedTasks >= req.completedTasks ? '#4ADE80' : glowColor,
                        }
                      ]} />
                    </View>
                  </View>
                  {completedTasks >= req.completedTasks && (
                    <Check size={14} color="#4ADE80" style={styles.checkIcon} />
                  )}
                </View>

                <View style={styles.progressItem}>
                  <View style={styles.progressIconWrap}>
                    <Clock size={16} color={focusMinutes >= req.focusMinutes ? '#4ADE80' : glowColor} />
                  </View>
                  <View style={styles.progressItemContent}>
                    <View style={styles.progressItemHeader}>
                      <Text style={styles.progressItemLabel}>Focus Time</Text>
                      <Text style={[
                        styles.progressItemValue,
                        focusMinutes >= req.focusMinutes && styles.progressItemValueComplete
                      ]}>
                        {formatFocusTime(focusMinutes)}/{formatFocusTime(req.focusMinutes)}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressBarFill,
                        { 
                          width: `${progress.focusProgress}%`,
                          backgroundColor: focusMinutes >= req.focusMinutes ? '#4ADE80' : glowColor,
                        }
                      ]} />
                    </View>
                  </View>
                  {focusMinutes >= req.focusMinutes && (
                    <Check size={14} color="#4ADE80" style={styles.checkIcon} />
                  )}
                </View>
              </View>
            </View>
          )}

          <Text style={styles.hintText}>
            {isUnlocked 
              ? `Unlock this MileStone when you reach ${reward.requirementLabel}.`
              : `Unlock this MileStone when you reach ${reward.requirementLabel}.`
            }
          </Text>

          {isCurrentReward && isUnlocked && (
            <View style={[styles.currentGemButton, { backgroundColor: `${glowColor}20` }]}>
              <Check size={18} color={glowColor} />
              <Text style={[styles.currentGemText, { color: glowColor }]}>Current Gem</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const RewardDetailModal = React.memo(RewardDetailModalInner);
RewardDetailModal.displayName = 'RewardDetailModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  handleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  shareButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  shareButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  rewardName: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  achievementText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ownedBadgeIcon: {
    fontSize: 14,
  },
  ownedBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  orbSection: {
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE + 40,
    height: ORB_SIZE + 40,
    borderRadius: (ORB_SIZE + 40) / 2,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbBorder: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbVideo: {
    width: ORB_SIZE - 6,
    height: ORB_SIZE - 6,
    borderRadius: (ORB_SIZE - 6) / 2,
  },
  orbVideoHidden: {
    position: 'absolute',
    opacity: 0,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ORB_SIZE / 2,
    zIndex: 10,
  },
  unlockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  unlockedText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  progressItems: {
    gap: 12,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  progressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressItemContent: {
    flex: 1,
  },
  progressItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressItemLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  progressItemValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.9)',
  },
  progressItemValueComplete: {
    color: '#4ADE80',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  checkIcon: {
    marginLeft: 4,
  },
  hintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  currentGemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 24,
    gap: 10,
    width: '100%',
  },
  currentGemText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export default RewardDetailModal;
