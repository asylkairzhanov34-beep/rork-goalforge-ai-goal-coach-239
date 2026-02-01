import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity, Dimensions, ScrollView, Modal, Pressable, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Square, X } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import { Picker } from '@react-native-picker/picker';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useTimer } from '@/hooks/use-timer-store';
import { getLastUnlockedReward } from '@/constants/rewards';
import { Video, ResizeMode } from 'expo-av';


const { width: screenWidth } = Dimensions.get('window');
const ORB_SIZE = 48;

const SESSION_LABELS = {
  focus: 'Focus',
  shortBreak: 'Break',
  longBreak: 'Long Break',
};

const TIMER_SIZE = Math.min(screenWidth * 0.7, 280);
const STROKE_WIDTH = 6;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;



const QUICK_PRESETS = [10, 25, 45, 60];

export function PomodoroTimer() {
  const { currentGoal } = useGoalStore();
  const timerStore = useTimer();
  const lastUnlockedOrb = useMemo(() => getLastUnlockedReward(), []);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
  const panelSlideAnim = useRef(new Animated.Value(0)).current;
  
  // Get timer values with defaults
  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;
  const currentTime = timerStore?.currentTime ?? 1500;
  const totalTime = timerStore?.totalTime ?? 1500;
  const mode = timerStore?.mode ?? 'focus';
  const startTimer = timerStore?.startTimer;
  const pauseTimer = timerStore?.pauseTimer;
  const resumeTimer = timerStore?.resumeTimer;
  const stopTimer = timerStore?.stopTimer;
  
  const setMode = timerStore?.setMode;

  const getTodaySessions = timerStore?.getTodaySessions;
  const setCustomDuration = timerStore?.setCustomDuration;

  const minuteOptions = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => i + 1);
  }, []);

  // Shimmer animation for start button
  useEffect(() => {
    if (!isRunning) {
      const shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerLoop.start();

      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.start();

      return () => {
        shimmerLoop.stop();
        glowLoop.stop();
      };
    }
  }, [isRunning, shimmerAnim, glowAnim]);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Update custom duration when minutes change
  useEffect(() => {
    if (!isRunning && setCustomDuration) {
      setCustomDuration(selectedMinutes * 60);
    }
  }, [selectedMinutes, isRunning, setCustomDuration]);

  const handlePresetSelect = (minutes: number) => {
    if (!isRunning) {
      setSelectedMinutes(minutes);
      setSelectedPreset(minutes);
    }
  };

  const handleWheelChange = (minutes: number) => {
    if (!isRunning) {
      setSelectedMinutes(minutes);
      setSelectedPreset(null);
    }
  };

  const openTimeSelector = () => {
    if (!isRunning) {
      setShowTimeSelector(true);
      Animated.spring(panelSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  };

  const closeTimeSelector = () => {
    Animated.timing(panelSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowTimeSelector(false);
    });
  };

  // Update progress animation
  useEffect(() => {
    if (timerStore) {
      const progress = totalTime > 0 ? 1 - (currentTime / totalTime) : 0;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, totalTime, progressAnim, timerStore]);



  // Completion animation
  useEffect(() => {
    if (timerStore && currentTime === 0 && !isRunning) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentTime, isRunning, scaleAnim, timerStore]);

  // Remove breathing animation for Start button
  
  // Early return if timer store is not ready
  if (!timerStore) {
    return (
      <View style={styles.container}>
        <Text style={styles.sessionLabel}>Loading...</Text>
      </View>
    );
  }

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (startTimer) {
      await startTimer(currentGoal?.id);
    }
  };

  const handleStop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (stopTimer) {
      await stopTimer();
    }
  };

  const handleModeChange = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    if (setMode) {
      setMode(newMode);
      progressAnim.setValue(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? 1 - (currentTime / totalTime) : 0;
  const todaySessions = getTodaySessions ? getTodaySessions() : [];
  const todayFocusSessions = todaySessions.filter(s => s.type === 'focus').length;

  return (
    <View style={styles.container}>
      {/* Ambient Background */}
      <View style={styles.ambientBackground} />
      
      {/* Session Info */}
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionLabel}>{SESSION_LABELS[mode]}</Text>
        <Text style={styles.sessionCounter}>
          Session {todayFocusSessions + (isRunning && mode === 'focus' ? 1 : 0)} of the day
        </Text>
      </View>



      {/* Main Timer Circle with Progress Ring */}
      <TouchableOpacity 
        onPress={openTimeSelector}
        disabled={isRunning}
        activeOpacity={1}
      >
        <Animated.View style={[
          styles.timerContainer, 
          { 
            transform: [
              { scale: scaleAnim },
              { translateY: showTimeSelector ? -12 : 0 }
            ] 
          }
        ]}>
          {/* Outer glow effect */}
          {isRunning && (
            <Animated.View style={[styles.timerGlow, { opacity: glowAnim }]} />
          )}
          
          <View style={[styles.timerCircle, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
            {/* Background circle */}
            <View style={styles.timerBackground} />
            
            {/* Progress Ring */}
            <View style={styles.progressRingContainer}>
              {Platform.OS !== 'web' ? (
                <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.progressSvg}>
                  <Defs>
                    <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FFE55C" />
                      <Stop offset="50%" stopColor="#FFD12A" />
                      <Stop offset="100%" stopColor="#E5A800" />
                    </SvgLinearGradient>
                  </Defs>
                  {/* Background track */}
                  <Circle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={RADIUS}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                  />
                  {/* Progress arc */}
                  <Circle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={RADIUS}
                    stroke="url(#progressGradient)"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    transform={`rotate(-90 ${TIMER_SIZE / 2} ${TIMER_SIZE / 2})`}
                  />
                </Svg>
              ) : (
                <View style={styles.webProgressRing}>
                  <View style={[styles.webProgressTrack, { width: TIMER_SIZE, height: TIMER_SIZE, borderRadius: TIMER_SIZE / 2 }]} />
                  <View 
                    style={[
                      styles.webProgressArc, 
                      { 
                        width: TIMER_SIZE, 
                        height: TIMER_SIZE, 
                        borderRadius: TIMER_SIZE / 2,
                        borderTopColor: progress > 0 ? '#FFD12A' : 'transparent',
                        borderRightColor: progress > 0.25 ? '#FFD12A' : 'transparent',
                        borderBottomColor: progress > 0.5 ? '#FFD12A' : 'transparent',
                        borderLeftColor: progress > 0.75 ? '#FFD12A' : 'transparent',
                        transform: [{ rotate: `${progress * 360 - 90}deg` }],
                      }
                    ]} 
                  />
                </View>
              )}
            </View>
            
            {/* Timer Content */}
            <View style={styles.timerContent}>
              <Text style={styles.timerText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timerStatus}>
                {isRunning && !isPaused ? 'Focus in progress' : 
                 isPaused ? 'Paused' :
                 currentTime === 0 ? 'Completed!' : 'Tap to set time'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Time Selection Modal Panel */}
      <Modal
        visible={showTimeSelector}
        transparent
        animationType="none"
        onRequestClose={closeTimeSelector}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeTimeSelector}
        >
          <Animated.View 
            style={[
              styles.timeSelectorPanel,
              {
                opacity: panelSlideAnim,
                transform: [
                  {
                    translateY: panelSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Panel Handle */}
              <View style={styles.panelHandle} />
              
              <View style={styles.panelContent}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Select Time</Text>
                  <TouchableOpacity onPress={closeTimeSelector} style={styles.closeButton}>
                    <X size={20} color="#AFAFAF" />
                  </TouchableOpacity>
                </View>
                
                {/* Quick Presets */}
                <View style={styles.presetsContainer}>
                  {QUICK_PRESETS.map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.presetButton,
                        selectedPreset === minutes && styles.presetButtonActive,
                      ]}
                      onPress={() => handlePresetSelect(minutes)}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        selectedPreset === minutes && styles.presetButtonTextActive,
                      ]}>
                        {minutes}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Manual Picker */}
                <View style={styles.pickerContainer}>
                  {Platform.OS === 'web' ? (
                    <ScrollView 
                      style={styles.webPickerScroll}
                      contentContainerStyle={styles.webPickerContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {minuteOptions.map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[
                            styles.webPickerItem,
                            selectedMinutes === min && styles.webPickerItemActive,
                          ]}
                          onPress={() => handleWheelChange(min)}
                        >
                          <Text style={[
                            styles.webPickerText,
                            selectedMinutes === min && styles.webPickerTextActive,
                          ]}>
                            {min}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Picker
                      selectedValue={selectedMinutes}
                      onValueChange={handleWheelChange}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {minuteOptions.map((min) => (
                        <Picker.Item
                          key={min}
                          label={`${min}`}
                          value={min}
                        />
                      ))}
                    </Picker>
                  )}
                  <Text style={styles.pickerLabel}>minutes</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Controls */}
      <View style={styles.quickControls}>
        {!isRunning ? (
          <Animated.View style={[styles.startButtonContainer, { transform: [{ scale: buttonScaleAnim }] }]}>
            {/* Glow effect */}
            <Animated.View style={[styles.buttonGlow, { opacity: glowAnim }]} />
            
            <Pressable 
              style={styles.gradientButtonWrapper}
              onPress={handleStart}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
            >
              <LinearGradient
                colors={['#FFE55C', '#FFD12A', '#E5A800', '#FFD12A', '#FFE55C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                {/* Shimmer overlay */}
                <Animated.View 
                  style={[
                    styles.shimmerOverlay,
                    {
                      transform: [{
                        translateX: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-200, 200],
                        })
                      }]
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                  />
                </Animated.View>
                
                <View style={styles.buttonContent}>
                  <Play size={20} color="#111214" fill="#111214" strokeWidth={2.5} />
                  <Text style={styles.gradientButtonText}>
                    {mode === 'focus' ? 'Start' : 'Start Break'}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <View style={styles.controlRow}>
              {!isPaused ? (
                <Pressable 
                  style={({ pressed }) => [
                    styles.controlCircle,
                    pressed && styles.controlCirclePressed
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    pauseTimer?.();
                  }}
                >
                  <Pause size={22} color="#FFD12A" fill="#FFD12A" />
                </Pressable>
              ) : (
                <Pressable 
                  style={({ pressed }) => [
                    styles.controlCircle,
                    pressed && styles.controlCirclePressed
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    resumeTimer?.();
                  }}
                >
                  <Play size={22} color="#FFD12A" fill="#FFD12A" />
                </Pressable>
              )}
              
              <Pressable 
                style={({ pressed }) => [
                  styles.controlDanger,
                  pressed && styles.controlDangerPressed
                ]}
                onPress={handleStop}
              >
                <Square size={20} color="#FF4D4D" />
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Dream Card */}
      {currentGoal && (
        <View style={[styles.dreamCard, { borderColor: `${lastUnlockedOrb.color}25` }]}>
          <View style={styles.dreamHeader}>
            <View style={[styles.dreamOrbContainer, { shadowColor: lastUnlockedOrb.color }]}>
              <Video
                source={{ uri: lastUnlockedOrb.video }}
                style={styles.dreamOrbVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
            </View>
            <View style={styles.dreamTextContainer}>
              <Text style={styles.dreamTitle}>{currentGoal.title}</Text>
              <Text style={styles.dreamSubtitle}>Working on my dream</Text>
            </View>
          </View>
          <View style={styles.dreamProgress}>
            <View style={[styles.dreamProgressBar, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: lastUnlockedOrb.color }]} />
          </View>
        </View>
      )}

      {/* Session Type Indicator */}
      <View style={styles.sessionTypes}>
        {(['focus', 'shortBreak', 'longBreak'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.sessionTypeButton,
              mode === type && styles.sessionTypeButtonActive,
              isRunning && styles.sessionTypeButtonDisabled,
            ]}
            onPress={() => handleModeChange(type)}
            activeOpacity={0.7}
            disabled={isRunning}
          >
            <Text style={[
              styles.sessionTypeText,
              mode === type && styles.sessionTypeTextActive,
            ]}>
              {SESSION_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: theme.spacing.xl,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    opacity: 0.95,
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    zIndex: 1,
  },
  sessionLabel: {
    fontSize: 28,
    fontWeight: '300' as const,
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: 1,
    textAlign: 'center',
  },
  sessionCounter: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    zIndex: 1,
    position: 'relative',
  },
  timerGlow: {
    position: 'absolute',
    width: TIMER_SIZE + 40,
    height: TIMER_SIZE + 40,
    borderRadius: (TIMER_SIZE + 40) / 2,
    backgroundColor: 'transparent',
    shadowColor: '#FFD12A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  timerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerBackground: {
    position: 'absolute',
    width: TIMER_SIZE - STROKE_WIDTH * 2 - 16,
    height: TIMER_SIZE - STROKE_WIDTH * 2 - 16,
    borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2 - 16) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressRingContainer: {
    position: 'absolute',
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  webProgressRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webProgressTrack: {
    position: 'absolute',
    borderWidth: STROKE_WIDTH,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  webProgressArc: {
    position: 'absolute',
    borderWidth: STROKE_WIDTH,
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '200' as const,
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -2,
    textAlign: 'center',
  },
  timerStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400' as const,
    letterSpacing: 0.5,
  },
  quickControls: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
    zIndex: 1,
    width: '100%',
  },
  startButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGlow: {
    position: 'absolute',
    width: 180,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD12A',
    shadowColor: '#FFD12A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 20,
  },
  gradientButtonWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#FFD12A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  gradientButton: {
    paddingHorizontal: 48,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
  },
  shimmerGradient: {
    flex: 1,
    width: 100,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  gradientButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111214',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    justifyContent: 'center',
  },
  controlCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 209, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 42, 0.2)',
  },
  controlCirclePressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(255, 209, 42, 0.18)',
    shadowColor: '#FFD12A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  controlDanger: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111214',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.08)',
  },
  controlDangerPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
  },
  dreamCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 24,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 1,
  },
  dreamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  dreamOrbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  dreamOrbVideo: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  dreamTextContainer: {
    flex: 1,
  },
  dreamTitle: {
    fontSize: 15,
    fontWeight: '600' as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  dreamSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dreamProgress: {
    height: 3,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
  },
  dreamProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xs,
  },
  sessionTypes: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    zIndex: 1,
    marginBottom: theme.spacing.md,
  },
  sessionTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sessionTypeButtonActive: {
    backgroundColor: 'rgba(255, 209, 42, 0.1)',
    borderColor: 'rgba(255, 209, 42, 0.3)',
  },
  sessionTypeButtonDisabled: {
    opacity: 0.4,
  },
  sessionTypeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  sessionTypeTextActive: {
    color: '#FFD12A',
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  timeSelectorPanel: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 40,
    maxHeight: '65%',
    borderWidth: 1,
    borderColor: 'rgba(255, 212, 59, 0.15)',
    shadowColor: '#FFD43B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 212, 59, 0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  panelContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600' as any,
    color: '#AFAFAF',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
    justifyContent: 'space-between',
  },
  presetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#FFD43B',
    borderColor: '#FFD43B',
    shadowColor: '#FFD43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  presetButtonText: {
    fontSize: 15,
    fontWeight: '600' as any,
    color: '#888888',
  },
  presetButtonTextActive: {
    color: '#000000',
    fontWeight: '700' as any,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  picker: {
    width: '85%',
    height: 110,
  },
  pickerItem: {
    fontSize: 22,
    fontWeight: '600' as any,
    color: '#FFD43B',
    height: 110,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '500' as any,
    color: '#777777',
    marginTop: 8,
    textAlign: 'center',
  },
  webPickerScroll: {
    maxHeight: 100,
    width: '90%',
  },
  webPickerContent: {
    paddingVertical: theme.spacing.sm,
  },
  webPickerItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginVertical: 2,
  },
  webPickerItemActive: {
    backgroundColor: theme.colors.glass,
  },
  webPickerText: {
    fontSize: 18,
    fontWeight: '500' as any,
    color: '#666666',
  },
  webPickerTextActive: {
    fontSize: 24,
    fontWeight: '700' as any,
    color: '#FFD43B',
  },
});