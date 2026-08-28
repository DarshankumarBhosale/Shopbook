import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.shopbook.app',
  appName: 'ShopBook',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
