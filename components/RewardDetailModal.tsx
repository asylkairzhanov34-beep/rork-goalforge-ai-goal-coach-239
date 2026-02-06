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
  FlatList,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Lock, Flame, Target, Clock, Share2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Reward, RewardProgress } from '@/constants/rewards';
import { formatFocusTime } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.48;

interface RewardDetailModalProps {
  visible: boolean;
  reward: Reward | null;
  progress: RewardProgress | null;
  currentStreak: number;
  completedTasks: number;
  focusMinutes: number;
  onClose: () => void;
  isCurrentReward?: boolean;
  allRewards?: Reward[];
  initialIndex?: number;
  getProgressForReward?: (reward: Reward) => RewardProgress;
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
  allRewards,
  initialIndex,
  getProgressForReward,
}) => {
  const insets = useSafeAreaInsets();
  const [, setVideoReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);
  const flatListRef = useRef<FlatList>(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0.85)).current;

  const rewards = allRewards && allRewards.length > 0 ? allRewards : (reward ? [reward] : []);
  const activeReward = rewards[currentIndex] ?? reward;

  useEffect(() => {
    if (visible && initialIndex !== undefined) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setVideoReady(false);
    backdropOpacity.setValue(0);
    contentOpacity.setValue(0);
    orbScale.setValue(0.85);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(orbScale, {
        toValue: 1,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, contentOpacity, orbScale]);

  useEffect(() => {
    if (visible && activeReward) {
      playEntrance();
    }
  }, [visible, activeReward, playEntrance]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, contentOpacity, onClose]);

  const navigateTo = useCallback((index: number) => {
    if (index < 0 || index >= rewards.length) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, [rewards.length]);

  if (!activeReward) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderOrbPage = ({ item, index }: { item: Reward; index: number }) => {
    const isCurrent = index === currentIndex;
    return (
      <View style={styles.orbPage}>
        <Animated.View style={[
          styles.orbContainer,
          { transform: [{ scale: isCurrent ? orbScale : 1 }] },
        ]}>
          <View style={[styles.orbRing, { borderColor: `${item.color}25` }]}>
            <View style={styles.orbInner}>
              <Video
                source={{ uri: item.unlocked ? item.video : item.video }}
                style={styles.orbVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay={visible && isCurrent}
                isLooping
                isMuted
                onReadyForDisplay={() => { if (isCurrent) setVideoReady(true); }}
              />
              {!item.unlocked && (
                <View style={styles.lockedOverlay}>
                  <Lock size={32} color="rgba(255,255,255,0.5)" />
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    );
  };

  const onMomentumScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < rewards.length) {
      setCurrentIndex(newIndex);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const displayReward = rewards[currentIndex] ?? activeReward;
  const displayProgress = getProgressForReward ? getProgressForReward(displayReward) : progress;
  const displayGlow = displayReward.color || '#FFD700';
  const displayUnlocked = displayReward.unlocked;
  const displayReq = displayReward.requirement;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={[
            'rgba(8,8,8,0.98)',
            `${displayGlow}06`,
            'rgba(8,8,8,0.99)',
          ]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View style={[styles.content, { opacity: contentOpacity, paddingTop: insets.top + 8 }]}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.topBarButton}>
              <X size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <View style={styles.handleBar} />
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7} style={styles.topBarButton}>
              <Share2 size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={[styles.rewardName, { color: displayGlow }]}>
              {displayReward.label.toUpperCase()}
            </Text>
            <Text style={styles.achievementText}>{displayReward.achievement}</Text>
            {displayUnlocked && (
              <View style={[styles.ownedPill, { borderColor: `${displayGlow}20` }]}>
                <Text style={styles.ownedEmoji}>🏅</Text>
                <Text style={[styles.ownedText, { color: `${displayGlow}CC` }]}>
                  Owned by {displayReward.ownedBy}
                </Text>
              </View>
            )}
          </View>

          {rewards.length > 1 ? (
            <View style={styles.carouselSection}>
              <FlatList
                ref={flatListRef}
                data={rewards}
                renderItem={renderOrbPage}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                initialScrollIndex={initialIndex ?? 0}
              />
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.navArrowLeft]}
                  onPress={() => navigateTo(currentIndex - 1)}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
              {currentIndex < rewards.length - 1 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.navArrowRight]}
                  onPress={() => navigateTo(currentIndex + 1)}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.singleOrbSection}>
              <Animated.View style={[styles.orbContainer, { transform: [{ scale: orbScale }] }]}>
                <View style={[styles.orbRing, { borderColor: `${displayGlow}25` }]}>
                  <View style={styles.orbInner}>
                    <Video
                      source={{ uri: displayReward.video }}
                      style={styles.orbVideo}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={visible}
                      isLooping
                      isMuted
                      onReadyForDisplay={() => setVideoReady(true)}
                    />
                    {!displayUnlocked && (
                      <View style={styles.lockedOverlay}>
                        <Lock size={32} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            </View>
          )}

          {rewards.length > 1 && (
            <View style={styles.dotsRow}>
              {rewards.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentIndex && [styles.dotActive, { backgroundColor: displayGlow }],
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.bottomSection}>
            {displayUnlocked && displayReward.unlockedAt && (
              <View style={styles.unlockedRow}>
                <Check size={14} color="#4ADE80" />
                <Text style={styles.unlockedDateText}>
                  Unlocked on {formatDate(displayReward.unlockedAt)}
                </Text>
              </View>
            )}

            <Text style={styles.hintText}>
              Unlock this MileStone when you reach {displayReward.requirementLabel}.
            </Text>

            {!displayUnlocked && displayProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <ProgressPill
                    icon={<Flame size={14} color={currentStreak >= displayReq.streakDays ? '#4ADE80' : displayGlow} />}
                    label="Streak"
                    current={currentStreak}
                    target={displayReq.streakDays}
                    progress={displayProgress.streakProgress}
                    color={displayGlow}
                    done={currentStreak >= displayReq.streakDays}
                  />
                  <ProgressPill
                    icon={<Target size={14} color={completedTasks >= displayReq.completedTasks ? '#4ADE80' : displayGlow} />}
                    label="Tasks"
                    current={completedTasks}
                    target={displayReq.completedTasks}
                    progress={displayProgress.tasksProgress}
                    color={displayGlow}
                    done={completedTasks >= displayReq.completedTasks}
                  />
                  <ProgressPill
                    icon={<Clock size={14} color={focusMinutes >= displayReq.focusMinutes ? '#4ADE80' : displayGlow} />}
                    label="Focus"
                    current={focusMinutes}
                    target={displayReq.focusMinutes}
                    progress={displayProgress.focusProgress}
                    color={displayGlow}
                    done={focusMinutes >= displayReq.focusMinutes}
                    formatValue={formatFocusTime}
                  />
                </View>
              </View>
            )}

            {isCurrentReward && displayUnlocked && (
              <View style={[styles.currentGemPill, { backgroundColor: `${displayGlow}15`, borderColor: `${displayGlow}25` }]}>
                <Check size={16} color={displayGlow} />
                <Text style={[styles.currentGemText, { color: displayGlow }]}>Current Gem</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

interface ProgressPillProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  progress: number;
  color: string;
  done: boolean;
  formatValue?: (v: number) => string;
}

const ProgressPill: React.FC<ProgressPillProps> = ({
  icon, label, current, target, progress, color, done, formatValue,
}) => {
  const fmt = formatValue || ((v: number) => `${v}`);
  return (
    <View style={pillStyles.container}>
      <View style={pillStyles.iconRow}>
        {icon}
        {done && <Check size={10} color="#4ADE80" style={{ marginLeft: 2 }} />}
      </View>
      <Text style={pillStyles.label}>{label}</Text>
      <Text style={[pillStyles.value, done && pillStyles.valueDone]}>
        {fmt(current)}/{fmt(target)}
      </Text>
      <View style={pillStyles.bar}>
        <View style={[
          pillStyles.barFill,
          { width: `${Math.min(progress, 100)}%`, backgroundColor: done ? '#4ADE80' : color },
        ]} />
      </View>
    </View>
  );
};

const pillStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  valueDone: {
    color: '#4ADE80',
  },
  bar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export const RewardDetailModal = React.memo(RewardDetailModalInner);
RewardDetailModal.displayName = 'RewardDetailModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,8,8,0.97)',
  },
  content: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 6,
  },
  rewardName: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: 3,
    textAlign: 'center',
  },
  achievementText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontWeight: '400' as const,
  },
  ownedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    marginTop: 4,
    borderWidth: 1,
  },
  ownedEmoji: {
    fontSize: 12,
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  carouselSection: {
    height: ORB_SIZE + 40,
    marginTop: 16,
    position: 'relative',
  },
  singleOrbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    height: ORB_SIZE + 40,
  },
  orbPage: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    width: ORB_SIZE + 16,
    height: ORB_SIZE + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing: {
    width: ORB_SIZE + 8,
    height: ORB_SIZE + 8,
    borderRadius: (ORB_SIZE + 8) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbVideo: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ORB_SIZE / 2,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
  },
  bottomSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'flex-end',
    paddingBottom: 60,
    gap: 14,
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlockedDateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  progressSection: {
    width: '100%',
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currentGemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    marginTop: 4,
  },
  currentGemText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

export default RewardDetailModal;
