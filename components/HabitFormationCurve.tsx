import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, G } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 60;
const CHART_HEIGHT = 220;
const PADDING_LEFT = 45;
const PADDING_RIGHT = 30;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 50;

const GRAPH_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const GRAPH_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

interface Milestone {
  x: number;
  y: number;
  label: string;
  days: string;
}

const milestones: Milestone[] = [
  { x: 0.08, y: 0.85, label: 'Trigger', days: '7 Days' },
  { x: 0.32, y: 0.65, label: 'Resistance', days: '21 Days' },
  { x: 0.58, y: 0.38, label: 'Stabilization', days: '66 Days' },
  { x: 0.92, y: 0.08, label: 'Automaticity', days: '67+ Days' },
];

const yAxisLabels = ['58%', '34%', '15%', '5%'];

export function HabitFormationCurve() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pathAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(pathAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, pathAnim]);

  const getX = (ratio: number) => PADDING_LEFT + ratio * GRAPH_WIDTH;
  const getY = (ratio: number) => PADDING_TOP + ratio * GRAPH_HEIGHT;

  const curvePath = `
    M ${getX(0)} ${getY(1)}
    Q ${getX(0.05)} ${getY(0.92)}, ${getX(milestones[0].x)} ${getY(milestones[0].y)}
    Q ${getX(0.18)} ${getY(0.78)}, ${getX(milestones[1].x)} ${getY(milestones[1].y)}
    Q ${getX(0.45)} ${getY(0.52)}, ${getX(milestones[2].x)} ${getY(milestones[2].y)}
    Q ${getX(0.75)} ${getY(0.22)}, ${getX(milestones[3].x)} ${getY(milestones[3].y)}
  `;

  const areaPath = `
    ${curvePath}
    L ${getX(milestones[3].x)} ${getY(1)}
    L ${getX(0)} ${getY(1)}
    Z
  `;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>Building good habits{'\n'}boosts happiness!</Text>
      
      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisTitle}>Happiness</Text>
          {yAxisLabels.map((label, index) => (
            <Text key={index} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>

        <View style={styles.chartWrapper}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.4} />
                <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0.02} />
              </LinearGradient>
              <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.6} />
                <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity={1} />
              </LinearGradient>
            </Defs>

            {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <G key={`grid-${index}`}>
                <Line
                  x1={PADDING_LEFT}
                  y1={getY(ratio)}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y2={getY(ratio)}
                  stroke="rgba(255, 215, 0, 0.1)"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              </G>
            ))}

            {milestones.map((milestone, index) => (
              <Line
                key={`vline-${index}`}
                x1={getX(milestone.x)}
                y1={getY(milestone.y)}
                x2={getX(milestone.x)}
                y2={getY(1)}
                stroke="rgba(255, 215, 0, 0.15)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            ))}

            <Line
              x1={PADDING_LEFT}
              y1={getY(1)}
              x2={CHART_WIDTH - PADDING_RIGHT}
              y2={getY(1)}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={1}
            />

            <Line
              x1={PADDING_LEFT}
              y1={PADDING_TOP}
              x2={PADDING_LEFT}
              y2={getY(1)}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={1}
            />

            <Path
              d={areaPath}
              fill="url(#curveGradient)"
            />

            <Path
              d={curvePath}
              stroke="url(#lineGradient)"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {milestones.map((milestone, index) => (
              <G key={`point-${index}`}>
                <Circle
                  cx={getX(milestone.x)}
                  cy={getY(milestone.y)}
                  r={10}
                  fill={theme.colors.background}
                  stroke={theme.colors.primary}
                  strokeWidth={2}
                />
                {index === milestones.length - 1 && (
                  <Circle
                    cx={getX(milestone.x)}
                    cy={getY(milestone.y)}
                    r={6}
                    fill={theme.colors.primary}
                  />
                )}
              </G>
            ))}
          </Svg>

          {milestones.map((milestone, index) => (
            <View
              key={`label-${index}`}
              style={[
                styles.milestoneLabel,
                {
                  left: getX(milestone.x) - 30,
                  top: getY(milestone.y) - 45,
                },
              ]}
            >
              <Text style={styles.milestoneDays}>{milestone.days}</Text>
            </View>
          ))}

          <View style={styles.checkmarkContainer}>
            <View style={styles.checkmark}>
              <Check size={14} color={theme.colors.background} strokeWidth={3} />
            </View>
          </View>

          <View style={styles.xAxisLabels}>
            {milestones.map((milestone, index) => (
              <Text
                key={`xlabel-${index}`}
                style={[
                  styles.xAxisLabel,
                  { left: getX(milestone.x) - 35 },
                ]}
              >
                {milestone.label}
              </Text>
            ))}
          </View>

          <View style={styles.habitualStageContainer}>
            <Text style={styles.habitualStageText}>Habitual Stage</Text>
          </View>
        </View>
      </View>

      <Text style={styles.caption}>
        · Habit Formation Curve and Trajectory{'\n'}of Subjective Well-being (SWB) Evolution ·
      </Text>

      <Text style={styles.description}>
        Studies show habit building increases happiness by improving confidence, routine, and control.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 36,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: GRAPH_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    zIndex: 10,
  },
  yAxisTitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
    position: 'absolute',
    top: -20,
    left: 0,
  },
  yAxisLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  chartWrapper: {
    position: 'relative',
  },
  milestoneLabel: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
  },
  milestoneDays: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  checkmarkContainer: {
    position: 'absolute',
    right: PADDING_RIGHT + 8,
    top: PADDING_TOP - 5,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    height: 30,
  },
  xAxisLabel: {
    position: 'absolute',
    width: 70,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  habitualStageContainer: {
    position: 'absolute',
    right: 0,
    top: PADDING_TOP + GRAPH_HEIGHT / 2,
    transform: [{ rotate: '90deg' }, { translateX: 40 }],
  },
  habitualStageText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
});
