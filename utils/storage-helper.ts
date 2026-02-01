import AsyncStorage from '@react-native-async-storage/async-storage';

const extractErrorText = (error: unknown) => {
  if (error instanceof Error) {
    return error.message ?? '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return '';
    }
  }
  return '';
};

const isIgnorableStorageClearError = (error: unknown) => {
  const message = extractErrorText(error);
  return (
    message.includes('No such file or directory') ||
    message.includes('couldn’t be removed') ||
    message.includes('couldn\'t be removed')
  );
};

// Simple function to clear all storage if there are any issues
export const clearAllStorageIfCorrupted = async () => {
  try {
    await AsyncStorage.clear();
    console.log('Storage cleared successfully');
    return true;
  } catch (error) {
    if (isIgnorableStorageClearError(error)) {
      console.log('Storage directory already removed, ignoring error');
      return true;
    }
    console.error('Failed to clear storage:', error);
    return false;
  }
};

export const clearCorruptedStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length === 0) {
      console.log('No storage keys found');
      return [];
    }
    
    const results = await AsyncStorage.multiGet(keys);
    const corruptedKeys: string[] = [];
    
    for (const [key, value] of results) {
      if (value !== null && value !== undefined) {
        try {
          // Check if value is already an object (shouldn't be in AsyncStorage)
          if (typeof value === 'object') {
            console.log(`Non-string data found in key: ${key}`);
            corruptedKeys.push(key);
            continue;
          }
          
          // Check for common corruption patterns
          if (value === 'undefined' || value === 'null' || value === '[object Object]' || value.trim() === '') {
            console.log(`Invalid string value found in key: ${key}`);
            corruptedKeys.push(key);
            continue;
          }
          
          // Check for malformed JSON that starts with unexpected characters
          const trimmed = value.trim();
          if (trimmed.startsWith('o') && !trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) {
            console.log(`Malformed JSON detected in key: ${key}, starts with: ${trimmed.substring(0, 10)}`);
            corruptedKeys.push(key);
            continue;
          }
          
          // Try to parse JSON to check if it's valid
          const parsed = JSON.parse(value);
          
          // Additional validation for specific keys
          if (key === 'auth_user' && (!parsed.id || !parsed.email)) {
            console.log(`Invalid auth data structure in key: ${key}`);
            corruptedKeys.push(key);
          }
        } catch (error) {
          console.log(
            `JSON parse error in key: ${key}, value preview: ${value.substring(0, 50)}...`,
            error,
          );
          corruptedKeys.push(key);
        }
      }
    }
    
    if (corruptedKeys.length > 0) {
      await AsyncStorage.multiRemove(corruptedKeys);
      console.log(`Cleared ${corruptedKeys.length} corrupted storage keys:`, corruptedKeys);
    }
    
    return corruptedKeys;
  } catch (error) {
    console.error('Error clearing corrupted storage:', error);
    // If all else fails, clear everything
    try {
      await AsyncStorage.clear();
      console.log('Cleared all storage due to critical error');
    } catch (clearError) {
      if (isIgnorableStorageClearError(clearError)) {
        console.log('Storage directory already removed, ignoring error');
      } else {
        console.error('Failed to clear storage:', clearError);
      }
    }
    return [];
  }
};

export const safeJsonParse = <T>(text: string | null | undefined, fallback: T): T => {
  if (!text || text === 'undefined' || text === 'null' || text.trim() === '') {
    return fallback;
  }
  
  // Check for common corruption patterns before parsing
  const trimmed = text.trim();
  
  // Handle the specific "Unexpected character: o" error and other corruption patterns
  if (trimmed.startsWith('o') && !trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) {
    console.warn('Detected corrupted JSON starting with "o", using fallback');
    return fallback;
  }
  
  // Check for other invalid JSON patterns
  if (trimmed === '[object Object]' || trimmed === 'undefined' || trimmed === 'null') {
    console.warn('Detected invalid JSON pattern, using fallback');
    return fallback;
  }
  
  // Check for other common corruption patterns
  if (trimmed.includes('bject Object') || 
      trimmed.includes('nction') || 
      trimmed.includes('efined') ||
      !trimmed.match(/^[\[\{"\d\-tfn]/) || // Must start with valid JSON characters
      trimmed.includes('\\x') || // Contains escape sequences that shouldn't be there
      (trimmed.includes('\\u') && !trimmed.match(/\\u[0-9a-fA-F]{4}/))) { // Invalid unicode escapes
    console.warn('Detected invalid JSON pattern, using fallback');
    return fallback;
  }
  
  try {
    // Simple JSON parse with fallback
    const parsed = JSON.parse(text);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (error) {
    console.warn('JSON parse failed, using fallback:', error);
    console.warn('Problematic text (first 100 chars):', text.substring(0, 100));
    return fallback;
  }
};

export const safeStorageGet = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const value = await AsyncStorage.getItem(key);
    
    // If no value, return fallback immediately
    if (!value) {
      return fallback;
    }
    
    // Additional check for corrupted storage values
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Check for various corruption patterns
      if (trimmed.startsWith('o') && !trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"')) {
        console.warn(`Corrupted storage detected for key ${key} (starts with 'o'), removing and using fallback`);
        await AsyncStorage.removeItem(key);
        return fallback;
      }
      
      // Check for other corruption patterns
      if (trimmed.includes('bject Object') || 
          trimmed.includes('nction') || 
          trimmed === 'undefined' ||
          trimmed === 'null' ||
          trimmed === '[object Object]' ||
          !trimmed.match(/^[\[\{"\d\-tfn]/)) {
        console.warn(`Corrupted storage detected for key ${key} (invalid pattern), removing and using fallback`);
        await AsyncStorage.removeItem(key);
        return fallback;
      }
    }
    
    return safeJsonParse(value, fallback);
  } catch (error) {
    console.warn(`Storage get error for ${key}:`, error);
    
    // If there's any error, try to remove the corrupted key
    if (error instanceof Error && 
        (error.message.includes('JSON Parse error') || 
         error.message.includes('Unexpected character') ||
         error.message.includes('parse error'))) {
      try {
        await AsyncStorage.removeItem(key);
        console.warn(`Removed corrupted storage key: ${key}`);
      } catch (removeError) {
        console.warn(`Failed to remove corrupted key ${key}:`, removeError);
      }
    }
    
    return fallback;
  }
};

export const safeStorageSet = async (key: string, value: any): Promise<boolean> => {
  try {
    if (value === undefined) {
      await AsyncStorage.removeItem(key);
      return true;
    }
    
    const stringified = JSON.stringify(value);
    
    // Validate that the stringified value is valid JSON
    if (!stringified || stringified.trim() === '' || stringified === 'undefined') {
      console.warn(`Invalid value for storage key ${key}, skipping`);
      return false;
    }
    
    await AsyncStorage.setItem(key, stringified);
    return true;
  } catch (error) {
    console.warn(`Storage set error for ${key}:`, error);
    return false;
  }
};