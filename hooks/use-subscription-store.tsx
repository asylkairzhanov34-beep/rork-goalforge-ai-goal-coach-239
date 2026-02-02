import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import createContextHook from '@nkzw/create-context-hook';

// Импортируем из нашей исправленной библиотеки
import {
  initializeRevenueCat,
  getCustomerInfo,
  purchasePackageByIdentifier,
  restorePurchases as restorePurchasesRC,
  getOfferingsWithCache,
  RevenueCatCustomerInfo,
  RevenueCatPackage,
} from '@/lib/revenuecat';

import { SubscriptionPackage, SubscriptionStatus, CustomerInfo } from '@/types/subscription';
import { saveUserSubscription, getUserSubscription } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth-store';

// --- КОНСТАНТЫ ---
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_OFFER_KEYS = {
  seenOffer: 'hasSeenSubscriptionOffer',
  trialStartISO: 'trialStartISO',
};
const SECURE_KEYS = {
  trialStartAt: 'trialStartAt',
  hasSeenPaywall: 'hasSeenPaywall',
  subscriptionActive: 'subscriptionActive',
};

// Заглушки для веба (чтобы не падал интерфейс)
const WEB_MOCK_PACKAGES: SubscriptionPackage[] = [
  {
    identifier: '$rc_monthly',
    product: {
      identifier: 'premium_monthly',
      title: 'Monthly Subscription',
      description: 'Premium access for 1 month',
      price: 9.99,
      priceString: '$9.99',
      currencyCode: 'USD',
    },
  },
  {
    identifier: '$rc_annual',
    product: {
      identifier: 'premium_yearly',
      title: 'Annual Subscription',
      description: 'Premium access for 1 year',
      price: 79.99,
      priceString: '$79.99',
      currencyCode: 'USD',
    },
  },
];

// Хелперы
const canUseSecureStore = Platform.OS !== 'web';
const secureSet = async (key: string, value: string) => {
  if (canUseSecureStore) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
};
const secureGet = async (key: string) => {
  if (canUseSecureStore) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
};
const secureDelete = async (key: string) => {
  if (canUseSecureStore) return SecureStore.deleteItemAsync(key);
  return AsyncStorage.removeItem(key);
};

