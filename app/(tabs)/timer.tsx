import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Volume2, Check, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { useTimer } from '@/hooks/use-timer-store';
import { SOUNDS_CONFIG, SoundId } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';


export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const timerStore = useTimer();
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const panelSlideAnim = useRef(new Animated.Value(0)).current;
  
  const selectedSound = timerStore?.notificationSound || 'bell';
  const setNotificationSound = timerStore?.setNotificationSound;

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
});
