import { Platform } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesPackage, 
  PurchasesOfferings,
  LOG_LEVEL,
} from 'react-native-purchases';

export type RevenueCatCustomerInfo = CustomerInfo;
export type RevenueCatPackage = PurchasesPackage;
export type RevenueCatOfferings = PurchasesOfferings;

function getRevenueCatApiKey(): string | undefined {
  const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  
  console.log('[RevenueCat] Keys available - TEST:', !!testKey, 'iOS:', !!iosKey, 'Android:', !!androidKey);
  
  if (Platform.OS === 'web') {
    return testKey;
  }
  
  if (Platform.OS === 'ios') {
    return iosKey || testKey;
  }
  
  if (Platform.OS === 'android') {
    return androidKey || testKey;
  }
  
  return testKey;
}

let isConfigured = false;
let cachedOfferings: PurchasesOfferings | null = null;

export const initializeRevenueCat = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    console.log('[RevenueCat] Web platform - using Test Store');
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.error('[RevenueCat] No TEST_API_KEY found for web');
      return false;
    }
    try {
      Purchases.configure({ apiKey });
      isConfigured = true;
      console.log('[RevenueCat] ✅ Web configured with Test Store');
      return true;
    } catch (error) {
      console.error('[RevenueCat] Web configuration error:', error);
      return false;
    }
  }

  if (isConfigured) {
    console.log('[RevenueCat] Already configured');
    return true;
  }

  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    console.error('[RevenueCat] ❌ API key not found!');
    console.error('[RevenueCat] __DEV__:', __DEV__);
    console.error('[RevenueCat] Platform:', Platform.OS);
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    
    Purchases.configure({ apiKey });
    isConfigured = true;
    
    console.log('[RevenueCat] ✅ Configured successfully');
    console.log('[RevenueCat] Platform:', Platform.OS);
    console.log('[RevenueCat] Mode:', __DEV__ ? 'Development (Test Store)' : 'Production');
    
    return true;
  } catch (error) {
    console.error('[RevenueCat] Configuration error:', error);
    return false;
  }
};

export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    console.log('[RevenueCat] Fetching offerings...');
    const offerings = await Purchases.getOfferings();
    
    console.log('[RevenueCat] Raw offerings:', JSON.stringify(offerings, null, 2));
    console.log('[RevenueCat] All offerings keys:', Object.keys(offerings.all || {}));
    
    if (offerings.current) {
      console.log('[RevenueCat] ✅ Current offering:', offerings.current.identifier);
      console.log('[RevenueCat] Available packages:', offerings.current.availablePackages.length);
      offerings.current.availablePackages.forEach((pkg, i) => {
        console.log(`[RevenueCat] Package ${i + 1}:`, pkg.identifier, '-', pkg.product.priceString);
      });
      cachedOfferings = offerings;
    } else {
      console.warn('[RevenueCat] ⚠️ No current offering - check RevenueCat dashboard');
      console.warn('[RevenueCat] Make sure you have an offering set as CURRENT');
      
      const allKeys = Object.keys(offerings.all || {});
      if (allKeys.length > 0) {
        console.log('[RevenueCat] Found other offerings:', allKeys);
        const firstOffering = offerings.all[allKeys[0]];
        if (firstOffering?.availablePackages?.length > 0) {
          console.log('[RevenueCat] Using first available offering:', allKeys[0]);
          cachedOfferings = { ...offerings, current: firstOffering };
          return cachedOfferings;
        }
      }
    }
    
    return offerings;
  } catch (error: any) {
    console.error('[RevenueCat] Error fetching offerings:', error?.message || error);
    console.error('[RevenueCat] Error code:', error?.code);
    return null;
  }
};

export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    const info = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] Customer info loaded');
    console.log('[RevenueCat] Active subscriptions:', info.activeSubscriptions);
    console.log('[RevenueCat] Entitlements:', Object.keys(info.entitlements.active));
    return info;
  } catch (error) {
    console.error('[RevenueCat] Error getting customer info:', error);
    return null;
  }
};

export const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo | null> => {
  try {
    console.log('[RevenueCat] 🛒 Starting purchase:', pkg.product.identifier);
    console.log('[RevenueCat] Price:', pkg.product.priceString);
    
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    console.log('[RevenueCat] ✅ Purchase successful!');
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

export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    console.log('[RevenueCat] Restoring purchases...');
    const info = await Purchases.restorePurchases();
    console.log('[RevenueCat] ✅ Restore complete');
    return info;
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error);
    return null;
  }
};

export const getCachedOfferings = () => cachedOfferings;

export const findPackageByIdentifier = (identifier: string): PurchasesPackage | null => {
  if (!cachedOfferings?.current) return null;
  
  return cachedOfferings.current.availablePackages.find(
    pkg => pkg.identifier === identifier || pkg.product.identifier === identifier
  ) || null;
};

export const isRevenueCatConfigured = () => isConfigured;
