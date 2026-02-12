import { Platform } from 'react-native';

export type RevenueCatCustomerInfo = {
  originalAppUserId: string;
  latestExpirationDate: string | null;
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, any>;
    all: Record<string, any>;
  };
};

export type RevenueCatPackage = {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
};

export type RevenueCatOfferings = {
  current: {
    identifier: string;
    availablePackages: RevenueCatPackage[];
  } | null;
  all: Record<string, any>;
};

let Purchases: any = null;
let LOG_LEVEL: any = null;
let isExpoGo = false;

if (Platform.OS !== 'web') {
  try {
    const Constants = require('expo-constants').default;
    isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
    console.log('[RevenueCat] Running in Expo Go:', isExpoGo);
  } catch (e) {
    console.log('[RevenueCat] Could not detect Expo Go status');
  }
  
  try {
    const mod = require('react-native-purchases');
    Purchases = mod.default || mod;
    LOG_LEVEL = mod.LOG_LEVEL;
    console.log('[RevenueCat] Native module loaded');
  } catch (e) {
    console.warn('[RevenueCat] Failed to load native module:', e);
  }
}

const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

let isConfigured = false;
let cachedOfferings: RevenueCatOfferings | null = null;
let currentApiKeyType: 'test' | 'ios' | 'android' = 'test';

function getPrimaryApiKey(): { key: string | undefined; type: 'test' | 'ios' | 'android' } {
  if (Platform.OS === 'web') {
    return { key: TEST_KEY, type: 'test' };
  }
  
  if (isExpoGo) {
    console.log('[RevenueCat] Expo Go detected - using Test Store API key');
    return { key: TEST_KEY, type: 'test' };
  }
  
  if (Platform.OS === 'ios' && IOS_KEY) {
    return { key: IOS_KEY, type: 'ios' };
  }
  
  if (Platform.OS === 'android' && ANDROID_KEY) {
    return { key: ANDROID_KEY, type: 'android' };
  }
  
  return { key: TEST_KEY, type: 'test' };
}

const configureWithKey = async (apiKey: string, keyType: 'test' | 'ios' | 'android'): Promise<boolean> => {
  if (!Purchases) {
    console.warn('[RevenueCat] Native module not available');
    return false;
  }
  try {
    if (LOG_LEVEL) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    
    if (isExpoGo && keyType !== 'test') {
      console.warn('[RevenueCat] Expo Go requires Test Store API key, switching...');
      if (TEST_KEY) {
        Purchases.configure({ apiKey: TEST_KEY });
        isConfigured = true;
        currentApiKeyType = 'test';
        console.log('[RevenueCat] Configured with TEST key (Expo Go)');
        return true;
      }
      return false;
    }
    
    Purchases.configure({ apiKey });
    isConfigured = true;
    currentApiKeyType = keyType;
    console.log(`[RevenueCat] Configured with ${keyType.toUpperCase()} key`);
    return true;
  } catch (error: any) {
    console.error(`[RevenueCat] Configuration error (${keyType}):`, error?.message || error);
    
    if (isExpoGo && TEST_KEY && keyType !== 'test') {
      console.log('[RevenueCat] Retrying with Test Store key...');
      try {
        Purchases.configure({ apiKey: TEST_KEY });
        isConfigured = true;
        currentApiKeyType = 'test';
        console.log('[RevenueCat] Configured with TEST key after fallback');
        return true;
      } catch (retryError) {
        console.error('[RevenueCat] Test Store fallback also failed:', retryError);
      }
    }
    
    return false;
  }
};

export const initializeRevenueCat = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !Purchases) {
    console.log('[RevenueCat] Skipping init (web or no native module)');
    return false;
  }

  if (isConfigured) {
    console.log('[RevenueCat] Already configured with', currentApiKeyType);
    return true;
  }

  console.log('[RevenueCat] Initializing...');
  console.log('[RevenueCat] Platform:', Platform.OS);
  console.log('[RevenueCat] Keys available - TEST:', !!TEST_KEY, 'iOS:', !!IOS_KEY, 'Android:', !!ANDROID_KEY);

  const primary = getPrimaryApiKey();
  
  if (!primary.key) {
    console.error('[RevenueCat] No API key found!');
    return false;
  }

  return configureWithKey(primary.key, primary.type);
};

const reconfigureWithTestStore = async (): Promise<boolean> => {
  if (!TEST_KEY || !Purchases) {
    return false;
  }
  
  if (currentApiKeyType === 'test') {
    return false;
  }

  console.log('[RevenueCat] Switching to Test Store...');
  isConfigured = false;
  cachedOfferings = null;
  
  return configureWithKey(TEST_KEY, 'test');
};

