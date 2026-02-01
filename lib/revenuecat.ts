import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface RevenueCatCustomerInfo {
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  entitlements: {
    active: Record<string, {
      identifier: string;
      productIdentifier: string;
      isActive: boolean;
    }>;
  };
}

export interface RevenueCatProduct {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

export interface RevenueCatPackage {
  identifier: string;
  product: RevenueCatProduct;
}

export interface RevenueCatOfferings {
  current: {
    identifier: string;
    availablePackages: RevenueCatPackage[];
  } | null;
  all: Record<string, unknown>;
}

type PurchasesModule = {
  configure: (config: { apiKey: string }) => Promise<void>;
  setLogLevel: (level: unknown) => Promise<void>;
  LOG_LEVEL: { DEBUG: unknown; VERBOSE: unknown };
  getOfferings: () => Promise<RevenueCatOfferings>;
  getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
  purchasePackage: (pkg: RevenueCatPackage) => Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
};

const HARDCODED_IOS_KEY = 'appl_bmkkzdEXxXZssjjCwTmHdUpuRHC';
const TEST_STORE_KEY = 'rcb_nEoCBBLpFGWnfNlHgmMcVhiVTPw';
const EXPO_TEST_KEY = 'test_KFhPFPhDhlpsOUNUJCbnuUKFPGa';

const API_KEYS = {
  ios: HARDCODED_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  testStore: TEST_STORE_KEY,
  expoTest: EXPO_TEST_KEY,
};

/**
 * =====================================================
 * EXPO GO DETECTION & MOCK MODE
 * =====================================================
 * 
 * IMPORTANT: Expo Go does NOT support native StoreKit/Play Store functionality.
 * RevenueCat requires native modules that are only available in:
 * - Development builds (expo dev client)
 * - Production/standalone builds
 * 
 * When running in Expo Go:
 * - Native store APIs are unavailable
 * - RevenueCat configuration will fail with "Invalid API key" errors
 * - We must use mock mode to prevent crashes and misleading errors
 * 
 * Reference: https://docs.expo.dev/workflow/overview/#expo-go
 */

// Flag to track if we're in mock mode (set during initialization)
let isMockMode = false;

// Проверка Expo Go - только для мобильных платформ
const getIsExpoGo = (): boolean => {
  if (Platform.OS === 'web') return false;
  // appOwnership === 'expo' означает Expo Go
  // appOwnership === 'standalone' или undefined означает production build
  // appOwnership === null означает development build (expo dev client)
  const ownership = Constants?.appOwnership;
  console.log('[RevenueCat] Constants.appOwnership:', ownership);
  return ownership === 'expo';
};

// Export getter for mock mode status
export const getIsMockMode = (): boolean => isMockMode;

const detectRorkSandbox = (): boolean => {
  // Только для web проверяем hostname
  if (Platform.OS !== 'web') {
    return false; // На нативных платформах не может быть Rork Sandbox
  }
  if (typeof window !== 'undefined' && (window as any).__RORK_SANDBOX__) {
    return true;
  }
  if (typeof window !== 'undefined' && window.location?.hostname?.includes('e2b.app')) {
    return true;
  }
  if (typeof window !== 'undefined' && window.location?.hostname?.includes('rork')) {
    return true;
  }
  return false;
};

// Вычисляем при каждом использовании для точности
const getEnvironmentInfo = () => {
  const isExpoGo = getIsExpoGo();
  const isRorkSandbox = detectRorkSandbox();
  const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  const isRealDevice = isNativePlatform && !isExpoGo;
  const shouldUseMock = Platform.OS === 'web' || isRorkSandbox || isExpoGo;

  return {
    isExpoGo,
    isRorkSandbox,
    isNativePlatform,
    isRealDevice,
    shouldUseMock,
  };
};

// Для обратной совместимости
const isExpoGoRuntime = getIsExpoGo();
const isRorkSandbox = detectRorkSandbox();
const canUseNativeRevenueCat = Platform.OS !== 'web' && !isExpoGoRuntime && !isRorkSandbox;
const isRealDevice = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGoRuntime && !isRorkSandbox;

/**
 * ВАЖНО: Mock mode обязателен в следующих случаях:
 * - Web платформа (нет нативных сторов)
 * - Rork Sandbox (нет доступа к сторам)
 * - Expo Go (StoreKit/Play Store недоступны, RevenueCat не работает)
 * 
 * На реальных устройствах в dev/production билдах используется настоящий RevenueCat.
 */
const shouldUseMockMode = Platform.OS === 'web' || isRorkSandbox || isExpoGoRuntime;

let hasLoggedStatus = false;
const logStatus = (message: string) => {
  if (hasLoggedStatus) return;
  hasLoggedStatus = true;
  console.log(`[RevenueCat] ${message}`);
};

let moduleRef: PurchasesModule | null = null;
let isConfigured = false;

const getApiKey = (): string => {
  if (isRorkSandbox) {
    console.log('[RevenueCat] Rork Sandbox detected - using Test Store API Key');
    return API_KEYS.testStore;
  }
  if (Platform.OS === 'ios') return API_KEYS.ios;
  if (Platform.OS === 'android') return API_KEYS.android;
  return '';
};

const loadPurchasesModule = (): PurchasesModule | null => {
  if (moduleRef) return moduleRef;

  /**
   * EXPO GO & MOCK MODE HANDLING
   * - In Expo Go, StoreKit/Play Store are unavailable
   * - RevenueCat cannot initialize without native store access
   * - Return null early to use mock mode instead
   */
  if (shouldUseMockMode) {
    if (isRorkSandbox) {
      logStatus('Rork Sandbox detected - using mock mode');
    } else if (Platform.OS === 'web') {
      logStatus('Web platform - using mock mode');
    } else if (isExpoGoRuntime) {
      logStatus('Expo Go detected - RevenueCat unavailable, using mock mode');
    }
    isMockMode = true;
    return null;
  }

  // Real device (dev build or production) - load native module
  if (isRealDevice) {
    console.log('[RevenueCat] Real device (dev/production build) - loading native RevenueCat');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RNPurchases = require('react-native-purchases');
      moduleRef = RNPurchases.default ?? RNPurchases;
      console.log('[RevenueCat] ✅ Module loaded successfully for real device');
      isMockMode = false;
      return moduleRef;
    } catch (error: any) {
      console.error('[RevenueCat] ❌ Module failed to load on real device');
      console.error('[RevenueCat] Error details:', error?.message || error);
      console.error('[RevenueCat] Make sure react-native-purchases is properly installed');
      throw new Error('RevenueCat module required for real devices but failed to load');
    }
  }

