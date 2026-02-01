import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Picker } from '@react-native-picker/picker';
import { X, Settings, Play, Pause, Wind, RotateCcw, Shield, ShieldCheck, Lock, Unlock, AlertTriangle, Volume2, Check, Music, Bell, Zap, Radio, Sparkles } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useTimer } from '@/hooks/use-timer-store';
import { useFocusShield } from '@/hooks/use-focus-shield-store';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIMER_SIZE = Math.min(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.4, 280);

const QUICK_PRESETS = [10, 25, 45, 60];

const TIMER_SOUNDS = [
  { id: 'sound1', name: 'Chime 1', description: 'Soft chime sound', icon: 'music', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967705/sg_131201_gqh9uh.mp3' },
  { id: 'sound2', name: 'Chime 2', description: 'Gentle chime', icon: 'bell', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967705/sg_131202_ztlcao.mp3' },
  { id: 'sound3', name: 'Chime 3', description: 'Crystal chime', icon: 'sparkles', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967705/sg_131203_iylq22.mp3' },
  { id: 'sound4', name: 'Bell 1', description: 'Soft bell sound', icon: 'bell', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967714/sg_131204_scaxw5.mp3' },
  { id: 'sound5', name: 'Bell 2', description: 'Clear bell tone', icon: 'zap', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131205_ch9myx.mp3' },
  { id: 'sound6', name: 'Tone 1', description: 'Calm notification', icon: 'radio', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131206_aglji8.mp3' },
  { id: 'sound7', name: 'Tone 2', description: 'Meditation tone', icon: 'radio', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131208_sqlpwo.mp3' },
  { id: 'sound8', name: 'Tone 3', description: 'Zen notification', icon: 'radio', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131209_avomms.mp3' },
];

const SOUND_STORAGE_KEY = '@timer_selected_sound';



export default function TimerFullscreenScreen() {
  const insets = useSafeAreaInsets();
  const { currentGoal } = useGoalStore();
  const timerStore = useTimer();
  const focusShield = useFocusShield();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const panelSlideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shieldPulseAnim = useRef(new Animated.Value(1)).current;

  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [showStrictModeWarning, setShowStrictModeWarning] = useState<boolean>(false);
  const [selectedSoundId, setSelectedSoundId] = useState<string>('sound1');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasPlayedCompletionSound = useRef<boolean>(false);

  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;
  const currentTime = timerStore?.currentTime ?? 1500;
  const totalTime = timerStore?.totalTime ?? 1500;
  const mode = timerStore?.mode ?? 'focus';
  const startTimer = timerStore?.startTimer;
  const pauseTimer = timerStore?.pauseTimer;
  const resumeTimer = timerStore?.resumeTimer;
  const stopTimer = timerStore?.stopTimer;
  const setCustomDuration = timerStore?.setCustomDuration;
  const setMode = timerStore?.setMode;

  const minuteOptions = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => i + 1);
  }, []);

  useEffect(() => {
    const loadSoundSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SOUND_STORAGE_KEY);
        if (stored) {
          const settings = JSON.parse(stored);
          setSelectedSoundId(settings.soundId || 'sound1');
          setSoundEnabled(settings.enabled !== false);
        }
      } catch (error) {
        console.log('Error loading sound settings:', error);
      }
    };
    loadSoundSettings();
  }, []);

  const saveSoundSettings = useCallback(async (soundId: string, enabled: boolean) => {
    try {
      await AsyncStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify({ soundId, enabled }));
    } catch (error) {
      console.log('Error saving sound settings:', error);
    }
  }, []);

  const playCompletionSound = useCallback(async () => {
    if (!soundEnabled) return;
    
    const selectedSound = TIMER_SOUNDS.find(s => s.id === selectedSoundId);
    if (!selectedSound) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      for (let i = 0; i < 3; i++) {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: selectedSound.url },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        
        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              resolve();
            }
          });
        });
        
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.log('Error playing completion sound:', error);
    }
  }, [selectedSoundId, soundEnabled]);

  const previewSound = useCallback(async (soundId: string) => {
    const selectedSound = TIMER_SOUNDS.find(s => s.id === soundId);
    if (!selectedSound) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: selectedSound.url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Error previewing sound:', error);
    }
  }, []);

  const handleSoundSelect = useCallback((soundId: string) => {
    setSelectedSoundId(soundId);
    saveSoundSettings(soundId, soundEnabled);
    previewSound(soundId);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, [soundEnabled, saveSoundSettings, previewSound]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 30,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  useEffect(() => {
    if (timerStore) {
      const progress = totalTime > 0 ? 1 - currentTime / totalTime : 0;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, totalTime, progressAnim, timerStore]);



  useEffect(() => {
    if (timerStore && currentTime === 0 && !isRunning) {
      if (!hasPlayedCompletionSound.current) {
        hasPlayedCompletionSound.current = true;
        playCompletionSound();
      }
      setShowCompletionModal(true);
    } else if (currentTime > 0) {
      hasPlayedCompletionSound.current = false;
    }
  }, [currentTime, isRunning, timerStore, playCompletionSound]);

  useEffect(() => {
    if (!isRunning && setCustomDuration) {
      setCustomDuration(selectedMinutes * 60);
    }
  }, [selectedMinutes, isRunning, setCustomDuration]);

  useEffect(() => {
    if (focusShield?.isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shieldPulseAnim, {
            toValue: 1.1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(shieldPulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [focusShield?.isActive, shieldPulseAnim]);

  const handleClose = () => {
    if (isRunning && focusShield?.isStrictMode) {
      setShowStrictModeWarning(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const handleDisableStrictModeAndClose = () => {
    if (focusShield?.toggleStrictMode) {
      focusShield.toggleStrictMode();
    }
    setShowStrictModeWarning(false);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const handleToggleStrictMode = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    focusShield?.toggleStrictMode();
  };

  const handleStart = async () => {
    if (startTimer) {
      await startTimer(currentGoal?.id);
    }
  };

  const handleToggleFocusShield = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (focusShield?.isActive) {
      focusShield.endSession();
    } else {
      focusShield?.startSession();
    }
  };

  const handlePause = async () => {
    if (pauseTimer) {
      await pauseTimer();
    }
  };

  const handleResume = async () => {
    if (resumeTimer) {
      await resumeTimer();
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Reset Timer?',
      'Current progress will be lost',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (stopTimer) {
              await stopTimer();
            }
          },
        },
      ]
    );
  };

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!timerStore) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />
      
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.background} />

        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={handleClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modePill,
                mode === 'focus' && styles.modePillActive,
                isRunning && styles.modePillDisabled,
              ]}
              onPress={() => setMode && setMode('focus')}
              activeOpacity={0.7}
              disabled={isRunning}
            >
              <Text
                style={[
                  styles.modePillText,
                  mode === 'focus' && styles.modePillTextActive,
                ]}
              >
                Focus
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modePill,
                mode === 'shortBreak' && styles.modePillActive,
                isRunning && styles.modePillDisabled,
              ]}
              onPress={() => setMode && setMode('shortBreak')}
              activeOpacity={0.7}
              disabled={isRunning}
            >
              <Text
                style={[
                  styles.modePillText,
                  mode === 'shortBreak' && styles.modePillTextActive,
                ]}
              >
                Break
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modePill,
                mode === 'longBreak' && styles.modePillActive,
                isRunning && styles.modePillDisabled,
              ]}
              onPress={() => setMode && setMode('longBreak')}
              activeOpacity={0.7}
              disabled={isRunning}
            >
              <Text
                style={[
                  styles.modePillText,
                  mode === 'longBreak' && styles.modePillTextActive,
                ]}
              >
                Long
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSettings(true)}>
            <Settings size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            onPress={openTimeSelector}
            disabled={isRunning}
            activeOpacity={0.9}
            style={styles.timerWrapper}
          >
            <View style={styles.timerContainer}>
              <View style={[styles.timerCircle, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
                <View style={styles.timerContent}>
                  <Text style={styles.timerText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timerStatus}>
                    {isRunning && !isPaused
                      ? 'Focus in progress'
                      : isPaused
                      ? 'Paused'
                      : currentTime === 0
                      ? 'Completed!'
                      : 'Tap the timer'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.controls}>
            {!isRunning ? (
              <Pressable
                style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
                onPress={handleStart}
              >
                <Play size={28} color="#111214" fill="#111214" strokeWidth={2.5} />
                <Text style={styles.startButtonText}>Start</Text>
              </Pressable>
            ) : (
              <View style={styles.controlRow}>
                <Pressable
                  style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
                  onPress={isPaused ? handleResume : handlePause}
                >
                  {isPaused ? (
                    <Play size={28} color={theme.colors.primary} fill={theme.colors.primary} />
                  ) : (
                    <Pause size={28} color={theme.colors.primary} fill={theme.colors.primary} />
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                  onPress={handleReset}
                >
                  <RotateCcw size={24} color="#FF4D4D" />
                </Pressable>
              </View>
            )}
          </View>

          {!isRunning && (
            <Pressable style={styles.setTimeButton} onPress={openTimeSelector}>
              <Text style={styles.setTimeText}>Set Time</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[
              styles.focusShieldButton,
              focusShield?.isActive && styles.focusShieldButtonActive,
            ]}
            onPress={handleToggleFocusShield}
            activeOpacity={0.8}
          >
            <View style={styles.focusShieldContent}>
              <Animated.View
                style={[
                  styles.shieldIconContainer,
                  focusShield?.isActive && styles.shieldIconContainerActive,
                  { transform: [{ scale: focusShield?.isActive ? shieldPulseAnim : 1 }] },
                ]}
              >
                {focusShield?.isActive ? (
                  <ShieldCheck size={22} color="#10B981" />
                ) : (
                  <Shield size={22} color={theme.colors.primary} />
                )}
              </Animated.View>
              <View style={styles.focusShieldTextContainer}>
                <Text style={styles.focusShieldTitle}>Focus Shield</Text>
                <Text style={styles.focusShieldSubtitle}>
                  {focusShield?.isActive 
                    ? 'Active • Exit app to test notification' 
                    : 'Block TikTok, Reels & more'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.shieldToggle,
                focusShield?.isActive && styles.shieldToggleActive,
              ]}
            >
              <Text style={[
                styles.shieldToggleText,
                focusShield?.isActive && styles.shieldToggleTextActive,
              ]}>
                {focusShield?.isActive ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.strictModeButton,
              focusShield?.isStrictMode && styles.strictModeButtonActive,
            ]}
            onPress={handleToggleStrictMode}
            activeOpacity={0.8}
          >
            <View style={styles.strictModeContent}>
              <View
                style={[
                  styles.strictModeIconContainer,
                  focusShield?.isStrictMode && styles.strictModeIconContainerActive,
                ]}
              >
                {focusShield?.isStrictMode ? (
                  <Lock size={20} color="#FF6B6B" />
                ) : (
                  <Unlock size={20} color={theme.colors.textSecondary} />
                )}
              </View>
              <View style={styles.strictModeTextContainer}>
                <Text style={styles.strictModeTitle}>Strict Mode</Text>
                <Text style={styles.strictModeSubtitle}>
                  {focusShield?.isStrictMode
                    ? 'Can\'t exit during focus'
                    : 'Lock yourself in focus'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.strictModeToggle,
                focusShield?.isStrictMode && styles.strictModeToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.strictModeToggleText,
                  focusShield?.isStrictMode && styles.strictModeToggleTextActive,
                ]}
              >
                {focusShield?.isStrictMode ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.breathingButton}
            onPress={() => router.push('/breathing')}
          >
            <Wind size={20} color={theme.colors.primary} />
            <Text style={styles.breathingText}>Breathing Techniques</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal visible={showTimeSelector} transparent animationType="none" onRequestClose={closeTimeSelector}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeTimeSelector}>
          <Animated.View
            style={[
              styles.timeSelectorPanel,
              {
                opacity: panelSlideAnim,
                transform: [
                  {
                    translateY: panelSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.panelHandle} />

              <View style={styles.panelContent}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Select Time</Text>
                  <TouchableOpacity onPress={closeTimeSelector} style={styles.closeButton}>
                    <X size={20} color="#AFAFAF" />
                  </TouchableOpacity>
                </View>

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
                      <Text
                        style={[
                          styles.presetButtonText,
                          selectedPreset === minutes && styles.presetButtonTextActive,
                        ]}
                      >
                        {minutes}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

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
                          <Text
                            style={[
                              styles.webPickerText,
                              selectedMinutes === min && styles.webPickerTextActive,
                            ]}
                          >
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
                        <Picker.Item key={min} label={`${min}`} value={min} />
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

      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.completionOverlay}>
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>🎯 Complete!</Text>
            <Text style={styles.completionMessage}>
              {mode === 'focus' ? 'Great work! Time for a break.' : 'Break is over. Ready to continue?'}
            </Text>
            <TouchableOpacity
              style={styles.completionButton}
              onPress={() => setShowCompletionModal(false)}
            >
              <Text style={styles.completionButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable style={styles.settingsBottomOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.settingsBottomSheet} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity 
              style={styles.settingsHandleArea} 
              onPress={() => setShowSettings(false)}
              activeOpacity={0.8}
            >
              <View style={styles.settingsHandle} />
            </TouchableOpacity>
            
            <View style={styles.settingsHeader}>
              <View style={styles.settingsTitleRow}>
                <Volume2 size={22} color={theme.colors.primary} />
                <Text style={styles.settingsTitle}>Notification Sound</Text>
              </View>
              <TouchableOpacity 
                style={styles.settingsCloseButton}
                onPress={() => setShowSettings(false)}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.soundSubtitle}>Sound plays 3 times when timer ends</Text>
            
            <View style={styles.soundSection}>
              <ScrollView 
                style={styles.soundList} 
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {TIMER_SOUNDS.map((sound) => {
                  const isActive = selectedSoundId === sound.id;
                  const IconComponent = sound.icon === 'music' ? Music : 
                    sound.icon === 'bell' ? Bell : 
                    sound.icon === 'sparkles' ? Sparkles : 
                    sound.icon === 'zap' ? Zap : Radio;
                  
                  return (
                    <TouchableOpacity
                      key={sound.id}
                      style={[
                        styles.soundItem,
                        isActive && styles.soundItemActive,
                      ]}
                      onPress={() => handleSoundSelect(sound.id)}
                    >
                      <View style={styles.soundItemLeft}>
                        <View style={[
                          styles.soundItemIcon,
                          isActive && styles.soundItemIconActive,
                        ]}>
                          <IconComponent 
                            size={20} 
                            color={isActive ? theme.colors.primary : theme.colors.textSecondary} 
                          />
                        </View>
                        <View style={styles.soundItemTextContainer}>
                          <Text style={[
                            styles.soundItemText,
                            isActive && styles.soundItemTextActive,
                          ]}>
                            {sound.name}
                          </Text>
                          <Text style={styles.soundItemDescription}>
                            {sound.description}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.soundItemRight}>
                        <TouchableOpacity 
                          style={styles.soundPlayButton}
                          onPress={() => handleSoundSelect(sound.id)}
                        >
                          <Play size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        {isActive && (
                          <Check size={20} color={theme.colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showStrictModeWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStrictModeWarning(false)}
      >
        <View style={styles.strictModeOverlay}>
          <View style={styles.strictModeCard}>
            <View style={styles.strictModeWarningIcon}>
              <AlertTriangle size={40} color="#FF6B6B" />
            </View>
            <Text style={styles.strictModeWarningTitle}>Strict Mode Active</Text>
            <Text style={styles.strictModeWarningMessage}>
              You enabled Strict Mode to stay focused. Are you sure you want to disable it and leave?
            </Text>
            <View style={styles.strictModeWarningButtons}>
              <TouchableOpacity
                style={styles.strictModeStayButton}
                onPress={() => setShowStrictModeWarning(false)}
              >
                <Text style={styles.strictModeStayButtonText}>Stay Focused</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.strictModeLeaveButton}
                onPress={handleDisableStrictModeAndClose}
              >
                <Text style={styles.strictModeLeaveButtonText}>Disable & Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  modePillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
  },
  modePillTextActive: {
    fontSize: 13,
    fontWeight: theme.fontWeight.bold as any,
    color: '#111214',
  },
  modePillDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  timerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.medium,
  },
  progressContainer: {
    position: 'absolute',
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  progressRingWeb: {
    position: 'absolute',
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerText: {
    fontSize: 72,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: 12,
    letterSpacing: -3,
  },
  timerStatus: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium as any,
  },
  controls: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    height: 64,
    borderRadius: 32,
    gap: 16,
    minWidth: 220,
    ...theme.shadows.gold,
  },
  startButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: theme.fontWeight.bold as any,
    color: '#111214',
    letterSpacing: 0.3,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 209, 42, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 42, 0.3)',
  },
  controlButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255, 209, 42, 0.25)',
  },
  resetButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.2)',
  },
  resetButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
  },
  setTimeButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  setTimeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  quickActionsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: 10,
  },
  quickActionsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  focusShieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  focusShieldButtonActive: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  focusShieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 209, 42, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shieldIconContainerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  focusShieldTextContainer: {
    flex: 1,
  },
  focusShieldTitle: {
    fontSize: 15,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  focusShieldSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  shieldToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  shieldToggleActive: {
    backgroundColor: '#10B981',
  },
  shieldToggleText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.textSecondary,
  },
  shieldToggleTextActive: {
    color: '#fff',
  },
  breathingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    gap: 8,
  },
  breathingText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  timeSelectorPanel: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 212, 59, 0.15)',
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
    fontSize: 20,
    fontWeight: theme.fontWeight.bold as any,
    color: '#AFAFAF',
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
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#888888',
  },
  presetButtonTextActive: {
    color: '#000000',
    fontWeight: theme.fontWeight.bold as any,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  picker: {
    width: '85%',
    height: 120,
  },
  pickerItem: {
    fontSize: 24,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.primary,
    height: 120,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium as any,
    color: '#777777',
    marginTop: 8,
  },
  webPickerScroll: {
    maxHeight: 120,
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
    fontWeight: theme.fontWeight.medium as any,
    color: '#666666',
  },
  webPickerTextActive: {
    fontSize: 26,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.primary,
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.premium,
    width: '90%',
    maxWidth: 400,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  completionMessage: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  completionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.gold,
  },
  completionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: '#111214',
  },
  settingsBottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  settingsBottomSheet: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 212, 59, 0.15)',
  },
  settingsHandleArea: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  settingsHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
  },
  settingsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  settingsMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  soundSection: {
    flex: 1,
  },
  soundList: {
    flex: 1,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  soundItemActive: {
    backgroundColor: 'rgba(255, 209, 42, 0.12)',
    borderColor: 'rgba(255, 209, 42, 0.4)',
  },
  soundItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  soundItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundItemIconActive: {
    backgroundColor: 'rgba(255, 209, 42, 0.2)',
  },
  soundItemTextContainer: {
    flex: 1,
  },
  soundItemText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  soundItemTextActive: {
    color: theme.colors.primary,
  },
  soundItemDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  soundItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strictModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginBottom: 10,
  },
  strictModeButtonActive: {
    borderColor: 'rgba(255, 107, 107, 0.4)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  strictModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  strictModeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  strictModeIconContainerActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  strictModeTextContainer: {
    flex: 1,
  },
  strictModeTitle: {
    fontSize: 15,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  strictModeSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  strictModeToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  strictModeToggleActive: {
    backgroundColor: '#FF6B6B',
  },
  strictModeToggleText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.textSecondary,
  },
  strictModeToggleTextActive: {
    color: '#fff',
  },
  strictModeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  strictModeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    width: '90%',
    maxWidth: 400,
  },
  strictModeWarningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  strictModeWarningTitle: {
    fontSize: 24,
    fontWeight: theme.fontWeight.extrabold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  strictModeWarningMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  strictModeWarningButtons: {
    width: '100%',
    gap: 12,
  },
  strictModeStayButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.gold,
  },
  strictModeStayButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: '#111214',
  },
  strictModeLeaveButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  strictModeLeaveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#FF6B6B',
  },
});
