import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "za.co.buscor.app",
  appName: "Buscor",
  webDir: "out",
  server: {
    // In development, point to the running Next.js dev server
    // url: "http://localhost:3000",
    // cleartext: true,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#00A651",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#00A651",
    },
  },
  android: {
    buildOptions: {
      signingType: "apksigner",
      // No keystore path = unsigned build
    },
  },
  ios: {
    // No signing config = unsigned build
    contentInset: "automatic",
  },
};

export default config;