  // Fallback: try to load module
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RNPurchases = require('react-native-purchases');
    moduleRef = RNPurchases.default ?? RNPurchases;
    console.log('[RevenueCat] Module loaded successfully');
    isMockMode = false;
    return moduleRef;
  } catch (error: any) {
    console.log('[RevenueCat] Module not available - enabling mock mode');
    console.log('[RevenueCat] Error:', error?.message || error);
    isMockMode = true;
    return null;
  }
};

export const initializeRevenueCat = async (): Promise<boolean> => {
  if (isConfigured && moduleRef) {
    console.log('[RevenueCat] Already configured and module loaded');
    return true;
  }

  const currentSandboxCheck = detectRorkSandbox();
  const currentIsExpoGo = getIsExpoGo();
  const currentShouldMock = Platform.OS === 'web' || currentSandboxCheck || currentIsExpoGo;

  console.log('========== REVENUECAT INITIALIZATION ==========');
  console.log('[RevenueCat] Platform:', Platform.OS);
  console.log('[RevenueCat] Constants.appOwnership:', Constants?.appOwnership);
  console.log('[RevenueCat] isExpoGo:', currentIsExpoGo);
  console.log('[RevenueCat] isRorkSandbox:', currentSandboxCheck);
  console.log('[RevenueCat] shouldUseMock:', currentShouldMock);
  console.log('[RevenueCat] canUseNativeRevenueCat:', canUseNativeRevenueCat);
  console.log('[RevenueCat] isRealDevice:', isRealDevice);

  /**
   * EARLY EXIT FOR EXPO GO / WEB / SANDBOX
   * 
   * In these environments, RevenueCat cannot function:
   * - Expo Go: No StoreKit/Play Store access (requires dev build)
   * - Web: No native store APIs
   * - Rork Sandbox: Sandboxed environment without store access
   */
  if (currentShouldMock) {
    isMockMode = true;
    if (currentIsExpoGo) {
      console.log('[RevenueCat] ℹ️ RevenueCat unavailable in Expo Go – using mock data');
      console.log('[RevenueCat] ℹ️ To use real purchases, create a development build');
    } else {
      console.log('[RevenueCat] ℹ️ Sandbox/Web detected - using mock mode');
    }
    return false;
  }

  try {
    const module = loadPurchasesModule();
    if (!module) {
      console.log('[RevenueCat] Module not loaded - using mock mode');
      return false;
    }

    console.log('[RevenueCat] Module loaded successfully');
    console.log('[RevenueCat] Module type:', typeof module);
    console.log('[RevenueCat] Module.configure exists:', typeof module.configure === 'function');
    console.log('[RevenueCat] Module.purchasePackage exists:', typeof module.purchasePackage === 'function');

    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('[RevenueCat] ❌ No API key for platform:', Platform.OS);
      return false;
    }

    console.log('[RevenueCat] API key found, length:', apiKey.length);
    console.log('[RevenueCat] API key prefix:', apiKey.substring(0, 10) + '...');
    console.log('[RevenueCat] Configuring with API key...');

    // Включаем verbose логирование для отладки
    if (module.LOG_LEVEL) {
      try {
        await module.setLogLevel(module.LOG_LEVEL.VERBOSE);
        console.log('[RevenueCat] Verbose logging enabled');
      } catch (logError: any) {
        console.warn('[RevenueCat] Failed to enable verbose logging:', logError?.message);
      }
    }

    await module.configure({ apiKey });
    isConfigured = true;
    console.log('[RevenueCat] ✅ Configuration successful');
    console.log('[RevenueCat] ✅ isConfigured is now:', isConfigured);
    return true;
  } catch (error: any) {
    console.error('[RevenueCat] ❌ Initialization/Configuration failed');
    console.error('[RevenueCat] Error message:', error?.message);
    console.error('[RevenueCat] Error code:', error?.code);

    if (error?.message?.includes('sandbox') || error?.message?.includes('Rork')) {
      console.log('[RevenueCat] ℹ️ Sandbox environment detected from error - using mock mode');
      return false;
    }

    // Если это ошибка "already configured", считаем это успехом
    if (error?.message?.includes('already configured') || error?.message?.includes('has been configured')) {
      console.log('[RevenueCat] ℹ️ Already configured (from error) - treating as success');
      isConfigured = true;
      return true;
    }

    console.error('[RevenueCat] Full error:', JSON.stringify(error, null, 2));
    return false;
  }
};

