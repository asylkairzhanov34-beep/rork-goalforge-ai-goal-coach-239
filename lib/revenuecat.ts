import { Platform } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesPackage, 
  PurchasesOffering 
} from 'react-native-purchases';

// Типы для совместимости с вашим проектом
export type RevenueCatCustomerInfo = CustomerInfo;
export type RevenueCatPackage = PurchasesPackage;
export type RevenueCatOfferings = {
  current: PurchasesOffering | null;
  all: { [key: string]: PurchasesOffering };
};

// 1. Получаем ключ (Исправлено имя переменной!)
const API_KEYS = {
  // Проверяем оба варианта написания, чтобы точно найти ключ
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
};

let isConfigured = false;

// 2. Инициализация
export const initializeRevenueCat = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  if (isConfigured) return true;

  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;

  if (!apiKey) {
    console.error('[RevenueCat] ❌ Ключ API не найден! Проверьте файл .env');
    console.error('[RevenueCat] Ищем EXPO_PUBLIC_REVENUECAT_IOS_KEY');
    return false;
  }

  try {
    if (__DEV__) {
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }
    
    await Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('[RevenueCat] ✅ Успешно подключено к', Platform.OS);
    return true;
  } catch (error) {
    console.error('[RevenueCat] ❌ Ошибка конфигурации:', error);
    return false;
  }
};

// 3. Получение тарифов (Offerings)
export const getOfferings = async (): Promise<RevenueCatOfferings | null> => {
  if (!isConfigured) await initializeRevenueCat();

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      console.log('[RevenueCat] 📦 Тарифы загружены:', offerings.current.availablePackages.length);
    } else {
      console.warn('[RevenueCat] ⚠️ Offerings пусты (проверьте Dashboard)');
    }
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] ❌ Ошибка загрузки тарифов:', error);
    return null;
  }
};

// 4. Покупка пакета
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo }> => {
  try {
    console.log('[RevenueCat] 💰 Попытка покупки:', pkg.product.identifier);
    // Это вызывает системное окно Apple Pay
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    console.log('[RevenueCat] ✅ Покупка успешна!');
    return { customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[RevenueCat] ℹ️ Пользователь отменил покупку');
      throw { userCancelled: true };
    }
    console.error('[RevenueCat] ❌ Ошибка покупки:', error);
    throw error;
  }
};

// 5. Восстановление покупок
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  try {
    const info = await Purchases.restorePurchases();
    return info;
  } catch (error) {
    console.error('[RevenueCat] Ошибка восстановления:', error);
    return null;
  }
};

// 6. Получение информации о клиенте
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    return null;
  }
};

// --- Функции для совместимости с вашим хуком use-subscription-store ---

// Кеш для совместимости
let cachedPackages: PurchasesPackage[] = [];

export const getOfferingsWithCache = async () => {
  const offerings = await getOfferings();
  if (offerings?.current) {
    cachedPackages = offerings.current.availablePackages;
  }
  return offerings;
};

export const getOriginalPackages = () => cachedPackages;

export const purchasePackageByIdentifier = async (identifier: string) => {
  const pkg = cachedPackages.find(
    p => p.identifier === identifier || p.product.identifier === identifier
  );

  if (!pkg) {
    console.error('[RevenueCat] Пакет не найден в кеше:', identifier);
    return null;
  }

  const result = await purchasePackage(pkg);
  return {
    info: result.customerInfo,
    purchasedPackage: pkg
  };
};

export const restorePurchasesFromRevenueCat = restorePurchases;
export const syncWithRevenueCat = getCustomerInfo;
export const invalidateCustomerInfoCache = async () => {
    // В новых версиях SDK это делается автоматически или через getCustomerInfo
    await getCustomerInfo();
};