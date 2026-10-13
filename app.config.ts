import "dotenv/config";

const DEFAULT_APP_LINK_BASE_URL =
  "https://darkgray-partridge-666122.hostingersite.com";

function getAppLinkHost() {
  const value = (
    process.env.EXPO_PUBLIC_APP_LINK_BASE_URL ?? DEFAULT_APP_LINK_BASE_URL
  ).trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.host : null;
  } catch {
    return null;
  }
}

const appLinkHost = getAppLinkHost();

const config = {
  name: "Rondapp",
  slug: "rondapp",
  owner: "rdrosado",
  scheme: "rondapp",
  version: "1.0.0",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/79524085-51db-409a-b252-a1962a5b1049",
  },
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#111111",
  },
  ios: {
    bundleIdentifier: "com.rosado.rondapp",
    buildNumber: "1",
    supportsTablet: false,
    usesAppleSignIn: true,
    ...(appLinkHost ? { associatedDomains: [`applinks:${appLinkHost}`] } : {}),
    infoPlist: {
      NSCameraUsageDescription:
        "Rondapp necesita la camara para que puedas subir momentos a tus rondas.",
      NSPhotoLibraryUsageDescription:
        "Rondapp puede usar tu galeria si decides subir una foto existente.",
    },
  },
  android: {
    package: "com.rosado.rondapp",
    versionCode: 1,
    softwareKeyboardLayoutMode: "resize" as const,
    permissions: ["POST_NOTIFICATIONS"],
    adaptiveIcon: {
      backgroundColor: "#121212",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    ...(appLinkHost
      ? {
          intentFilters: [
            {
              action: "VIEW",
              autoVerify: true,
              data: [
                { scheme: "https", host: appLinkHost, pathPrefix: "/join/" },
                { scheme: "https", host: appLinkHost, pathPrefix: "/round/" },
              ],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ],
        }
      : {}),
  },
  web: {
    favicon: "./assets/favicon.png",
    output: "single" as const,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-image",
    "expo-sqlite",
    "expo-status-bar",
    [
      "expo-camera",
      {
        cameraPermission:
          "Rondapp necesita la camara para que puedas subir momentos a tus rondas.",
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Rondapp puede usar tu galeria si decides subir una foto existente.",
        cameraPermission:
          "Rondapp necesita la camara para que puedas subir momentos a tus rondas.",
        microphonePermission: false,
      },
    ],
    "expo-notifications",
    "expo-sharing",
    "expo-web-browser",
    "expo-apple-authentication",
  ],
  extra: {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
    appLinkBaseUrl:
      process.env.EXPO_PUBLIC_APP_LINK_BASE_URL ?? DEFAULT_APP_LINK_BASE_URL,
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "79524085-51db-409a-b252-a1962a5b1049",
    },
  },
};

export default config;