export const isRevenueCatAvailable = (): boolean => {
  // Для реальных устройств ВСЕГДА возвращаем true после загрузки модуля
  if (isRealDevice) {
    return !!loadPurchasesModule();
  }
  return canUseNativeRevenueCat && !!loadPurchasesModule();
};

export const getOfferings = async (): Promise<RevenueCatOfferings | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.error('[RevenueCat] ❌ getOfferings - module not ready');
    return null;
  }

  try {
    console.log('[RevenueCat] 📦 Fetching offerings...');
    const offerings = await module.getOfferings();

    if (!offerings?.current) {
      console.warn('[RevenueCat] ⚠️ No current offering available');
      console.warn('[RevenueCat] Check RevenueCat Dashboard → Offerings');
      return null;
    }

    console.log('[RevenueCat] ✅ Offerings fetched');
    console.log('[RevenueCat] Current offering:', offerings.current.identifier);
    console.log('[RevenueCat] Available packages:', offerings.current.availablePackages?.length ?? 0);

    offerings.current.availablePackages?.forEach((pkg: RevenueCatPackage, index: number) => {
      console.log(`[RevenueCat] Package ${index + 1}:`, pkg.product.identifier, '-', pkg.product.priceString);
    });

    return offerings;
  } catch (error) {
    console.error('[RevenueCat] ❌ getOfferings failed:', error);
    return null;
  }
};

