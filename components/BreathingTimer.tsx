import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform, ImageBackground } from 'react-native';
import { Play, Pause, Square, ArrowLeft, Wind, Sparkles, Clock, Zap } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { useBreathingTimer } from '@/hooks/use-breathing-timer';
import { BreathingTechnique } from '@/types/breathing';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const TIMER_SIZE = Math.min(screenWidth * 0.65, 280);
const STROKE_WIDTH = 6;
const RADIUS = (TIMER_SIZE / 2) - STROKE_WIDTH - 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface BreathingTimerProps {
  technique: BreathingTechnique;
}

export function BreathingTimer({ technique }: BreathingTimerProps) {
  const {
    isActive,
    isPaused,
    currentCycle,
    currentPhase,
    phaseTimeLeft,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    getProgress,
    getOverallProgress
  } = useBreathingTimer();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const ringPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulseAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(ringPulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0.3);
      ringPulseAnim.setValue(1);
    }
  }, [isActive, isPaused, glowAnim, ringPulseAnim]);

  useEffect(() => {
    if (isActive && !isPaused && currentPhase) {
      const isInhale = currentPhase.type === 'inhale';
      const isExhale = currentPhase.type === 'exhale';
      
      if (isInhale || isExhale) {
        const targetScale = isInhale ? 1.12 : 0.92;
        const duration = phaseTimeLeft * 1000;
        
        Animated.timing(pulseAnim, {
          toValue: targetScale,
          duration: duration,
          useNativeDriver: false,
        }).start();
      } else {
        pulseAnim.stopAnimation();
      }
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, isPaused, currentPhase, phaseTimeLeft, pulseAnim]);

  const handleStart = () => {
    if (!isActive) {
      startSession(technique);
    } else if (isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  const handleStop = () => {
    stopSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const progress = getProgress();
  const overallProgress = getOverallProgress();
  const techniqueColor = technique.color || theme.colors.primary;

  const getPhaseColor = () => {
    if (!currentPhase) return techniqueColor;
    
    switch (currentPhase.type) {
      case 'inhale': return '#10B981';
      case 'exhale': return '#F59E0B';
      case 'hold': return '#8B5CF6';
      case 'pause': return '#6B7280';
      default: return techniqueColor;
    }
  };

  const getPhaseIcon = () => {
    if (!currentPhase) return <Wind size={20} color={theme.colors.textSecondary} />;
    
    switch (currentPhase.type) {
      case 'inhale': return <Wind size={20} color="#10B981" />;
      case 'exhale': return <Wind size={20} color="#F59E0B" style={{ transform: [{ rotate: '180deg' }] }} />;
      case 'hold': return <Sparkles size={20} color="#8B5CF6" />;
      case 'pause': return <Clock size={20} color="#6B7280" />;
      default: return <Wind size={20} color={techniqueColor} />;
    }
  };

  const formatTime = (seconds: number): string => {
    return seconds.toString();
  };

  const phaseColor = getPhaseColor();

  const ContainerComponent = technique.image ? ImageBackground : View;
  const containerProps = technique.image ? { source: { uri: technique.image }, resizeMode: 'cover' as const } : {};

  return (
    <ContainerComponent style={styles.container} {...containerProps}>
      {technique.image && <View style={styles.imageOverlay} />}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/home');
          }
        }}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{technique.name}</Text>
          <View style={styles.cycleIndicator}>
            <View style={[styles.cycleDot, { backgroundColor: techniqueColor }]} />
            <Text style={styles.subtitle}>
              Cycle {currentCycle + 1} of {technique.totalCycles}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.timerSection}>
        <Animated.View style={[
          styles.outerGlow,
          {
            opacity: glowAnim,
            backgroundColor: phaseColor + '15',
            transform: [{ scale: ringPulseAnim }]
          }
        ]} />
        
        <Animated.View style={[
          styles.timerContainer,
          {
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ]
          }
        ]}>
          <View style={[styles.timerCircle, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
            <ExpoLinearGradient
              colors={[phaseColor + '20', phaseColor + '05', 'transparent']}
              style={[styles.circleGradient, { width: TIMER_SIZE, height: TIMER_SIZE, borderRadius: TIMER_SIZE / 2 }]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            
            <View style={[
              styles.innerRing,
              {
                width: TIMER_SIZE - 20,
                height: TIMER_SIZE - 20,
                borderRadius: (TIMER_SIZE - 20) / 2,
                borderColor: phaseColor + '30',
              }
            ]} />
            
            <View style={styles.progressContainer}>
              {Platform.OS !== 'web' ? (
                <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.progressSvg}>
                  <Defs>
                    <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={phaseColor} stopOpacity="1" />
                      <Stop offset="100%" stopColor={phaseColor} stopOpacity="0.6" />
                    </LinearGradient>
                  </Defs>
                  <Circle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={RADIUS}
                    stroke={theme.colors.glassBorder}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    opacity={0.2}
                  />
                  <Circle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={RADIUS}
                    stroke="url(#progressGradient)"
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE.toString()}
                    strokeDashoffset={(CIRCUMFERENCE * (1 - progress)).toString()}
                    transform={`rotate(-90 ${TIMER_SIZE / 2} ${TIMER_SIZE / 2})`}
                  />
                </Svg>
              ) : (
                <>
                  <View style={[
                    styles.progressRingWeb,
                    {
                      width: TIMER_SIZE - STROKE_WIDTH * 2 - 20,
                      height: TIMER_SIZE - STROKE_WIDTH * 2 - 20,
                      borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2 - 20) / 2,
                      borderWidth: STROKE_WIDTH,
                      borderColor: theme.colors.glassBorder + '33',
                    }
                  ]} />
                  <View style={[
                    styles.progressRingWeb,
                    {
                      width: TIMER_SIZE - STROKE_WIDTH * 2 - 20,
                      height: TIMER_SIZE - STROKE_WIDTH * 2 - 20,
                      borderRadius: (TIMER_SIZE - STROKE_WIDTH * 2 - 20) / 2,
                      borderWidth: STROKE_WIDTH,
                      borderColor: 'transparent',
                      borderTopColor: phaseColor,
                      transform: [
                        { rotate: '-90deg' },
                        { rotate: `${progress * 360}deg` },
                      ],
                    },
                  ]} />
                </>
              )}
            </View>
            
            <View style={styles.timerContent}>
              <View style={[styles.phaseIconContainer, { backgroundColor: phaseColor + '20' }]}>
                {getPhaseIcon()}
              </View>
              <Text style={[styles.timerText, { color: phaseColor }]}>
                {formatTime(phaseTimeLeft)}
              </Text>
              <Text style={styles.phaseText}>
                {currentPhase?.name || 'Ready'}
              </Text>
              <Text style={styles.instructionText}>
                {currentPhase?.instruction || 'Press start to begin'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.overallProgress}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={[styles.progressPercent, { color: techniqueColor }]}>
            {Math.round(overallProgress * 100)}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { borderColor: theme.colors.glassBorder }]}>
            <ExpoLinearGradient
              colors={[techniqueColor, techniqueColor + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${overallProgress * 100}%` }
              ]}
            />
          </View>
        </View>
        <View style={styles.cycleDotsContainer}>
          {Array.from({ length: technique.totalCycles }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressCycleDot,
                {
                  backgroundColor: index <= currentCycle ? techniqueColor : theme.colors.surface,
                  borderColor: index <= currentCycle ? techniqueColor : theme.colors.glassBorder,
                }
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.primaryButton]}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <ExpoLinearGradient
            colors={[phaseColor, phaseColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            {!isActive ? (
              <Play size={26} color={theme.colors.background} fill={theme.colors.background} />
            ) : isPaused ? (
              <Play size={26} color={theme.colors.background} fill={theme.colors.background} />
            ) : (
              <Pause size={26} color={theme.colors.background} fill={theme.colors.background} />
            )}
            <Text style={styles.primaryButtonText}>
              {!isActive ? 'Start' : isPaused ? 'Resume' : 'Pause'}
            </Text>
          </ExpoLinearGradient>
        </TouchableOpacity>
        
        {isActive && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleStop} activeOpacity={0.7}>
            <Square size={18} color={theme.colors.textSecondary} fill={theme.colors.textSecondary} />
            <Text style={styles.secondaryButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.infoCard, { borderColor: techniqueColor + '30' }]}>
        <View style={styles.infoHeader}>
          <View style={[styles.infoIconContainer, { backgroundColor: techniqueColor + '15' }]}>
            <Zap size={18} color={techniqueColor} />
          </View>
          <Text style={styles.infoTitle}>About This Technique</Text>
        </View>
        
        <Text style={styles.infoDescription}>{technique.description}</Text>
        
        <View style={[styles.benefitsBadge, { backgroundColor: techniqueColor + '10', borderColor: techniqueColor + '20' }]}>
          <Sparkles size={14} color={techniqueColor} />
          <Text style={[styles.infoBenefits, { color: techniqueColor }]}>{technique.benefits}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: techniqueColor }]}>{technique.totalCycles}</Text>
            <Text style={styles.statLabel}>cycles</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.glassBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: techniqueColor }]}>{technique.phases.length}</Text>
            <Text style={styles.statLabel}>phases</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.glassBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: techniqueColor }]}>
              {Math.round(technique.phases.reduce((sum, phase) => sum + phase.duration, 0) * technique.totalCycles / 60)}
            </Text>
            <Text style={styles.statLabel}>min</Text>
          </View>
        </View>
      </View>
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: theme.spacing.xs,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginRight: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cycleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cycleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    width: TIMER_SIZE + 60,
    height: TIMER_SIZE + 60,
    borderRadius: (TIMER_SIZE + 60) / 2,
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
  circleGradient: {
    position: 'absolute',
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
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
  phaseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 56,
    fontWeight: theme.fontWeight.extrabold as any,
    marginBottom: 4,
    letterSpacing: -2,
  },
  phaseText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 180,
  },
  overallProgress: {
    marginBottom: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium as any,
  },
  progressPercent: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold as any,
  },
  progressBarContainer: {
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  cycleDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressCycleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  primaryButton: {
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    ...theme.shadows.gold,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.background,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    ...theme.shadows.subtle,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  infoDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  benefitsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  infoBenefits: {
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    fontWeight: theme.fontWeight.medium as any,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
});
