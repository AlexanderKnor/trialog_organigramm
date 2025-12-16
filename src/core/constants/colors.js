/**
 * Trialog Maklergruppe GmbH - Corporate Color Palette
 * Based on official brand guidelines
 */

export const COLORS = {
  primary: {
    hex: '#10274c',
    rgba: 'rgba(16, 39, 76, 1)',
    rgb: { r: 16, g: 39, b: 76 },
  },
  secondary: {
    hex: '#1a3a6e',
    rgba: 'rgba(26, 58, 110, 1)',
  },
  accent: {
    hex: '#2a5298',
    rgba: 'rgba(42, 82, 152, 1)',
  },
  neutral: {
    white: '#ffffff',
    lightGray: '#f5f5f5',
    gray: '#e0e0e0',
    darkGray: '#666666',
    black: '#000000',
  },
  status: {
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
  },
};

export const getCssVariables = () => `
  --color-primary: ${COLORS.primary.hex};
  --color-primary-rgba: ${COLORS.primary.rgba};
  --color-secondary: ${COLORS.secondary.hex};
  --color-accent: ${COLORS.accent.hex};
  --color-white: ${COLORS.neutral.white};
  --color-light-gray: ${COLORS.neutral.lightGray};
  --color-gray: ${COLORS.neutral.gray};
  --color-dark-gray: ${COLORS.neutral.darkGray};
  --color-black: ${COLORS.neutral.black};
  --color-success: ${COLORS.status.success};
  --color-warning: ${COLORS.status.warning};
  --color-error: ${COLORS.status.error};
  --color-info: ${COLORS.status.info};
`;
