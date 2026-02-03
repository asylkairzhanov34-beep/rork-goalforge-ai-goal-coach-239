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
    if (!success) {
      console.error('[RevenueCat] Cannot fetch offerings - not configured');
      return null;
    }
  }

  try {
    console.log('[RevenueCat] 📦 Fetching offerings...');
    console.log('[RevenueCat] Platform:', Platform.OS);
    console.log('[RevenueCat] Is DEV:', __DEV__);
    
    const offerings = await Purchases.getOfferings();
    
    console.log('[RevenueCat] ========== OFFERINGS DEBUG ==========');
    console.log('[RevenueCat] Has offerings object:', !!offerings);
    console.log('[RevenueCat] All offerings keys:', Object.keys(offerings?.all || {}));
    console.log('[RevenueCat] Has current offering:', !!offerings?.current);
    
    if (offerings?.current) {
      console.log('[RevenueCat] ✅ Current offering ID:', offerings.current.identifier);
      console.log('[RevenueCat] Packages count:', offerings.current.availablePackages?.length || 0);
      
      if (offerings.current.availablePackages?.length > 0) {
        offerings.current.availablePackages.forEach((pkg, i) => {
          console.log(`[RevenueCat] Package ${i + 1}:`, {
            id: pkg.identifier,
            productId: pkg.product?.identifier,
            price: pkg.product?.priceString,
            title: pkg.product?.title,
          });
        });
        cachedOfferings = offerings;
        return offerings;
      } else {
        console.warn('[RevenueCat] ⚠️ Current offering has NO packages!');
        console.warn('[RevenueCat] Check that products are attached to your offering in RevenueCat');
      }
    } else {
      console.warn('[RevenueCat] ⚠️ No CURRENT offering found!');
      console.warn('[RevenueCat] Go to RevenueCat Dashboard → Offerings → Set one as Current');
    }
    
    // Try to use any available offering as fallback
    const allKeys = Object.keys(offerings?.all || {});
    console.log('[RevenueCat] Checking fallback offerings:', allKeys);
    
    for (const key of allKeys) {
      const offering = offerings.all[key];
      if (offering?.availablePackages?.length > 0) {
        console.log('[RevenueCat] 🔄 Using fallback offering:', key);
        cachedOfferings = { ...offerings, current: offering };
        return cachedOfferings;
      }
    }
    
    console.error('[RevenueCat] ❌ NO OFFERINGS WITH PACKAGES FOUND');
    console.error('[RevenueCat] Possible causes:');
    console.error('[RevenueCat] 1. No offering set as Current in RevenueCat');
    console.error('[RevenueCat] 2. No products attached to offerings');
    console.error('[RevenueCat] 3. Products pending approval in App Store Connect');
    console.error('[RevenueCat] 4. Wrong API key for this environment');
    
    return offerings;
  } catch (error: any) {
    console.error('[RevenueCat] ❌ Error fetching offerings:', error?.message || error);
    console.error('[RevenueCat] Error code:', error?.code);
    console.error('[RevenueCat] Full error:', JSON.stringify(error, null, 2));
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
