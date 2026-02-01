import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { BREATHING_TECHNIQUES } from '@/constants/breathing';

export default function BreathingScreen() {
  const handleTechniquePress = (techniqueId: string) => {
    router.push({ pathname: '/breathing/[id]', params: { id: techniqueId } });
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Breathing Techniques',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: theme.fontWeight.semibold as any,
          },
        }} 
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {BREATHING_TECHNIQUES.map((technique) => (
          <TouchableOpacity
            key={technique.id}
            style={[styles.techniqueCard, { borderLeftColor: technique.color }]}
            onPress={() => handleTechniquePress(technique.id)}
          >
            <View style={styles.techniqueHeader}>
              <View style={[styles.iconContainer, { backgroundColor: technique.color + '20' }]}>
                <Text style={styles.icon}>{technique.icon}</Text>
              </View>
              <View style={styles.techniqueInfo}>
                <Text style={styles.techniqueName}>{technique.name}</Text>
                <Text style={styles.techniqueDescription}>{technique.description}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </View>
            
            <Text style={styles.techniqueBenefits}>{technique.benefits}</Text>
            
            <View style={styles.techniqueStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{technique.totalCycles}</Text>
                <Text style={styles.statLabel}>cycles</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{technique.phases.length}</Text>
                <Text style={styles.statLabel}>phases</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {Math.round(technique.phases.reduce((sum, phase) => sum + phase.duration, 0) * technique.totalCycles / 60)}
                </Text>
                <Text style={styles.statLabel}>min</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  techniqueCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderLeftWidth: 4,
    ...theme.shadows.medium,
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },
  techniqueDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  techniqueBenefits: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  techniqueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});