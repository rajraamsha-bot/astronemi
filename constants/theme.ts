/**
 * 💎 AstroNemi Premium Design System
 * 
 * Centralized design tokens for consistent, high-fidelity UI across the app.
 */

// Colors imported in constants/index.ts

export const Gradients = {
  // Vibrant Sky - Primary
  primary: ['#FF6B35', '#FF8C42'] as const,
  // Royal Astro - Secondary
  purple: ['#6B2E8E', '#9D50BB'] as const,
  // Sun Shine - Highlight
  gold: ['#FFB341', '#FFD700'] as const,
  // Deep Space - Backgrounds
  dark: ['#1A1F3A', '#0F1221'] as const,
  // Glassmorphism - Transparency
  glass: ['#FFFFFF33', '#FFFFFF11'] as const,
  // Warning/Error
  danger: ['#EF4444', '#B91C1C'] as const,
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  }),
};

export const Transitions = {
  spring: {
    damping: 15,
    stiffness: 150,
  },
  gentle: {
    damping: 20,
    stiffness: 100,
  },
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/**
 * Typography — Inter font family tokens.
 * Loaded in app/_layout.tsx via @expo-google-fonts/inter.
 * Usage: { fontFamily: Typography.semiBold }
 */
export const Typography = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

export default {
  Gradients,
  Shadows,
  Transitions,
  Radii,
  Typography,
};
