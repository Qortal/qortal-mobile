import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.github.Qortal.qortalMobile',
  appName: 'Qortal Go',
  webDir: 'dist',
  "plugins": {
    "LocalNotifications": {
      "smallIcon": "qort",
      "iconColor": "#ffffff"
    },
    "SplashScreen": {
      "launchShowDuration": 3000,
      "backgroundColor": "#ffffff",
      "androidScaleType": "FIT_XY",
      "showSpinner": true,
      "androidSpinnerStyle": "large",
      "splashFullScreen": true,
      "splashImmersive": true
    },
    CapacitorHttp: {
      enabled: true,
    }
  }
};

export default config;
