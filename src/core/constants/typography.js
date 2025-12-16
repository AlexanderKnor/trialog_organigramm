/**
 * Trialog Maklergruppe GmbH - Typography System
 * Font: Bodoni 72 (as per brand guidelines)
 */

export const TYPOGRAPHY = {
  fontFamily: {
    primary: '"Bodoni 72", "Bodoni MT", "Libre Bodoni", Georgia, serif',
    fallback: 'Georgia, "Times New Roman", serif',
  },
  fontSize: {
    logo: '12px',
    text: '9px',
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '18px',
    xl: '24px',
    xxl: '32px',
    heading1: '36px',
    heading2: '28px',
    heading3: '22px',
    heading4: '18px',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
  },
};

export const getCssVariables = () => `
  --font-family-primary: ${TYPOGRAPHY.fontFamily.primary};
  --font-family-fallback: ${TYPOGRAPHY.fontFamily.fallback};
  --font-size-logo: ${TYPOGRAPHY.fontSize.logo};
  --font-size-text: ${TYPOGRAPHY.fontSize.text};
  --font-size-xs: ${TYPOGRAPHY.fontSize.xs};
  --font-size-sm: ${TYPOGRAPHY.fontSize.sm};
  --font-size-md: ${TYPOGRAPHY.fontSize.md};
  --font-size-lg: ${TYPOGRAPHY.fontSize.lg};
  --font-size-xl: ${TYPOGRAPHY.fontSize.xl};
  --font-size-xxl: ${TYPOGRAPHY.fontSize.xxl};
  --font-size-h1: ${TYPOGRAPHY.fontSize.heading1};
  --font-size-h2: ${TYPOGRAPHY.fontSize.heading2};
  --font-size-h3: ${TYPOGRAPHY.fontSize.heading3};
  --font-size-h4: ${TYPOGRAPHY.fontSize.heading4};
  --font-weight-light: ${TYPOGRAPHY.fontWeight.light};
  --font-weight-regular: ${TYPOGRAPHY.fontWeight.regular};
  --font-weight-medium: ${TYPOGRAPHY.fontWeight.medium};
  --font-weight-semi-bold: ${TYPOGRAPHY.fontWeight.semiBold};
  --font-weight-bold: ${TYPOGRAPHY.fontWeight.bold};
  --line-height-tight: ${TYPOGRAPHY.lineHeight.tight};
  --line-height-normal: ${TYPOGRAPHY.lineHeight.normal};
  --line-height-relaxed: ${TYPOGRAPHY.lineHeight.relaxed};
`;