export const getCustomerInfo = async (): Promise<RevenueCatCustomerInfo | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] getCustomerInfo - module not ready');
    return null;
  }

  try {
    const info = await module.getCustomerInfo();
    console.log('[RevenueCat] Customer info fetched, active subs:', info?.activeSubscriptions?.length ?? 0);
    return info;
  } catch (error) {
    console.error('[RevenueCat] getCustomerInfo failed:', error);
    return null;
  }
};

export const purchasePackage = async (
  pkg: RevenueCatPackage | any
): Promise<{ customerInfo: RevenueCatCustomerInfo } | null> => {
  const env = getEnvironmentInfo();

  console.log('========== PURCHASE PACKAGE START ==========');
  console.log('[RevenueCat] 🛒 purchasePackage called');
  console.log('[RevenueCat] Platform.OS:', Platform.OS);
  console.log('[RevenueCat] Environment:', JSON.stringify(env, null, 2));
  console.log('[RevenueCat] isConfigured:', isConfigured);
  console.log('[RevenueCat] moduleRef exists:', !!moduleRef);
  console.log('[RevenueCat] Constants.appOwnership:', Constants?.appOwnership);

  // КРИТИЧНО: Если это реальное устройство, НЕ используем mock
  if (env.isRealDevice) {
    console.log('[RevenueCat] ✅ REAL DEVICE DETECTED - will use native RevenueCat');
  } else {
    console.log('[RevenueCat] ⚠️ NOT a real device build');
    console.log('[RevenueCat] isExpoGo:', env.isExpoGo);
    console.log('[RevenueCat] isRorkSandbox:', env.isRorkSandbox);
  }

  // Попробуем переинициализировать если не сконфигурировано
  if (!isConfigured) {
    console.log('[RevenueCat] ⚠️ Not configured, attempting to initialize...');
    const initialized = await initializeRevenueCat();
    if (!initialized) {
      console.error('[RevenueCat] ❌ Failed to initialize before purchase');
      if (env.isRealDevice) {
        throw new Error('RevenueCat must be initialized on real devices');
      }
      return null;
    }
  }

  const module = loadPurchasesModule();
  if (!module) {
    console.error('[RevenueCat] ❌ purchasePackage - module not loaded');
    if (env.isRealDevice) {
      throw new Error('RevenueCat module must be loaded on real devices');
    }
    return null;
  }

  try {
    console.log('[RevenueCat] 🛒 Initiating NATIVE purchase...');
    console.log('[RevenueCat] Package identifier:', pkg?.identifier);
    console.log('[RevenueCat] Product identifier:', pkg?.product?.identifier);
    console.log('[RevenueCat] Product price:', pkg?.product?.priceString);
    console.log('[RevenueCat] Package constructor:', pkg?.constructor?.name);
    console.log('[RevenueCat] Package keys:', Object.keys(pkg || {}));
    console.log('[RevenueCat] Module.purchasePackage type:', typeof module.purchasePackage);

    // ВАЖНО: Это должно вызвать нативный диалог Apple!
    console.log('[RevenueCat] 📱 Calling module.purchasePackage() - Apple sheet should appear NOW...');
    const result = await module.purchasePackage(pkg);

    console.log('[RevenueCat] ✅ Purchase completed!');
    console.log('[RevenueCat] Active subscriptions:', result.customerInfo.activeSubscriptions?.length ?? 0);
    console.log('[RevenueCat] Active entitlements:', Object.keys(result.customerInfo.entitlements?.active ?? {}).join(', '));
    console.log('========== PURCHASE PACKAGE END ==========');

    return result;
  } catch (error: any) {
    console.log('========== PURCHASE ERROR ==========');

    if (error?.userCancelled || error?.code === 1 || error?.code === 'PURCHASE_CANCELLED') {
      console.log('[RevenueCat] ℹ️ Purchase cancelled by user');
      throw { userCancelled: true };
    }

    console.error('[RevenueCat] ❌ Purchase failed');
    console.error('[RevenueCat] Error code:', error?.code);
    console.error('[RevenueCat] Error message:', error?.message);
    console.error('[RevenueCat] Error domain:', error?.domain);
    console.error('[RevenueCat] Error underlyingErrorMessage:', error?.underlyingErrorMessage);
    console.error('[RevenueCat] Error readableErrorCode:', error?.readableErrorCode);
    console.error('[RevenueCat] Full error:', JSON.stringify(error, null, 2));

    throw error;
  }
};

