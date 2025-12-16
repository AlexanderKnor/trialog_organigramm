/**
 * Spacing System - 8px Grid
 */

export const SPACING = {
  xxs: '2px',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
};

export const BORDER_RADIUS = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 3px rgba(16, 39, 76, 0.12)',
  md: '0 4px 6px rgba(16, 39, 76, 0.16)',
  lg: '0 10px 20px rgba(16, 39, 76, 0.19)',
  xl: '0 15px 30px rgba(16, 39, 76, 0.25)',
};

export const getCssVariables = () => `
  --spacing-xxs: ${SPACING.xxs};
  --spacing-xs: ${SPACING.xs};
  --spacing-sm: ${SPACING.sm};
  --spacing-md: ${SPACING.md};
  --spacing-lg: ${SPACING.lg};
  --spacing-xl: ${SPACING.xl};
  --spacing-xxl: ${SPACING.xxl};
  --spacing-xxxl: ${SPACING.xxxl};
  --border-radius-none: ${BORDER_RADIUS.none};
  --border-radius-sm: ${BORDER_RADIUS.sm};
  --border-radius-md: ${BORDER_RADIUS.md};
  --border-radius-lg: ${BORDER_RADIUS.lg};
  --border-radius-xl: ${BORDER_RADIUS.xl};
  --border-radius-full: ${BORDER_RADIUS.full};
  --shadow-none: ${SHADOWS.none};
  --shadow-sm: ${SHADOWS.sm};
  --shadow-md: ${SHADOWS.md};
  --shadow-lg: ${SHADOWS.lg};
  --shadow-xl: ${SHADOWS.xl};
`;
