import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  Trash2, 
  Clock, 
  RefreshCw, 
  User, 
  CreditCard,
  Server,
  Shield,
} from 'lucide-react-native';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useAuth } from '@/hooks/use-auth-store';

const STORAGE_KEYS = [
  'hasSeenPaywall',
  'trialStartedAt',
  'trialStartISO',
  'hasSeenSubscriptionOffer',
  '@subscription_status',
  '@first_launch',
];

export default function DevSubscriptionTools() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [storageValues, setStorageValues] = useState<Record<string, string | null>>({});
  const { 
    status, 
    restorePurchases,
    refreshStatus,
    customerInfo,
    isPremium,
    packages,
  } = useSubscription();
  const { user, logout } = useAuth();

  const loadStorageValues = useCallback(async () => {
    const values: Record<string, string | null> = {};
    
    for (const key of STORAGE_KEYS) {
      try {
        values[key] = await AsyncStorage.getItem(key);
      } catch {
        values[key] = null;
      }
    }
    
    setStorageValues(values);
  }, []);

  useEffect(() => {
    loadStorageValues();
  }, [loadStorageValues]);

  const forceServerSync = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await refreshStatus();
      await loadStorageValues();
      Alert.alert('✅ Success', `Server sync completed.\nStatus: ${status}`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshStatus, loadStorageValues, status]);

  const performRestorePurchases = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await restorePurchases();
      await loadStorageValues();
      if (result) {
        Alert.alert('✅ Success', 'Purchases restored! Premium is active.');
      } else {
        Alert.alert('ℹ️ Info', 'No active purchases found.');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, restorePurchases, loadStorageValues]);

  const clearAllData = useCallback(async () => {
    Alert.alert(
      '⚠️ Warning',
      'This will delete ALL app data including authentication. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await AsyncStorage.clear();
              await logout();
              Alert.alert('✅ Success', 'All data has been deleted.');
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [logout, router]);

  const activeEntitlements = customerInfo?.entitlements?.active 
    ? Object.keys(customerInfo.entitlements.active) 
    : [];

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Subscription Tools',
          headerStyle: { backgroundColor: '#0f0f23' },
          headerTintColor: '#4ECDC4',
        }} 
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>🛠 Subscription Testing</Text>
            <Text style={styles.subtitle}>Available in TestFlight and Dev</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Current Status</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <User size={16} color="#888" />
                <Text style={styles.statusLabel}>User:</Text>
                <Text style={styles.statusValue} numberOfLines={1}>
                  {user?.email || 'Not authenticated'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Shield size={16} color="#888" />
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, status === 'premium' && styles.premiumText]}>
                  {status === 'premium' ? 'Premium' : 'Free'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <CreditCard size={16} color="#888" />
                <Text style={styles.statusLabel}>Premium:</Text>
                <Text style={[styles.statusValue, isPremium && styles.premiumText]}>
                  {isPremium ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Clock size={16} color="#888" />
                <Text style={styles.statusLabel}>Packages:</Text>
                <Text style={styles.statusValue}>
                  {packages.length} loaded
                </Text>
              </View>
            </View>
            
            {activeEntitlements.length > 0 && (
              <View style={styles.entitlementsBox}>
                <Text style={styles.entitlementsTitle}>Active Entitlements:</Text>
                {activeEntitlements.map(e => (
                  <Text key={e} style={styles.entitlementItem}>• {e}</Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={forceServerSync}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#0f0f23" size="small" />
              ) : (
                <>
                  <Server size={20} color="#0f0f23" />
                  <Text style={styles.primaryButtonText}>Sync with Server</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={performRestorePurchases}
              disabled={isProcessing}
            >
              <RefreshCw size={20} color="#4ECDC4" />
              <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={clearAllData}
              disabled={isProcessing}
            >
              <Trash2 size={20} color="#FF6B6B" />
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.storageSection}>
            <Text style={styles.sectionTitle}>Storage Values</Text>
            {Object.entries(storageValues).map(([key, value]) => (
              <View key={key} style={styles.storageItem}>
                <Text style={styles.storageKey}>{key}</Text>
                <Text style={styles.storageValue} numberOfLines={1}>
                  {value || '(empty)'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Debug Info</Text>
            <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
            <Text style={styles.infoText}>__DEV__: {__DEV__ ? 'true' : 'false'}</Text>
            <Text style={styles.infoText}>Packages loaded: {packages.length}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.2)',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#4ECDC4',
    marginBottom: 12,
  },
  statusGrid: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  statusValue: {
    fontSize: 13,
    color: '#fff',
    flex: 1,
  },
  premiumText: {
    color: '#4ECDC4',
    fontWeight: '600' as const,
  },
  entitlementsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  entitlementsTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  entitlementItem: {
    fontSize: 12,
    color: '#4ECDC4',
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#4ECDC4',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f0f23',
  },
  secondaryButton: {
    backgroundColor: 'rgba(78,205,196,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.3)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#4ECDC4',
  },
  dangerButton: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  storageSection: {
    marginBottom: 24,
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  storageKey: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
  },
  storageValue: {
    fontSize: 12,
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
