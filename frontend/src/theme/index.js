import { createSystem, defaultConfig } from '@chakra-ui/react';

// Color palette inspired by the reference design
// Muted greens, creams, and neutral tones with sophisticated contrast
const colors = {
  brand: {
    50: { value: '#f7faf3' },
    100: { value: '#dfecc6' },
    200: { value: '#c7deaa' },
    300: { value: '#a8c97e' },
    400: { value: '#8ab855' },
    500: { value: '#485c11' },
    600: { value: '#3a4a0d' },
    700: { value: '#2c3809' },
    800: { value: '#1e2606' },
    900: { value: '#0f1303' },
  },
  neutral: {
    50: { value: '#fafaf9' },
    100: { value: '#f5f5f4' },
    200: { value: '#e7e5e4' },
    300: { value: '#d6d3d1' },
    400: { value: '#a8a29e' },
    500: { value: '#78716c' },
    600: { value: '#57534e' },
    700: { value: '#44403c' },
    800: { value: '#292524' },
    900: { value: '#1c1917' },
  },
  cream: {
    50: { value: '#fdfcfb' },
    100: { value: '#faf8f5' },
    200: { value: '#f5f2ed' },
    300: { value: '#ebe6dd' },
    400: { value: '#dfd8cc' },
    500: { value: '#d1c7b8' },
    600: { value: '#b8aa96' },
    700: { value: '#9a8a75' },
    800: { value: '#7a6a57' },
    900: { value: '#5a4d3e' },
  },
};

// Create the system with our custom colors

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors,
    },
  },
});

export const Provider = system.Provider;
export default system;
