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

const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

let isConfigured = false;
let cachedOfferings: PurchasesOfferings | null = null;
let currentApiKeyType: 'test' | 'ios' | 'android' = 'test';

function getPrimaryApiKey(): { key: string | undefined; type: 'test' | 'ios' | 'android' } {
  if (Platform.OS === 'web') {
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
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    isConfigured = true;
    currentApiKeyType = keyType;
    console.log(`[RevenueCat] ✅ Configured with ${keyType.toUpperCase()} key`);
    return true;
  } catch (error) {
    console.error(`[RevenueCat] Configuration error (${keyType}):`, error);
    return false;
  }
};

export const initializeRevenueCat = async (): Promise<boolean> => {
  if (isConfigured) {
    console.log('[RevenueCat] Already configured with', currentApiKeyType);
    return true;
  }

  console.log('[RevenueCat] 🚀 Initializing...');
  console.log('[RevenueCat] Platform:', Platform.OS);
  console.log('[RevenueCat] Keys available - TEST:', !!TEST_KEY, 'iOS:', !!IOS_KEY, 'Android:', !!ANDROID_KEY);

  const primary = getPrimaryApiKey();
  
  if (!primary.key) {
    console.error('[RevenueCat] ❌ No API key found!');
    return false;
  }

  return configureWithKey(primary.key, primary.type);
};

const reconfigureWithTestStore = async (): Promise<boolean> => {
  if (!TEST_KEY) {
    console.log('[RevenueCat] No TEST_KEY for fallback');
    return false;
  }
  
  if (currentApiKeyType === 'test') {
    console.log('[RevenueCat] Already using test store');
    return false;
  }

  console.log('[RevenueCat] 🔄 Switching to Test Store...');
  isConfigured = false;
  cachedOfferings = null;
  
  return configureWithKey(TEST_KEY, 'test');
};

const fetchOfferingsInternal = async (): Promise<PurchasesOfferings | null> => {
  const offerings = await Purchases.getOfferings();
  
  console.log('[RevenueCat] ========== OFFERINGS DEBUG ==========');
  console.log('[RevenueCat] Using key type:', currentApiKeyType);
  console.log('[RevenueCat] Has offerings:', !!offerings);
  console.log('[RevenueCat] All offerings keys:', Object.keys(offerings?.all || {}));
  console.log('[RevenueCat] Has current:', !!offerings?.current);
  
  const currentPackages = offerings?.current?.availablePackages;
  if (currentPackages && currentPackages.length > 0) {
    console.log('[RevenueCat] ✅ Current offering:', offerings.current?.identifier);
    currentPackages.forEach((pkg, i) => {
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
      console.log('[RevenueCat] 🔄 Using fallback offering:', key);
      return { ...offerings, current: offering };
    }
  }
  
  return null;
};

export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) {
      console.error('[RevenueCat] Cannot fetch offerings - not configured');
      return null;
    }
  }

  try {
    console.log('[RevenueCat] 📦 Fetching offerings...');
    
    let offerings = await fetchOfferingsInternal();
    
    const pkgs = offerings?.current?.availablePackages;
    if (pkgs && pkgs.length > 0) {
      cachedOfferings = offerings;
      return offerings;
    }
    
    console.warn('[RevenueCat] ⚠️ No packages found with', currentApiKeyType, 'key');
    
    if (currentApiKeyType !== 'test' && TEST_KEY) {
      console.log('[RevenueCat] 🔄 Trying Test Store as fallback...');
      const switched = await reconfigureWithTestStore();
      
      if (switched) {
        offerings = await fetchOfferingsInternal();
        
        const testPkgs = offerings?.current?.availablePackages;
        if (testPkgs && testPkgs.length > 0) {
          console.log('[RevenueCat] ✅ Test Store has packages!');
          cachedOfferings = offerings;
          return offerings;
        }
      }
    }
    
    console.error('[RevenueCat] ❌ NO OFFERINGS WITH PACKAGES FOUND');
    console.error('[RevenueCat] Possible causes:');
    console.error('[RevenueCat] 1. Products pending approval in App Store Connect');
    console.error('[RevenueCat] 2. No products attached to offerings in RevenueCat');
    console.error('[RevenueCat] 3. Bundle ID mismatch');
    
    return null;
  } catch (error: any) {
    console.error('[RevenueCat] ❌ Error fetching offerings:', error?.message || error);
    
    if (currentApiKeyType !== 'test' && TEST_KEY) {
      console.log('[RevenueCat] 🔄 Error occurred, trying Test Store...');
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

export const identifyUser = async (userId: string): Promise<CustomerInfo | null> => {
  if (!isConfigured) {
    const success = await initializeRevenueCat();
    if (!success) return null;
  }

  try {
    console.log('[RevenueCat] 🔗 Identifying user:', userId);
    const { customerInfo } = await Purchases.logIn(userId);
    console.log('[RevenueCat] ✅ User identified');
    console.log('[RevenueCat] App User ID:', customerInfo.originalAppUserId);
    console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Identify user error:', error);
    return null;
  }
};

export const logoutUser = async (): Promise<CustomerInfo | null> => {
  if (!isConfigured) return null;

  try {
    console.log('[RevenueCat] 👋 Logging out user...');
    const customerInfo = await Purchases.logOut();
    console.log('[RevenueCat] ✅ User logged out, now anonymous');
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Logout error:', error);
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