const fetchOfferingsInternal = async (): Promise<RevenueCatOfferings | null> => {
  if (!Purchases) return null;
  
  const offerings = await Purchases.getOfferings();
  
  console.log('[RevenueCat] Using key type:', currentApiKeyType);
  console.log('[RevenueCat] Has current:', !!offerings?.current);
  
  const currentPackages = offerings?.current?.availablePackages;
  if (currentPackages && currentPackages.length > 0) {
    console.log('[RevenueCat] Current offering:', offerings.current?.identifier);
    currentPackages.forEach((pkg: any, i: number) => {
      console.log(`[RevenueCat] Package ${i + 1}:`, {
        id: pkg.identifier,
        productId: pkg.product?.identifier,
        price: pkg.product?.priceString,
      });
    });
    return offerings;
  }
  
  const allKeys = Object.keys(offerings?.all || {});
  for (const key of allKeys) {
    const offering = offerings.all[key];
    if (offering?.availablePackages?.length > 0) {
      console.log('[RevenueCat] Using fallback offering:', key);
      return { ...offerings, current: offering };
    }
  }
  
  return null;
};

export const getOfferings = async (): Promise<RevenueCatOfferings | null> => {
  if (Platform.OS === 'web' || !Purchases) return null;

  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    console.log('[RevenueCat] Fetching offerings...');
    
    let offerings = await fetchOfferingsInternal();
    
    const pkgs = offerings?.current?.availablePackages;
    if (pkgs && pkgs.length > 0) {
      cachedOfferings = offerings;
      return offerings;
    }
    
    console.warn('[RevenueCat] No packages found with', currentApiKeyType, 'key');
    
    if (currentApiKeyType !== 'test' && TEST_KEY) {
      const switched = await reconfigureWithTestStore();
      if (switched) {
        offerings = await fetchOfferingsInternal();
        const testPkgs = offerings?.current?.availablePackages;
        if (testPkgs && testPkgs.length > 0) {
          cachedOfferings = offerings;
          return offerings;
        }
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('[RevenueCat] Error fetching offerings:', error?.message || error);
    
    if (currentApiKeyType !== 'test' && TEST_KEY) {
      try {
        const switched = await reconfigureWithTestStore();
        if (switched) {
          const offerings = await fetchOfferingsInternal();
          const fallbackPkgs = offerings?.current?.availablePackages;
          if (fallbackPkgs && fallbackPkgs.length > 0) {
            cachedOfferings = offerings;
            return offerings;
          }
        }
      } catch (fallbackError) {
        console.error('[RevenueCat] Test Store fallback failed:', fallbackError);
      }
    }
    
    return null;
  }
};

export const getCustomerInfo = async (): Promise<RevenueCatCustomerInfo | null> => {
  if (Platform.OS === 'web' || !Purchases) return null;

  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    const info = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] Customer info loaded');
    return info;
  } catch (error) {
    console.error('[RevenueCat] Error getting customer info:', error);
    return null;
  }
};

export const purchasePackage = async (pkg: any): Promise<RevenueCatCustomerInfo | null> => {
  if (Platform.OS === 'web' || !Purchases) return null;

  try {
    console.log('[RevenueCat] Starting purchase:', pkg.product.identifier);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    console.log('[RevenueCat] Purchase successful!');
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[RevenueCat] Purchase cancelled by user');
      return null;
    }
    console.error('[RevenueCat] Purchase error:', error.message || error);
    throw error;
  }
};

export const restorePurchases = async (): Promise<RevenueCatCustomerInfo | null> => {
  if (Platform.OS === 'web' || !Purchases) return null;

  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    console.log('[RevenueCat] Restoring purchases...');
    const info = await Purchases.restorePurchases();
    console.log('[RevenueCat] Restore complete');
    return info;
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error);
    return null;
  }
};

export const identifyUser = async (userId: string): Promise<RevenueCatCustomerInfo | null> => {
  if (Platform.OS === 'web' || !Purchases) return null;

  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    console.log('[RevenueCat] Identifying user:', userId);
    const { customerInfo } = await Purchases.logIn(userId);
    console.log('[RevenueCat] User identified');
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Identify user error:', error);
    return null;
  }
};

export const logoutUser = async (): Promise<RevenueCatCustomerInfo | null> => {
  if (!isConfigured || !Purchases) return null;

  try {
    console.log('[RevenueCat] Logging out user...');
    const customerInfo = await Purchases.logOut();
    console.log('[RevenueCat] User logged out');
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Logout error:', error);
    return null;
  }
};

export const getCachedOfferings = () => cachedOfferings;

export const findPackageByIdentifier = (identifier: string): any | null => {
  if (!cachedOfferings?.current) return null;
  
  return cachedOfferings.current.availablePackages.find(
    (pkg: any) => pkg.identifier === identifier || pkg.product.identifier === identifier
  ) || null;
};

export const isRevenueCatConfigured = () => isConfigured;