export const restorePurchases = async (): Promise<RevenueCatCustomerInfo | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] restorePurchases - module not ready');
    return null;
  }

  try {
    console.log('[RevenueCat] Restoring purchases...');
    const info = await module.restorePurchases();
    console.log('[RevenueCat] Restore successful, active subs:', info?.activeSubscriptions?.length ?? 0);
    return info;
  } catch (error) {
    console.error('[RevenueCat] Restore failed:', error);
    throw error;
  }
};

// Хранилище для оригинальных пакетов RevenueCat
let cachedOriginalPackages: any[] = [];

export const getOriginalPackages = (): any[] => cachedOriginalPackages;

/**
 * Get RevenueCat offerings with caching of original package objects.
 * 
 * IMPORTANT: This function should only be called after initializeRevenueCat() 
 * returns true. In Expo Go / mock mode, it will return null without errors.
 * 
 * The subscription provider should handle null returns by using mock packages.
 */
export const getOfferingsWithCache = async (): Promise<RevenueCatOfferings | null> => {
  // In mock mode, return null gracefully without error logging
  // The calling code should use mock packages instead
  if (isMockMode) {
    console.log('[RevenueCat] ℹ️ getOfferingsWithCache skipped - mock mode active');
    return null;
  }

  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    // Only log info level in this case - not an error if RevenueCat isn't configured
    console.log('[RevenueCat] getOfferingsWithCache - RevenueCat not configured, returning null');
    return null;
  }

  try {
    console.log('[RevenueCat] 📦 Fetching offerings with cache...');
    const offerings = await module.getOfferings();

    console.log('[RevenueCat] 📦 Raw offerings response:', JSON.stringify(offerings, null, 2));
    console.log('[RevenueCat] 📦 Has current offering:', !!offerings?.current);
    console.log('[RevenueCat] 📦 Current offering identifier:', offerings?.current?.identifier);
    console.log('[RevenueCat] 📦 All offerings:', Object.keys(offerings?.all || {}));

    if (offerings?.current?.availablePackages) {
      // Сохраняем оригинальные пакеты для покупки
      cachedOriginalPackages = offerings.current.availablePackages;
      console.log('[RevenueCat] ✅ Cached', cachedOriginalPackages.length, 'original packages');

      // Детальная информация о каждом пакете
      cachedOriginalPackages.forEach((pkg: any, idx: number) => {
        console.log(`[RevenueCat] Package ${idx + 1}:`);
        console.log(`  - identifier: ${pkg.identifier}`);
        console.log(`  - product.identifier: ${pkg.product?.identifier}`);
        console.log(`  - product.title: ${pkg.product?.title}`);
        console.log(`  - product.priceString: ${pkg.product?.priceString}`);
        console.log(`  - product.price: ${pkg.product?.price}`);
      });
    } else {
      console.warn('[RevenueCat] ⚠️ NO availablePackages in current offering!');
    }

    return offerings;
  } catch (error: any) {
    console.error('[RevenueCat] ❌ getOfferingsWithCache failed');
    console.error('[RevenueCat] Error message:', error?.message);
    console.error('[RevenueCat] Error code:', error?.code);
    console.error('[RevenueCat] Error stack:', error?.stack);
    console.error('[RevenueCat] Full error:', JSON.stringify(error, null, 2));
    return null;
  }
};

