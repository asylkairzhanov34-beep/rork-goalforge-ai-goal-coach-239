import Constants from 'expo-constants';

export const getRorkConfig = () => {
  const extra = Constants.expoConfig?.extra || {};
  
  const toolkitUrl = 
    process.env.EXPO_PUBLIC_TOOLKIT_URL || 
    extra.EXPO_PUBLIC_TOOLKIT_URL || 
    'https://toolkit.rork.com';
  
  const projectId = 
    process.env.EXPO_PUBLIC_PROJECT_ID || 
    extra.EXPO_PUBLIC_PROJECT_ID || 
    'z054j4yerxhk7iq0ot5f3';
  
  const teamId = 
    process.env.EXPO_PUBLIC_TEAM_ID || 
    extra.EXPO_PUBLIC_TEAM_ID || 
    '';
  
  console.log('[RorkConfig] ========== Configuration ==========');
  console.log('[RorkConfig] Toolkit URL:', toolkitUrl);
  console.log('[RorkConfig] Project ID:', projectId);
  console.log('[RorkConfig] Team ID:', teamId || '(not set)');
  console.log('[RorkConfig] Extra config available:', Object.keys(extra).join(', ') || 'none');
  console.log('[RorkConfig] ======================================');
  
  return {
    toolkitUrl,
    projectId,
    teamId,
  };
};
