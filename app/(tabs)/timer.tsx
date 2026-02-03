import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Volume2, Check, Play, Headphones, VolumeX } from 'lucide-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { useTimer } from '@/hooks/use-timer-store';
import { SOUNDS_CONFIG, SoundId } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';

const AMBIENT_STORAGE_KEY = '@timer_ambient_settings';

const AMBIENT_SOUNDS = [
  { id: 'ambient1', name: 'Focus Flow', description: 'Calm ambient for deep work', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770142014/3gwt67NbS8Go3MhssMPz_oo3xfu.mp4' },
  { id: 'ambient2', name: 'Zen Waves', description: 'Peaceful concentration tones', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770142016/hYCBEvsXvN3tenAHl9PZ_unyiy9.mp4' },
];


export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const timerStore = useTimer();
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  const panelSlideAnim = useRef(new Animated.Value(0)).current;

  
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [selectedAmbientId, setSelectedAmbientId] = useState('ambient1');
  const ambientSoundRef = useRef<Audio.Sound | null>(null);
  
  const selectedSound = timerStore?.notificationSound || 'bell';
  const setNotificationSound = timerStore?.setNotificationSound;
  
  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;

  useEffect(() => {
    const loadAmbientSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(AMBIENT_STORAGE_KEY);
        if (stored) {
          const settings = JSON.parse(stored);
          setSelectedAmbientId(settings.soundId || 'ambient1');
          setAmbientEnabled(settings.enabled === true);
        }
      } catch (error) {
        console.log('Error loading ambient settings:', error);
      }
    };
    loadAmbientSettings();
  }, []);

  const saveAmbientSettings = useCallback(async (soundId: string, enabled: boolean) => {
    try {
      await AsyncStorage.setItem(AMBIENT_STORAGE_KEY, JSON.stringify({ soundId, enabled }));
    } catch (error) {
      console.log('Error saving ambient settings:', error);
    }
  }, []);

  useEffect(() => {
    const handleAmbientPlayback = async () => {
      if (isRunning && !isPaused && ambientEnabled) {
        const selectedAmbient = AMBIENT_SOUNDS.find(s => s.id === selectedAmbientId);
        if (!selectedAmbient) return;
        try {
          if (ambientSoundRef.current) {
            await ambientSoundRef.current.unloadAsync();
            ambientSoundRef.current = null;
          }
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            { uri: selectedAmbient.url },
            { shouldPlay: true, isLooping: true, volume: 0.6 }
          );
          ambientSoundRef.current = sound;
        } catch (error) {
          console.log('Error playing ambient sound:', error);
        }
      } else if (isPaused && ambientSoundRef.current) {
        try {
          await ambientSoundRef.current.pauseAsync();
        } catch (error) {
          console.log('Error pausing ambient sound:', error);
        }
      } else if (!isRunning && ambientSoundRef.current) {
        try {
          await ambientSoundRef.current.stopAsync();
          await ambientSoundRef.current.unloadAsync();
          ambientSoundRef.current = null;
        } catch (error) {
          console.log('Error stopping ambient sound:', error);
        }
      }
    };
    handleAmbientPlayback();
  }, [isRunning, isPaused, ambientEnabled, selectedAmbientId]);

  useEffect(() => {
    return () => {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.unloadAsync();
      }
    };
  }, []);

  const handleToggleAmbient = useCallback(async () => {
    const newEnabled = !ambientEnabled;
    setAmbientEnabled(newEnabled);
    saveAmbientSettings(selectedAmbientId, newEnabled);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!newEnabled && ambientSoundRef.current) {
      try {
        await ambientSoundRef.current.stopAsync();
        await ambientSoundRef.current.unloadAsync();
        ambientSoundRef.current = null;
      } catch (error) {
        console.log('Error stopping ambient:', error);
      }
    }
  }, [ambientEnabled, selectedAmbientId, saveAmbientSettings]);



  const handleAmbientSelect = useCallback(async (soundId: string) => {
    setSelectedAmbientId(soundId);
    saveAmbientSettings(soundId, ambientEnabled);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    if (isRunning && !isPaused && ambientEnabled) {
      try {
        if (ambientSoundRef.current) {
          await ambientSoundRef.current.stopAsync();
          await ambientSoundRef.current.unloadAsync();
          ambientSoundRef.current = null;
        }
        const newAmbient = AMBIENT_SOUNDS.find(s => s.id === soundId);
        if (newAmbient) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: newAmbient.url },
            { shouldPlay: true, isLooping: true, volume: 0.6 }
          );
          ambientSoundRef.current = sound;
        }
      } catch (error) {
        console.log('Error switching ambient sound:', error);
      }
    }
  }, [ambientEnabled, saveAmbientSettings, isRunning, isPaused]);

  const openSoundSettings = () => {
    setShowSoundSettings(true);
    Animated.spring(panelSlideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeSoundSettings = () => {
    Animated.timing(panelSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowSoundSettings(false);
    });
  };

  const handleSoundSelect = async (soundId: SoundId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (setNotificationSound) {
      setNotificationSound(soundId);
    }
    try {
      await SoundManager.playTimerSound(soundId);
    } catch (e) {
      console.log('[TimerScreen] Preview sound error:', e);
    }
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Focus</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={openSoundSettings}
          activeOpacity={0.7}
        >
          <Settings size={22} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>

      {/* Sound Settings Modal */}
      <Modal
        visible={showSoundSettings}
        transparent
        animationType="none"
        onRequestClose={closeSoundSettings}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeSoundSettings}
        >
          <Animated.View 
            style={[
              styles.soundSettingsPanel,
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
              <View style={styles.panelHandle} />
              
              <View style={styles.panelContent}>
                <View style={styles.panelHeader}>
                  <Volume2 size={20} color="#FFD12A" />
                  <Text style={styles.panelTitle}>Notification Sound</Text>
                </View>
                
                <Text style={styles.panelSubtitle}>
                  Sound plays 3 times when timer ends
                </Text>
                
                <View style={styles.soundsList}>
                  {SOUNDS_CONFIG.map((sound) => {
                    const isSelected = selectedSound === sound.id;
                    const IconComponent = sound.icon;
                    
                    return (
                      <Pressable
                        key={sound.id}
                        style={({ pressed }) => [
                          styles.soundItem,
                          isSelected && styles.soundItemSelected,
                          pressed && styles.soundItemPressed,
                        ]}
                        onPress={() => handleSoundSelect(sound.id)}
                      >
                        <View style={[
                          styles.soundIconContainer,
                          isSelected && styles.soundIconContainerSelected,
                        ]}>
                          <IconComponent 
                            size={18} 
                            color={isSelected ? '#FFD12A' : 'rgba(255, 255, 255, 0.5)'} 
                          />
                        </View>
                        
                        <View style={styles.soundInfo}>
                          <Text style={[
                            styles.soundLabel,
                            isSelected && styles.soundLabelSelected,
                          ]}>
                            {sound.label}
                          </Text>
                          <Text style={styles.soundDescription}>
                            {sound.description}
                          </Text>
                        </View>
                        
                        <View style={styles.soundActions}>
                          <TouchableOpacity
                            style={styles.previewButton}
                            onPress={() => handleSoundSelect(sound.id)}
                          >
                            <Play size={14} color="rgba(255, 255, 255, 0.6)" fill="rgba(255, 255, 255, 0.6)" />
                          </TouchableOpacity>
                          
                          {isSelected && (
                            <View style={styles.checkIcon}>
                              <Check size={16} color="#FFD12A" strokeWidth={3} />
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <PomodoroTimer />
        
        {/* Focus Sounds Section */}
        <View style={styles.focusSoundsSection}>
          <Text style={styles.sectionTitle}>Focus Sounds</Text>
          
          <TouchableOpacity
            style={[
              styles.ambientSoundButton,
              ambientEnabled && styles.ambientSoundButtonActive,
            ]}
            onPress={handleToggleAmbient}
            
            activeOpacity={0.8}
          >
            <View style={styles.ambientSoundContent}>
              <View style={[
                styles.ambientIconContainer,
                ambientEnabled && styles.ambientIconContainerActive,
              ]}>
                {ambientEnabled ? (
                  <Headphones size={22} color="#8B5CF6" />
                ) : (
                  <VolumeX size={22} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
              <View style={styles.ambientTextContainer}>
                <Text style={[
                  styles.ambientTitle,
                  ambientEnabled && styles.ambientTitleActive,
                ]}>
                  {ambientEnabled 
                    ? AMBIENT_SOUNDS.find(s => s.id === selectedAmbientId)?.name || 'Focus Flow'
                    : 'Focus Sounds'
                  }
                </Text>
                <Text style={styles.ambientSubtitle}>
                  {ambientEnabled 
                    ? 'Playing • Hold to change' 
                    : 'Ambient sounds for concentration'}
                </Text>
              </View>
            </View>
            <View style={[
              styles.ambientToggle,
              ambientEnabled && styles.ambientToggleActive,
            ]}>
              <Text style={[
                styles.ambientToggleText,
                ambientEnabled && styles.ambientToggleTextActive,
              ]}>
                {ambientEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Sound Selection Buttons */}
          <View style={styles.ambientSoundsList}>
            {AMBIENT_SOUNDS.map((sound) => {
              const isActive = selectedAmbientId === sound.id;
              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.ambientSoundItem,
                    isActive && styles.ambientSoundItemActive,
                  ]}
                  onPress={() => handleAmbientSelect(sound.id)}
                >
                  <View style={[
                    styles.ambientSoundItemIcon,
                    isActive && styles.ambientSoundItemIconActive,
                  ]}>
                    <Headphones 
                      size={18} 
                      color={isActive ? '#8B5CF6' : 'rgba(255, 255, 255, 0.4)'} 
                    />
                  </View>
                  <View style={styles.ambientSoundItemTextContainer}>
                    <Text style={[
                      styles.ambientSoundItemText,
                      isActive && styles.ambientSoundItemTextActive,
                    ]}>
                      {sound.name}
                    </Text>
                    <Text style={styles.ambientSoundItemDescription}>
                      {sound.description}
                    </Text>
                  </View>
                  {isActive && (
                    <Check size={18} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  soundSettingsPanel: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 40,
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
    gap: 10,
    marginBottom: 6,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  panelSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: theme.spacing.lg,
  },
  soundsList: {
    gap: 10,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  soundItemSelected: {
    backgroundColor: 'rgba(255, 209, 42, 0.08)',
    borderColor: 'rgba(255, 209, 42, 0.25)',
  },
  soundItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  soundIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  soundIconContainerSelected: {
    backgroundColor: 'rgba(255, 209, 42, 0.15)',
  },
  soundInfo: {
    flex: 1,
  },
  soundLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  soundLabelSelected: {
    color: '#FFD12A',
  },
  soundDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  soundActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 209, 42, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusSoundsSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.3,
  },
  ambientSoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: theme.spacing.md,
  },
  ambientSoundButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  ambientSoundContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ambientIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ambientIconContainerActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  ambientTextContainer: {
    flex: 1,
  },
  ambientTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  ambientTitleActive: {
    color: '#8B5CF6',
  },
  ambientSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  ambientToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ambientToggleActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  ambientToggleText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  ambientToggleTextActive: {
    color: '#8B5CF6',
  },
  ambientSoundsList: {
    gap: 10,
  },
  ambientSoundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ambientSoundItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  ambientSoundItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ambientSoundItemIconActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  ambientSoundItemTextContainer: {
    flex: 1,
  },
  ambientSoundItemText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  ambientSoundItemTextActive: {
    color: '#8B5CF6',
  },
  ambientSoundItemDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