// Legacy exports for compatibility
export const initializeSubscriptionFlow = initializeRevenueCat;
export const fetchOfferings = getOfferings;
export const fetchCustomerInfo = getCustomerInfo;
export const purchasePackageByIdentifier = async (
  identifier: string
): Promise<{ info: RevenueCatCustomerInfo; purchasedPackage: RevenueCatPackage } | null> => {
  console.log('[RevenueCat] 🛒 purchasePackageByIdentifier called with:', identifier);
  console.log('[RevenueCat] 🛒 Cached packages count:', cachedOriginalPackages.length);

  // ВСЕГДА загружаем свежие offerings для получения актуальных нативных объектов
  console.log('[RevenueCat] 🔄 Fetching fresh offerings to get native package objects...');
  const offerings = await getOfferingsWithCache();

  if (!offerings?.current?.availablePackages?.length) {
    console.error('[RevenueCat] ❌ No offerings/packages available');
    console.error('[RevenueCat] offerings:', !!offerings);
    console.error('[RevenueCat] current:', !!offerings?.current);
    console.error('[RevenueCat] availablePackages:', offerings?.current?.availablePackages?.length);
    return null;
  }

  // Ищем пакет в свежезагруженных offerings
  const pkg = cachedOriginalPackages.find(
    (p: any) => p.identifier === identifier || p.product?.identifier === identifier
  );

  if (!pkg) {
    console.error('[RevenueCat] ❌ Package not found:', identifier);
    console.error('[RevenueCat] Available packages:');
    cachedOriginalPackages.forEach((p: any, idx: number) => {
      console.error(`  ${idx + 1}. identifier: "${p.identifier}", product.identifier: "${p.product?.identifier}"`);
    });
    return null;
  }

  console.log('[RevenueCat] ✅ Found package:', pkg.identifier);
  console.log('[RevenueCat] Package is native object:', pkg?.constructor?.name || typeof pkg);
  console.log('[RevenueCat] Package product:', pkg.product?.identifier, '-', pkg.product?.priceString);

  // Передаем ОРИГИНАЛЬНЫЙ нативный объект пакета из RevenueCat SDK
  const result = await purchasePackage(pkg);
  if (!result) {
    console.error('[RevenueCat] ❌ purchasePackage returned null');
    return null;
  }

  console.log('[RevenueCat] ✅ Purchase completed successfully');

  return {
    info: result.customerInfo,
    purchasedPackage: {
      identifier: pkg.identifier,
      product: {
        identifier: pkg.product?.identifier,
        title: pkg.product?.title,
        description: pkg.product?.description,
        price: pkg.product?.price,
        priceString: pkg.product?.priceString,
        currencyCode: pkg.product?.currencyCode,
      }
    }
  };
};
export const restorePurchasesFromRevenueCat = restorePurchases;

export const syncWithRevenueCat = async (): Promise<RevenueCatCustomerInfo | null> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] syncWithRevenueCat - module not ready');
    return null;
  }

  try {
    console.log('[RevenueCat] Force syncing customer info from server...');
    const info = await module.getCustomerInfo();
    console.log('[RevenueCat] Sync complete, active entitlements:', Object.keys(info?.entitlements?.active ?? {}));
    return info;
  } catch (error) {
    console.error('[RevenueCat] Sync failed:', error);
    return null;
  }
};

export const invalidateCustomerInfoCache = async (): Promise<void> => {
  const module = loadPurchasesModule();
  if (!module || !isConfigured) {
    console.log('[RevenueCat] invalidateCustomerInfoCache - module not ready');
    return;
  }

  try {
    if (typeof (module as any).invalidateCustomerInfoCache === 'function') {
      await (module as any).invalidateCustomerInfoCache();
      console.log('[RevenueCat] Customer info cache invalidated');
    } else {
      console.log('[RevenueCat] invalidateCustomerInfoCache not available, fetching fresh info');
      await module.getCustomerInfo();
    }
  } catch (error) {
    console.error('[RevenueCat] Cache invalidation failed:', error);
  }
};
