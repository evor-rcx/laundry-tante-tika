import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ttlaundry.app',
  appName: 'Laundry Tante Tika',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
