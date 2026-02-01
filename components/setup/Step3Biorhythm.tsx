import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Sunrise, Sun, Moon } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { ProductivityTimeOption } from '@/types/first-time-setup';

interface Step3BiorhythmProps {
  onNext: (time: 'morning' | 'afternoon' | 'evening') => void;
  onSkip: () => void;
  initialTime?: 'morning' | 'afternoon' | 'evening';
}

export default function Step3Biorhythm({ onNext, onSkip, initialTime }: Step3BiorhythmProps) {
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening' | null>(
    initialTime || null
  );
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const times: ProductivityTimeOption[] = [
    {
      id: 'morning',
      icon: 'sunrise',
      title: 'Morning',
      time: '6:00 AM - 12:00 PM',
    },
    {
      id: 'afternoon',
      icon: 'sun',
      title: 'Afternoon',
      time: '12:00 PM - 6:00 PM',
    },
    {
      id: 'evening',
      icon: 'moon',
      title: 'Evening',
      time: '6:00 PM - 12:00 AM',
    },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sunrise':
        return Sunrise;
      case 'sun':
        return Sun;
      case 'moon':
        return Moon;
      default:
        return Sun;
    }
  };

  const handleSelect = (timeId: 'morning' | 'afternoon' | 'evening') => {
    setSelectedTime(timeId);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (selectedTime) {
      onNext(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>When is your peak energy?</Text>
            <Text style={styles.subtitle}>We&apos;ll customize notifications for your rhythm</Text>
          </View>

          <View style={styles.timesContainer}>
            {times.map((time) => {
              const IconComponent = getIcon(time.icon);
              const isSelected = selectedTime === time.id;
              
              return (
                <TouchableOpacity
                  key={time.id}
                  style={[
                    styles.timeCard,
                    isSelected && styles.timeCardActive,
                  ]}
                  onPress={() => handleSelect(time.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerActive
                  ]}>
                    <IconComponent 
                      size={32} 
                      color={isSelected ? theme.colors.background : theme.colors.primary}
                      strokeWidth={1.5}
                    />
                  </View>
                  <Text style={[
                    styles.timeTitle,
                    isSelected && styles.timeTitleActive
                  ]}>
                    {time.title}
                  </Text>
                  <Text style={styles.timeRange}>
                    {time.time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              !selectedTime && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={!selectedTime}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.md,
  },
  footer: {
    paddingTop: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
  },
  timesContainer: {
    gap: theme.spacing.md,
  },
  timeCard: {
    alignItems: 'center',
    backgroundColor: '#0F1213',
    borderRadius: 14,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.06)',
    minHeight: 48,
  },
  timeCardActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  iconContainer: {
    marginBottom: theme.spacing.sm,
  },
  iconContainerActive: {
  },
  timeTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  timeTitleActive: {
    color: theme.colors.background,
  },
  timeRange: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  button: {
    marginTop: theme.spacing.md,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
  skipButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    fontWeight: theme.fontWeight.medium,
  },
});
