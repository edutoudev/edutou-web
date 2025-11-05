/**
 * Professional Color Theme Configuration
 *
 * This file defines the color palette for the Edutou platform.
 * Designed for professional educators and enterprise users.
 *
 * Theme Philosophy:
 * - Professional and trustworthy
 * - Accessible and readable
 * - Consistent across all components
 */

export const theme = {
  // Primary brand colors - Professional blue-gray palette
  primary: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98',  // Main primary color
    600: '#486581',
    700: '#334e68',
    800: '#243b53',
    900: '#102a43',
  },

  // Secondary colors - Warm accent for highlights
  secondary: {
    50: '#fff5f7',
    100: '#fed7e2',
    200: '#fbb6ce',
    300: '#f687b3',
    400: '#ed64a6',
    500: '#d53f8c',  // Main secondary color
    600: '#b83280',
    700: '#97266d',
    800: '#702459',
    900: '#521b41',
  },

  // Success - Green for positive actions
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main success color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning - Amber for caution
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main warning color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error - Red for errors and alerts
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Main error color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral - Gray scale for UI elements
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic colors for specific use cases
  background: {
    light: '#ffffff',
    subtle: '#f8fafc',
    muted: '#f1f5f9',
    dark: '#0f172a',
  },

  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
  },

  border: {
    light: '#e2e8f0',
    default: '#cbd5e1',
    dark: '#94a3b8',
  },

  // Quiz-specific colors
  quiz: {
    correct: '#22c55e',
    incorrect: '#ef4444',
    pending: '#f59e0b',
    timeout: '#94a3b8',
  },

  // Leaderboard colors
  leaderboard: {
    gold: '#fbbf24',
    silver: '#cbd5e1',
    bronze: '#f59e0b',
  },
} as const

/**
 * Gradient presets for backgrounds and accents
 */
export const gradients = {
  primary: 'bg-gradient-to-r from-primary-600 to-primary-700',
  success: 'bg-gradient-to-r from-success-600 to-success-700',
  warning: 'bg-gradient-to-r from-warning-500 to-warning-600',
  error: 'bg-gradient-to-r from-error-500 to-error-600',

  // Subtle backgrounds
  subtlePrimary: 'bg-gradient-to-br from-primary-50 to-primary-100',
  subtleSuccess: 'bg-gradient-to-br from-success-50 to-success-100',

  // Professional dashboard gradient
  dashboard: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
  dashboardDark: 'dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950',
} as const

/**
 * Spacing scale for consistent layouts
 */
export const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const

/**
 * Border radius scale for consistent rounded corners
 */
export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',  // Fully rounded
} as const

/**
 * Typography scale
 */
export const typography = {
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const
