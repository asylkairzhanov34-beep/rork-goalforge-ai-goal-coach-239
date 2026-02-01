export const theme = {
  colors: {
    // Premium dark palette inspired by Endel
    primary: '#FFD700',
    primaryDark: '#B8860B',
    secondary: '#1A1A1A',
    accent: '#333333',
    success: '#4CAF50',
    error: '#FF4500',
    warning: '#FFA500',
    
    // Dark premium backgrounds
    background: '#000000',
    backgroundSecondary: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceElevated: '#2A2A2A',
    surfaceGlass: 'rgba(255, 215, 0, 0.05)',
    surfaceDark: '#000000',
    
    // Premium text colors
    text: '#FFFFFF',
    textSecondary: '#A9A9A9',
    textLight: '#666666',
    textOnDark: '#FFFFFF',
    textMuted: '#444444',
    
    // Subtle borders
    border: '#333333',
    borderLight: '#2A2A2A',
    
    // Gold gradients
    gradientStart: '#FFD700',
    gradientEnd: '#B8860B',
    
    // Premium glass effect
    glass: 'rgba(255, 215, 0, 0.08)',
    glassBorder: 'rgba(255, 215, 0, 0.15)',
    
    // Premium shadows
    shadowPrimary: 'rgba(255, 215, 0, 0.2)',
    shadowSecondary: 'rgba(0, 0, 0, 0.8)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  borderRadius: {
    xs: 8,
    sm: 16,
    md: 20,
    lg: 28,
    xl: 36,
    xxl: 44,
    full: 9999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 42,
  },
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  } as const,
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 5,
    },
    premium: {
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    gold: {
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

export const COLORS = theme.colors;