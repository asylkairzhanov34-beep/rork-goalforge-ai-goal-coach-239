import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Play, Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { SOUNDS_CONFIG, SoundId } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';

interface SoundSelectorProps {
  selectedSound: SoundId;
  onSoundChange: (sound: SoundId) => void;
}

export function SoundSelector({ selectedSound, onSoundChange }: SoundSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<SoundId | null>(null);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 4 });

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const preloadSounds = async () => {
      console.log('🔊 Starting optimized sound preload...');
      setIsLoading(true);
      
      try {
        await SoundManager.preloadAll();
        setLoadProgress({ 
          loaded: SoundManager.getLoadedCount(), 
          total: SoundManager.getTotalCount() 
        });
        console.log('🎵 All sounds loaded and ready!');
        setIsLoading(false);
      } catch (error) {
        console.error('Error preloading sounds:', error);
        setIsLoading(false);
      }
    };

    preloadSounds();

    return () => {
      console.log('🧹 Component unmounting - sounds remain cached');
    };
  }, []);

  const playPreviewSound = async (soundId: SoundId) => {
    if (Platform.OS === 'web') {
      console.log('Sound preview not available on web');
      return;
    }

    try {
      setCurrentlyPlaying(soundId);
      await SoundManager.playPreview(soundId);
      console.log(`▶️ Playing preview: ${soundId}`);
      
      setTimeout(() => setCurrentlyPlaying(null), 2000);
    } catch (error) {
      console.error('Error playing preview sound:', error);
      setCurrentlyPlaying(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Sound</Text>
      {isLoading && Platform.OS !== 'web' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Loading sounds... ({loadProgress.loaded}/{loadProgress.total})
          </Text>
        </View>
      )}
      <View style={styles.optionsContainer}>
        {SOUNDS_CONFIG.map((soundConfig) => {
          const IconComponent = soundConfig.icon;
          const isSelected = selectedSound === soundConfig.id;
          const isPlayingThis = currentlyPlaying === soundConfig.id;
          
          return (
            <TouchableOpacity
              key={soundConfig.id}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => {
                console.log('Selected sound:', soundConfig.id);
                onSoundChange(soundConfig.id);
              }}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}>
                  <IconComponent 
                    size={20} 
                    color={isSelected ? theme.colors.background : theme.colors.primary} 
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}>
                    {soundConfig.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    isSelected && styles.optionDescriptionSelected,
                  ]}>
                    {soundConfig.description}
                  </Text>
                </View>
                <View style={styles.rightSection}>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Check 
                        size={16} 
                        color={theme.colors.background} 
                      />
                    </View>
                  )}
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={[
                        styles.previewButton,
                        isSelected && styles.previewButtonSelected,
                        isPlayingThis && styles.previewButtonPlaying,
                      ]}
                      onPress={() => playPreviewSound(soundConfig.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator 
                          size="small" 
                          color={isSelected ? theme.colors.background : theme.colors.primary} 
                        />
                      ) : (
                        <Play 
                          size={16} 
                          color={isSelected ? theme.colors.background : theme.colors.primary} 
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  optionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    ...theme.shadows.subtle,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  iconContainerSelected: {
    backgroundColor: theme.colors.background + '20',
    borderColor: theme.colors.background + '50',
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: theme.colors.background,
    fontWeight: theme.fontWeight.semibold as any,
  },
  optionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  optionDescriptionSelected: {
    color: theme.colors.background + 'CC',
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  previewButtonSelected: {
    backgroundColor: theme.colors.background + '20',
    borderColor: theme.colors.background + '50',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.background + '50',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  previewButtonPlaying: {
    backgroundColor: theme.colors.primary + '30',
    transform: [{ scale: 1.1 }],
  },
});