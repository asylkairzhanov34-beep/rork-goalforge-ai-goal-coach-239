import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { theme } from '@/constants/theme';

const CHART_HEIGHT = 120;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 10;

interface DataPoint {
  date: Date;
  value: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  emptyMessage?: string;
}

export function ProgressChart({ data, title, subtitle, emptyMessage }: ProgressChartProps) {
  const [chartWidth, setChartWidth] = useState(200);
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChartWidth(width);
  };

  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], labels: [], maxValue: 100, avgValue: 0 };

    const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
    const last10 = sortedData.slice(-10);
    
    const maxValue = 100;
    const usableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const usableWidth = chartWidth - 10;
    
    const points = last10.map((d, i) => {
      const xPos = last10.length === 1 
        ? usableWidth / 2 
        : (i / (last10.length - 1)) * usableWidth;
      const yPos = PADDING_TOP + usableHeight - (d.value / maxValue) * usableHeight;
      
      return {
        x: xPos,
        y: yPos,
        value: d.value,
        date: d.date,
      };
    });

    const labels = last10.map(d => {
      const month = d.date.toLocaleDateString('en-US', { month: 'short' });
      const day = d.date.getDate();
      return `${month} ${day}`;
    });
    
    const avgValue = last10.length > 0 
      ? Math.round(last10.reduce((sum, d) => sum + d.value, 0) / last10.length)
      : 0;

    return { points, labels, maxValue, avgValue };
  }, [data, chartWidth]);

  const hasData = data.length > 0 && chartData.points.some(p => p.value > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <TrendingUp size={16} color={theme.colors.primary} />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

      </View>

      <View style={styles.chartWrapper}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>100%</Text>
          <Text style={styles.axisLabel}>50%</Text>
          <Text style={styles.axisLabel}>0%</Text>
        </View>

        <View style={styles.chartArea} onLayout={handleLayout}>
          <View style={styles.gridLines}>
            <View style={styles.gridLine} />
            <View style={[styles.gridLine, styles.gridLineMiddle]} />
            <View style={styles.gridLine} />
          </View>

          {!hasData ? (
            <View style={styles.emptyOverlay}>
              <View style={styles.emptyContent}>
                <View style={styles.emptyIconWrap}>
                  <TrendingUp size={20} color="rgba(255,255,255,0.3)" />
                </View>
                <Text style={styles.emptyText}>
                  {emptyMessage || 'Complete tasks to see your progress chart'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.lineContainer}>
              {chartData.points.map((point, index) => {
                if (index === 0) return null;
                const prev = chartData.points[index - 1];
                const length = Math.sqrt(
                  Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2)
                );
                const angle = Math.atan2(point.y - prev.y, point.x - prev.x) * (180 / Math.PI);
                
                return (
                  <View
                    key={`line-${index}`}
                    style={[
                      styles.lineSegment,
                      {
                        width: length,
                        left: prev.x,
                        top: prev.y - 1,
                        transform: [{ rotate: `${angle}deg` }],
                      },
                    ]}
                  />
                );
              })}
              
              {chartData.points.map((point, index) => (
                <View
                  key={`point-${index}`}
                  style={[
                    styles.dataPoint,
                    {
                      left: point.x - 4,
                      top: point.y - 4,
                    },
                  ]}
                >
                  <View style={styles.dataPointInner} />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {hasData && chartData.labels.length > 0 && (
        <View style={styles.xAxisLabels}>
          <Text style={styles.axisLabel}>{chartData.labels[0]}</Text>
          {chartData.labels.length > 4 && (
            <Text style={styles.axisLabel}>
              {chartData.labels[Math.floor(chartData.labels.length / 2)]}
            </Text>
          )}
          <Text style={styles.axisLabel}>{chartData.labels[chartData.labels.length - 1]}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  avgBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${theme.colors.primary}12`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}25`,
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
  avgLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxisLabels: {
    width: 38,
    justifyContent: 'space-between',
    paddingVertical: PADDING_TOP - 6,
  },
  axisLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
    fontWeight: '500' as const,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    marginLeft: 8,
    overflow: 'hidden',
  },
  gridLines: {
    position: 'absolute',
    top: PADDING_TOP,
    left: 0,
    right: 0,
    bottom: PADDING_BOTTOM,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridLineMiddle: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: theme.colors.primary,
    transformOrigin: 'left center',
    borderRadius: 1,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#121212',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataPointInner: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.primary,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingLeft: 46,
  },
});
