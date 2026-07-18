import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.nutriwow.app",
  appName: "Nutriwow",
  webDir: "dist/public",
  server: {
    url: "https://www.nutriwow.in",
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
      backgroundColor: "#2d6a4f",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
