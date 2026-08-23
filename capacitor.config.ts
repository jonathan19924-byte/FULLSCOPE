import type { CapacitorConfig } from "@capacitor/cli";

// The app can't be a static export (Server Actions, cookie-based auth
// middleware, and cron API routes all need a real Next.js server — that's
// why it's deployed on Vercel rather than exported). So instead of bundling
// local web assets, the native shell's WebView loads the live production
// URL directly — everything server-rendered keeps working exactly as it
// does in the browser today, no rewrite required.
const config: CapacitorConfig = {
  appId: "com.fullscope.app",
  appName: "FullScope",
  webDir: "public",
  server: {
    url: "https://fullscope-eight.vercel.app",
    cleartext: false,
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
    },
    // Without this, iOS shows nothing at all (no banner, no sound) for a
    // push that arrives while the app is open — Capacitor's own default is
    // to swallow it silently and only fire the JS "pushNotificationReceived"
    // event, which nothing in this app currently listens for. Confirmed via
    // a real device test: identical push showed correctly once backgrounded,
    // showed nothing while foregrounded, before this config existed.
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
