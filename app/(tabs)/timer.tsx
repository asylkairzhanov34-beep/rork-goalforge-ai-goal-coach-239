import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Volume2, Check, Play, Headphones, VolumeX, Radio, Globe, Moon, Orbit, Wind, CloudRain, Coffee } from 'lucide-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { useTimer } from '@/hooks/use-timer-store';
import { SOUNDS_CONFIG, SoundId } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';

const AMBIENT_STORAGE_KEY = '@timer_ambient_settings';

interface LofiStation {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: typeof Radio;
  gradient: readonly [string, string];
  tag: string;
}

const LOFI_STATIONS: LofiStation[] = [
  { id: 'groovesalad', name: 'Groove Salad', description: 'Ambient downtempo beats & grooves', url: 'https://ice1.somafm.com/groovesalad-128-mp3', icon: Coffee, gradient: ['#f7971e', '#ffd200'] as const, tag: 'CHILL' },
  { id: 'dronezone', name: 'Drone Zone', description: 'Atmospheric textures, minimal beats', url: 'https://ice1.somafm.com/dronezone-128-mp3', icon: Moon, gradient: ['#667eea', '#764ba2'] as const, tag: 'DEEP' },
  { id: 'deepspaceone', name: 'Deep Space One', description: 'Deep ambient electronic exploration', url: 'https://ice1.somafm.com/deepspaceone-128-mp3', icon: Orbit, gradient: ['#0f2027', '#2c5364'] as const, tag: 'AMBIENT' },
  { id: 'lush', name: 'Lush', description: 'Mellow vocals, dreamy electronica', url: 'https://ice1.somafm.com/lush-128-mp3', icon: Wind, gradient: ['#11998e', '#38ef7d'] as const, tag: 'VOCAL' },
  { id: 'spacestation', name: 'Space Station', description: 'Spaced-out ambient & mid-tempo', url: 'https://ice1.somafm.com/spacestation-128-mp3', icon: Globe, gradient: ['#4568dc', '#b06ab3'] as const, tag: 'SPACE' },
  { id: 'gsclassic', name: 'Groove Salad Classic', description: 'Classic chilled ambient from 2000s', url: 'https://ice1.somafm.com/gsclassic-128-mp3', icon: CloudRain, gradient: ['#355c7d', '#6c5b7b'] as const, tag: 'RETRO' },
];

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const timerStore = useTimer();
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  const panelSlideAnim = useRef(new Animated.Value(0)).current;

  
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [selectedAmbientId, setSelectedAmbientId] = useState('groovesalad');
  const ambientSoundRef = useRef<Audio.Sound | null>(null);
  
  const selectedSound = timerStore?.notificationSound || 'bell';
  const setNotificationSound = timerStore?.setNotificationSound;
  
  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;

  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    const loadAmbientSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(AMBIENT_STORAGE_KEY);
        if (stored) {
          const settings = JSON.parse(stored);
          const validStation = LOFI_STATIONS.find(s => s.id === settings.soundId);
          setSelectedAmbientId(validStation ? settings.soundId : 'groovesalad');
          setAmbientEnabled(settings.enabled === true);
        }
      } catch (error) {
        console.log('Error loading ambient settings:', error);
      }
    };
    void loadAmbientSettings();
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
        const selectedStation = LOFI_STATIONS.find(s => s.id === selectedAmbientId);
        if (!selectedStation) return;
        try {
          if (ambientSoundRef.current) {
            try { await ambientSoundRef.current.unloadAsync(); } catch {}
            ambientSoundRef.current = null;
          }
          setIsBuffering(true);
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            { uri: selectedStation.url },
            { shouldPlay: true, volume: 0.6, isLooping: false },
            (status) => {
              if (status.isLoaded) {
                setIsBuffering(status.isBuffering);
              }
            }
          );
          ambientSoundRef.current = sound;
          console.log('[Timer] Lo-fi radio started:', selectedStation.name);
        } catch (error) {
          console.log('Error playing lo-fi radio:', error);
          setIsBuffering(false);
        }
      } else if (isPaused && ambientSoundRef.current) {
        try {
          await ambientSoundRef.current.pauseAsync();
        } catch (error) {
          console.log('Error pausing lo-fi radio:', error);
        }
      } else if (!isRunning && ambientSoundRef.current) {
        try {
          await ambientSoundRef.current.pauseAsync();
          await ambientSoundRef.current.unloadAsync();
          ambientSoundRef.current = null;
          setIsBuffering(false);
        } catch (error) {
          console.log('Error stopping lo-fi radio:', error);
        }
      }
    };
    void handleAmbientPlayback();
  }, [isRunning, isPaused, ambientEnabled, selectedAmbientId]);

  useEffect(() => {
    return () => {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handleToggleAmbient = useCallback(async () => {
    const newEnabled = !ambientEnabled;
    setAmbientEnabled(newEnabled);
    void saveAmbientSettings(selectedAmbientId, newEnabled);
    
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!newEnabled && ambientSoundRef.current) {
      try {
        await ambientSoundRef.current.pauseAsync();
        await ambientSoundRef.current.unloadAsync();
        ambientSoundRef.current = null;
      } catch (error) {
        console.log('Error stopping ambient:', error);
      }
    }
  }, [ambientEnabled, selectedAmbientId, saveAmbientSettings]);



  const handleAmbientSelect = useCallback(async (soundId: string) => {
    setSelectedAmbientId(soundId);
    void saveAmbientSettings(soundId, ambientEnabled);
    
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }

    if (isRunning && !isPaused && ambientEnabled) {
      try {
        if (ambientSoundRef.current) {
          try { await ambientSoundRef.current.unloadAsync(); } catch {}
          ambientSoundRef.current = null;
        }
        setIsBuffering(true);
        const newStation = LOFI_STATIONS.find(s => s.id === soundId);
        if (newStation) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            { uri: newStation.url },
            { shouldPlay: true, volume: 0.6, isLooping: false },
            (status) => {
              if (status.isLoaded) {
                setIsBuffering(status.isBuffering);
              }
            }
          );
          ambientSoundRef.current = sound;
          console.log('[Timer] Switched to lo-fi radio:', newStation.name);
        }
      } catch (error) {
        console.log('Error switching lo-fi radio:', error);
        setIsBuffering(false);
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        
        {/* Lo-Fi Radio Section */}
        <View style={styles.focusSoundsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Radio size={18} color="#f7971e" />
              <Text style={styles.sectionTitle}>Lo-Fi Radio</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Live radio streams for deep focus</Text>
          </View>
          
          {/* Main Toggle Card */}
          <TouchableOpacity
            style={styles.mainToggleCard}
            onPress={handleToggleAmbient}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={ambientEnabled 
                ? ['rgba(247, 151, 30, 0.15)', 'rgba(255, 210, 0, 0.08)']
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
                    <Headphones size={26} color="#f7971e" />
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
                    {ambientEnabled 
                      ? (isBuffering ? 'Connecting...' : 'On Air')
                      : 'Lo-Fi Radio Off'
                    }
                  </Text>
                  <Text style={styles.mainToggleSubtitle}>
                    {ambientEnabled 
                      ? `${LOFI_STATIONS.find(s => s.id === selectedAmbientId)?.name || 'Groove Salad'} • Tap to stop`
                      : 'Tap to tune in during focus'
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
          
          {/* Radio Station Cards */}
          <View style={styles.radioStationsGrid}>
            {LOFI_STATIONS.map((station) => {
              const isActive = selectedAmbientId === station.id;
              const isPlaying = isActive && ambientEnabled && isRunning && !isPaused;
              const IconComponent = station.icon;
              return (
                <TouchableOpacity
                  key={station.id}
                  style={[
                    styles.radioCard,
                    isActive && styles.radioCardActive,
                    isPlaying && styles.radioCardPlaying,
                  ]}
                  onPress={() => handleAmbientSelect(station.id)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={isActive 
                      ? [station.gradient[0] + '20', station.gradient[1] + '10']
                      : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.radioCardGradient}
                  >
                    <View style={styles.radioCardTop}>
                      <LinearGradient
                        colors={isActive ? [...station.gradient] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.radioCardIcon}
                      >
                        <IconComponent 
                          size={20} 
                          color={isActive ? '#fff' : 'rgba(255, 255, 255, 0.4)'} 
                        />
                      </LinearGradient>
                      <View style={[
                        styles.radioTag,
                        isActive && { backgroundColor: station.gradient[0] + '30' },
                      ]}>
                        <Text style={[
                          styles.radioTagText,
                          isActive && { color: station.gradient[0] },
                        ]}>{station.tag}</Text>
                      </View>
                    </View>
                    
                    <Text style={[
                      styles.radioCardTitle,
                      isActive && { color: station.gradient[0] },
                    ]} numberOfLines={1}>
                      {station.name}
                    </Text>
                    <Text style={styles.radioCardDescription} numberOfLines={2}>
                      {station.description}
                    </Text>
                    
                    <View style={styles.radioCardBottom}>
                      {isPlaying ? (
                        <View style={styles.radioLiveIndicator}>
                          <View style={[styles.liveDot, { backgroundColor: station.gradient[0] }]} />
                          <Text style={[styles.liveText, { color: station.gradient[0] }]}>LIVE</Text>
                        </View>
                      ) : isActive ? (
                        <View style={styles.radioSelectedBadge}>
                          <Check size={12} color={station.gradient[0]} strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={styles.radioPlayBadge}>
                          <Play size={10} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <Text style={styles.radioCredit}>Powered by SomaFM • Commercial-free radio</Text>
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
    backgroundColor: 'rgba(247, 151, 30, 0.15)',
  },
  pulseRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(247, 151, 30, 0.3)',
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
    color: '#f7971e',
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
    backgroundColor: 'rgba(247, 151, 30, 0.4)',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  toggleKnobActive: {
    backgroundColor: '#f7971e',
    alignSelf: 'flex-end',
  },
  radioStationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  radioCard: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    flexBasis: '47%' as unknown as number,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  radioCardActive: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  radioCardPlaying: {
    borderColor: 'rgba(247, 151, 30, 0.25)',
  },
  radioCardGradient: {
    padding: 14,
    minHeight: 130,
  },
  radioCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radioCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  radioTagText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.8,
  },
  radioCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 3,
  },
  radioCardDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    lineHeight: 15,
  },
  radioCardBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  radioSelectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPlayBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCredit: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.2)',
    textAlign: 'center',
    marginTop: 14,
  },
});
