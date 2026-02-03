import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Pressable, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Volume2, Check, Play, Headphones, VolumeX, Music, Waves, Sparkles } from 'lucide-react-native';
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
  { id: 'ambient1', name: 'Focus Flow', description: 'Calm ambient for deep work', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770142014/3gwt67NbS8Go3MhssMPz_oo3xfu.mp4', icon: Music, gradient: ['#667eea', '#764ba2'] as const },
  { id: 'ambient2', name: 'Zen Waves', description: 'Peaceful concentration tones', url: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770142016/hYCBEvsXvN3tenAHl9PZ_unyiy9.mp4', icon: Waves, gradient: ['#11998e', '#38ef7d'] as const },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');


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
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Sparkles size={18} color="#a78bfa" />
              <Text style={styles.sectionTitle}>Focus Sounds</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Ambient audio for deep concentration</Text>
          </View>
          
          {/* Main Toggle Card */}
          <TouchableOpacity
            style={styles.mainToggleCard}
            onPress={handleToggleAmbient}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={ambientEnabled 
                ? ['rgba(139, 92, 246, 0.15)', 'rgba(99, 102, 241, 0.08)']
                : ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainToggleGradient}
            >
              <View style={styles.mainToggleContent}>
                <View style={[
                  styles.mainToggleIcon,
                  ambientEnabled && styles.mainToggleIconActive,
                ]}>
                  {ambientEnabled ? (
                    <Headphones size={26} color="#a78bfa" />
                  ) : (
                    <VolumeX size={26} color="rgba(255, 255, 255, 0.3)" />
                  )}
                  {ambientEnabled && (
                    <View style={styles.pulseRing} />
                  )}
                </View>
                <View style={styles.mainToggleText}>
                  <Text style={[
                    styles.mainToggleTitle,
                    ambientEnabled && styles.mainToggleTitleActive,
                  ]}>
                    {ambientEnabled ? 'Now Playing' : 'Focus Sounds Off'}
                  </Text>
                  <Text style={styles.mainToggleSubtitle}>
                    {ambientEnabled 
                      ? `${AMBIENT_SOUNDS.find(s => s.id === selectedAmbientId)?.name || 'Focus Flow'} • Tap to pause`
                      : 'Tap to enable ambient sounds'
                    }
                  </Text>
                </View>
              </View>
              <View style={[
                styles.toggleSwitch,
                ambientEnabled && styles.toggleSwitchActive,
              ]}>
                <View style={[
                  styles.toggleKnob,
                  ambientEnabled && styles.toggleKnobActive,
                ]} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Sound Cards */}
          <View style={styles.soundCardsContainer}>
            {AMBIENT_SOUNDS.map((sound, index) => {
              const isActive = selectedAmbientId === sound.id;
              const IconComponent = sound.icon;
              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.soundCard,
                    isActive && styles.soundCardActive,
                  ]}
                  onPress={() => handleAmbientSelect(sound.id)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={isActive 
                      ? [sound.gradient[0] + '25', sound.gradient[1] + '15']
                      : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.soundCardGradient}
                  >
                    <View style={styles.soundCardHeader}>
                      <LinearGradient
                        colors={isActive ? [...sound.gradient] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.soundCardIcon}
                      >
                        <IconComponent 
                          size={22} 
                          color={isActive ? '#fff' : 'rgba(255, 255, 255, 0.4)'} 
                        />
                      </LinearGradient>
                      {isActive && (
                        <View style={styles.activeIndicator}>
                          <View style={[styles.equalizerBar, styles.bar1]} />
                          <View style={[styles.equalizerBar, styles.bar2]} />
                          <View style={[styles.equalizerBar, styles.bar3]} />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.soundCardContent}>
                      <Text style={[
                        styles.soundCardTitle,
                        isActive && { color: sound.gradient[0] },
                      ]}>
                        {sound.name}
                      </Text>
                      <Text style={styles.soundCardDescription}>
                        {sound.description}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.soundCardCheck,
                      isActive && { backgroundColor: sound.gradient[0] + '30', borderColor: sound.gradient[0] + '50' },
                    ]}>
                      {isActive ? (
                        <Check size={14} color={sound.gradient[0]} strokeWidth={3} />
                      ) : (
                        <Play size={12} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
                      )}
                    </View>
                  </LinearGradient>
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
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 26,
  },
  mainToggleCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  mainToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  mainToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainToggleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mainToggleIconActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  pulseRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  mainToggleText: {
    flex: 1,
  },
  mainToggleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 3,
  },
  mainToggleTitleActive: {
    color: '#a78bfa',
  },
  mainToggleSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  toggleSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  toggleKnobActive: {
    backgroundColor: '#a78bfa',
    alignSelf: 'flex-end',
  },
  soundCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  soundCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  soundCardActive: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  soundCardGradient: {
    padding: 16,
    minHeight: 140,
  },
  soundCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  soundCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 18,
  },
  equalizerBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
  },
  bar1: {
    height: 8,
  },
  bar2: {
    height: 14,
  },
  bar3: {
    height: 10,
  },
  soundCardContent: {
    flex: 1,
  },
  soundCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  soundCardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 16,
  },
  soundCardCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});
