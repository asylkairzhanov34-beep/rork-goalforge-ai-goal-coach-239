import { InteractionManager } from 'react-native';

const IS_DEV = __DEV__;

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

export function disableLogsInProduction() {
  if (!IS_DEV) {
    console.log = () => {};
    console.warn = () => {};
  }
}

export function enableLogs() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}

export function runAfterInteractions(callback: () => void, delay: number = 0) {
  InteractionManager.runAfterInteractions(() => {
    if (delay > 0) {
      setTimeout(callback, delay);
    } else {
      callback();
    }
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

const memoryCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function getCached<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value as T;
  }
  memoryCache.delete(key);
  return null;
}

export function setCache<T>(key: string, value: T): void {
  memoryCache.set(key, { value, timestamp: Date.now() });
}

export function clearCache(): void {
  memoryCache.clear();
}

export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}
