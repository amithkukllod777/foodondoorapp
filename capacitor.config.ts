import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.foodondoor.app",
  appName: "Foodondoor",
  webDir: "dist/public",
  server: {
    url: "https://www.foodondoor.com",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f8f5f0",
    buildOptions: {
      signingType: "apksigner",
    },
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#f8f5f0",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1A34A8",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