// Логика триала
const buildTrialState = (start: string | null) => {
  if (!start) return { startedAt: null, expiresAt: null, isActive: false, isExpired: false };
  const startedMs = Date.parse(start);
  if (Number.isNaN(startedMs)) return { startedAt: null, expiresAt: null, isActive: false, isExpired: false };
  const expiresMs = startedMs + TRIAL_DURATION_MS;
  const now = Date.now();
  return {
    startedAt: new Date(startedMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
    isActive: now < expiresMs,
    isExpired: now >= expiresMs,
  };
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const auth = useAuth();
  const user = auth?.user;
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const [trialState, setTrialState] = useState(buildTrialState(null));
  const trialStateRef = useRef(trialState);

  // 1. Инициализация при старте
  useEffect(() => {
    const init = async () => {
      console.log('[SubscriptionProvider] 🚀 Запуск инициализации...');
      
      // Сначала проверим локальные данные (триал)
      const trialStart = await secureGet(SECURE_KEYS.trialStartAt);
      const currentTrial = buildTrialState(trialStart);
      setTrialState(currentTrial);
      trialStateRef.current = currentTrial;

      if (Platform.OS === 'web') {
        setPackages(WEB_MOCK_PACKAGES);
        setStatus('free');
        setIsInitialized(true);
        return;
      }

      // Инициализируем RevenueCat
      const rcSuccess = await initializeRevenueCat();
      
      if (rcSuccess) {
        console.log('[SubscriptionProvider] ✅ RevenueCat готов. Загружаем данные...');
        
        // 1. Инфо о юзере
        const info = await getCustomerInfo();
        updateStatusFromInfo(info);

        // 2. Тарифы
        const offerings = await getOfferingsWithCache();
        if (offerings?.current?.availablePackages.length) {
          const formatted = offerings.current.availablePackages.map((pkg: RevenueCatPackage) => ({
            identifier: pkg.identifier,
            product: {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
            },
          }));
          setPackages(formatted);
          console.log(`[SubscriptionProvider] 📦 Загружено пакетов: ${formatted.length}`);
        } else {
          console.warn('[SubscriptionProvider] ⚠️ Пакеты не найдены в RevenueCat');
        }
      } else {
        console.error('[SubscriptionProvider] ❌ Ошибка инициализации RevenueCat');
        // Если ошибка - не блокируем приложение, даем фри доступ
        setStatus('free');
      }
      
      setIsInitialized(true);
    };

    init();
  }, []);

  // Обновление статуса на основе данных от RevenueCat
  const updateStatusFromInfo = async (info: RevenueCatCustomerInfo | null) => {
    if (!info) return;

    // Преобразуем в наш формат CustomerInfo
    const mappedInfo: CustomerInfo = {
      activeSubscriptions: info.activeSubscriptions,
      allPurchasedProductIdentifiers: info.allPurchasedProductIdentifiers,
      entitlements: {
        active: Object.entries(info.entitlements.active).reduce((acc, [key, val]) => {
          acc[key] = { identifier: val.identifier, isActive: val.isActive, productIdentifier: val.productIdentifier };
          return acc;
        }, {} as any)
      }
    };
    setCustomerInfo(mappedInfo);

    const hasPremium = info.entitlements.active['premium'] !== undefined; // Проверяем entitlement 'premium'
    
    if (hasPremium) {
      console.log('[SubscriptionProvider] 💎 Статус: PREMIUM');
      setStatus('premium');
      await secureSet(SECURE_KEYS.subscriptionActive, 'true');
    } else {
      console.log('[SubscriptionProvider] 👤 Статус: FREE (или Trial)');
      await secureDelete(SECURE_KEYS.subscriptionActive);
      setStatus(trialStateRef.current.isActive ? 'trial' : 'free');
    }
  };

  // Покупка
  const purchasePackage = async (identifier: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('Web Payment', 'Not supported in demo');
      return null;
    }

    setIsPurchasing(true);
    try {
      console.log(`[SubscriptionProvider] 🛒 Начинаем покупку: ${identifier}`);
      
      // Вызываем исправленную функцию из revenuecat.ts
      const result = await purchasePackageByIdentifier(identifier);
      
      if (result) {
        console.log('[SubscriptionProvider] ✅ Покупка прошла успешно!');
        await updateStatusFromInfo(result.info);
        return true;
      } else {
        console.log('[SubscriptionProvider] ❌ Покупка вернула null (отмена или ошибка)');
        return false;
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Ошибка покупки', e.message);
      }
      return false;
    } finally {
      setIsPurchasing(false);
    }
  };

  // Восстановление
  const restorePurchases = async () => {
    setIsPurchasing(true); // Используем тот же лоадер
    try {
      const info = await restorePurchasesRC();
      await updateStatusFromInfo(info);
      const hasPremium = info?.entitlements.active['premium'];
      return !!hasPremium;
    } catch (e) {
      return false;
    } finally {
      setIsPurchasing(false);
    }
  };

  // Триал
  const startTrial = async () => {
    const now = new Date().toISOString();
    await secureSet(SECURE_KEYS.trialStartAt, now);
    const newState = buildTrialState(now);
    setTrialState(newState);
    trialStateRef.current = newState;
    setStatus('trial');
    return newState;
  };

  // Геттеры доступа
  const canAccessPremiumFeatures = useCallback(() => {
    return status === 'premium' || trialState.isActive;
  }, [status, trialState.isActive]);

  const getFeatureAccess = useCallback(() => {
    const hasAccess = canAccessPremiumFeatures();
    return {
      dailyAICoach: hasAccess,
      weeklyAIReport: hasAccess,
      unlimitedSmartTasks: hasAccess,
      aiChatAssistant: true, // Всегда доступен
      // ... добавьте остальные флаги по необходимости
    };
  }, [canAccessPremiumFeatures]);

  return {
    isInitialized,
    status,
    packages,
    customerInfo,
    isPurchasing,
    purchasePackage,
    restorePurchases,
    trialState,
    startTrial,
    canAccessPremiumFeatures,
    getFeatureAccess,
    isPremium: status === 'premium',
  };
});